import { Capacitor } from '@capacitor/core'
import {
  DEFAULT_REMINDERS,
  toCapacitorWeekday,
  applyReminders,
  buildSchedule,
  clearReminders,
  loadReminders,
  notificationPermission,
  remindersAvailable,
  saveReminders,
  type ReminderSettings,
} from '@/notifications'

// FF-0056: reminders are scheduled by the phone. The plugin lives in the APK while
// this code is served from the server, so every path must survive its absence.

const checkPermissions = jest.fn()
const requestPermissions = jest.fn()
const schedule = jest.fn()
const cancel = jest.fn()
const registerPlugin = jest.fn()

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: jest.fn(() => true) },
  registerPlugin: (...args: unknown[]) => registerPlugin(...args),
}))

const core = jest.requireMock('@capacitor/core')

const enabledAll: ReminderSettings = {
  breakfast: { enabled: true, hour: 8, minute: 0 },
  lunch: { enabled: true, hour: 12, minute: 30 },
  dinner: { enabled: false, hour: 18, minute: 30 },
  weighIn: { enabled: true, weekday: 0, hour: 9, minute: 15 },
}

describe('reminder scheduling (FF-0056)', () => {
  beforeEach(() => {
    checkPermissions.mockReset().mockResolvedValue({ display: 'granted' })
    requestPermissions.mockReset().mockResolvedValue({ display: 'granted' })
    schedule.mockReset().mockResolvedValue(undefined)
    cancel.mockReset().mockResolvedValue(undefined)
    registerPlugin.mockReset().mockReturnValue({ checkPermissions, requestPermissions, schedule, cancel })
    core.Capacitor.isNativePlatform.mockReturnValue(true)
    localStorage.clear()
  })

  describe('buildSchedule', () => {
    it('only includes the reminders that are switched on', () => {
      const notifications = buildSchedule(enabledAll)
      expect(notifications.map((n) => n.title)).toEqual(['Breakfast', 'Lunch', 'Weigh-in'])
    })

    it('schedules each reminder daily at its own time, repeating', () => {
      const lunch = buildSchedule(enabledAll).find((n) => n.title === 'Lunch')!
      expect(lunch.schedule).toEqual({
        on: { hour: 12, minute: 30 },
        repeats: true,
        allowWhileIdle: true,
      })
    })

    it('uses stable ids so rescheduling replaces rather than duplicates', () => {
      const ids = buildSchedule(enabledAll).map((n) => n.id)
      expect(new Set(ids).size).toBe(ids.length)
      expect(ids).toEqual([1001, 1002, 1010])
      expect(buildSchedule(enabledAll).map((n) => n.id)).toEqual(ids)
    })

    it('puts the weigh-in on its weekday, not every day', () => {
      // The bug this guards: without `weekday` a repeated schedule fires daily, so a
      // Monday reminder arrived on Sunday morning (FF-0070).
      const weighIn = buildSchedule({ ...enabledAll, weighIn: { enabled: true, weekday: 1, hour: 8, minute: 0 } })
        .find((n) => n.title === 'Weigh-in')!

      expect(weighIn.schedule.on).toEqual({ weekday: 2, hour: 8, minute: 0 })
      expect(weighIn.schedule.repeats).toBe(true)
    })

    it('converts every JS weekday to Capacitor\'s Sunday-first numbering', () => {
      // JS: Sunday 0 … Saturday 6. Capacitor: Sunday 1 … Saturday 7.
      expect([0, 1, 2, 3, 4, 5, 6].map(toCapacitorWeekday)).toEqual([1, 2, 3, 4, 5, 6, 7])
      expect(toCapacitorWeekday(1)).toBe(2)   // Monday
      expect(toCapacitorWeekday(6)).toBe(7)   // Saturday
    })

    it('keeps meal reminders daily, with no weekday', () => {
      for (const notification of buildSchedule(enabledAll).filter((n) => n.title !== 'Weigh-in')) {
        expect(notification.schedule.on).not.toHaveProperty('weekday')
        expect(notification.schedule.repeats).toBe(true)
      }
    })

    it('produces nothing when every reminder is off', () => {
      expect(buildSchedule(DEFAULT_REMINDERS)).toEqual([])
    })
  })

  describe('applyReminders', () => {
    it('cancels the known ids before scheduling, so it is safe to re-run', async () => {
      const outcome = await applyReminders(enabledAll)
      expect(outcome).toBe('scheduled')
      expect(cancel).toHaveBeenCalledWith({
        notifications: [{ id: 1001 }, { id: 1002 }, { id: 1003 }, { id: 1010 }],
      })
      expect(schedule).toHaveBeenCalledTimes(1)
      expect(cancel.mock.invocationCallOrder[0]).toBeLessThan(schedule.mock.invocationCallOrder[0])
    })

    it('clears the schedule and schedules nothing when all are off', async () => {
      await expect(applyReminders(DEFAULT_REMINDERS)).resolves.toBe('nothing-enabled')
      expect(cancel).toHaveBeenCalled()
      expect(schedule).not.toHaveBeenCalled()
    })

    it('asks for permission and reports a refusal instead of pretending', async () => {
      checkPermissions.mockResolvedValue({ display: 'prompt' })
      requestPermissions.mockResolvedValue({ display: 'denied' })

      await expect(applyReminders(enabledAll)).resolves.toBe('denied')
      expect(schedule).not.toHaveBeenCalled()
    })

    it('schedules without prompting when permission is already granted', async () => {
      await applyReminders(enabledAll)
      expect(requestPermissions).not.toHaveBeenCalled()
      expect(schedule).toHaveBeenCalled()
    })

    it('reports unsupported when the plugin is missing from the installed APK', async () => {
      registerPlugin.mockImplementation(() => {
        throw new Error('LocalNotifications is not implemented')
      })
      await expect(applyReminders(enabledAll)).resolves.toBe('unsupported')
      expect(schedule).not.toHaveBeenCalled()
    })

    it('reports unsupported in a browser tab', async () => {
      core.Capacitor.isNativePlatform.mockReturnValue(false)
      expect(remindersAvailable()).toBe(false)
      await expect(applyReminders(enabledAll)).resolves.toBe('unsupported')
      await expect(notificationPermission()).resolves.toBe('unsupported')
    })
  })

  describe('settings persistence', () => {
    it('round-trips through storage', () => {
      saveReminders(enabledAll)
      expect(loadReminders()).toEqual(enabledAll)
    })

    it('falls back to defaults when storage holds junk', () => {
      localStorage.setItem('awefit.reminders', '{not json')
      expect(loadReminders()).toEqual(DEFAULT_REMINDERS)
    })

    it('fills in fields missing from an older saved shape', () => {
      localStorage.setItem('awefit.reminders', JSON.stringify({ lunch: { enabled: true } }))
      const loaded = loadReminders()
      expect(loaded.lunch).toEqual({ enabled: true, hour: 12, minute: 30 })
      expect(loaded.breakfast).toEqual(DEFAULT_REMINDERS.breakfast)
    })
  })

  it('clearReminders cancels every known id', async () => {
    await clearReminders()
    expect(cancel).toHaveBeenCalledWith({
      notifications: [{ id: 1001 }, { id: 1002 }, { id: 1003 }, { id: 1010 }],
    })
  })
})

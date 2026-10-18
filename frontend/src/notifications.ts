import { Capacitor, registerPlugin } from '@capacitor/core'

/**
 * Reminder scheduling (FF-0056).
 *
 * Deliberately local: the phone schedules its own notifications, so there is no
 * server involved, nothing to leak, and no Firebase project to maintain. The one
 * thing this cannot do is have the *server* decide to notify you — that would
 * need FCM, and Android's WebView has no Web Push at all.
 *
 * Because the app is a thin client the JS is served from the server while the
 * plugin lives inside the installed APK, so an older install runs this code with
 * no plugin behind it. Every entry point therefore degrades to 'unsupported'
 * rather than throwing.
 */

interface ScheduleOptions {
  notifications: Array<{
    id: number
    title: string
    body: string
    schedule: {
      on?: { weekday?: number; hour: number; minute: number }
      repeats?: boolean
      allowWhileIdle?: boolean
    }
  }>
}

interface LocalNotificationsPlugin {
  checkPermissions(): Promise<{ display: string }>
  requestPermissions(): Promise<{ display: string }>
  schedule(options: ScheduleOptions): Promise<unknown>
  cancel(options: { notifications: Array<{ id: number }> }): Promise<void>
}

export type NotificationAvailability = 'available' | 'denied' | 'unsupported'

export interface ReminderSettings {
  /** Meal reminders, each switched on independently. */
  breakfast: { enabled: boolean; hour: number; minute: number }
  lunch: { enabled: boolean; hour: number; minute: number }
  dinner: { enabled: boolean; hour: number; minute: number }
  /** Weekly weigh-in reminder. 0 = Sunday … 6 = Saturday. */
  weighIn: { enabled: boolean; weekday: number; hour: number; minute: number }
}

export const DEFAULT_REMINDERS: ReminderSettings = {
  breakfast: { enabled: false, hour: 8, minute: 0 },
  lunch: { enabled: false, hour: 12, minute: 30 },
  dinner: { enabled: false, hour: 18, minute: 30 },
  weighIn: { enabled: false, weekday: 0, hour: 8, minute: 0 },
}

const STORAGE_KEY = 'awefit.reminders'

// Stable ids so rescheduling replaces rather than duplicates.
const MEAL_IDS: Record<'breakfast' | 'lunch' | 'dinner', number> = {
  breakfast: 1001,
  lunch: 1002,
  dinner: 1003,
}
const WEIGH_IN_ID = 1010

/**
 * Capacitor numbers weekdays Sunday = 1 … Saturday = 7; our settings use the JS
 * convention, Sunday = 0 … Saturday = 6. Being wrong by one here silently moves the
 * reminder to the wrong day, so the conversion lives in one named place.
 */
export function toCapacitorWeekday(jsWeekday: number): number {
  return (((jsWeekday % 7) + 7) % 7) + 1
}

const MEAL_COPY: Record<'breakfast' | 'lunch' | 'dinner', { title: string; body: string }> = {
  breakfast: { title: 'Breakfast', body: 'Log your breakfast while it is fresh.' },
  lunch: { title: 'Lunch', body: 'Log your lunch — it takes ten seconds.' },
  dinner: { title: 'Dinner', body: 'Log your dinner and finish the day.' },
}

function plugin(): LocalNotificationsPlugin | null {
  if (!Capacitor.isNativePlatform()) return null
  try {
    return registerPlugin<LocalNotificationsPlugin>('LocalNotifications')
  } catch {
    return null
  }
}

export function remindersAvailable(): boolean {
  return plugin() !== null
}

export async function notificationPermission(): Promise<NotificationAvailability> {
  const local = plugin()
  if (!local) return 'unsupported'
  try {
    const status = await local.checkPermissions()
    if (status.display === 'granted') return 'available'
    const requested = await local.requestPermissions()
    return requested.display === 'granted' ? 'available' : 'denied'
  } catch {
    return 'unsupported'
  }
}

export function loadReminders(): ReminderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_REMINDERS
    const parsed = JSON.parse(raw) as Partial<ReminderSettings>
    return {
      breakfast: { ...DEFAULT_REMINDERS.breakfast, ...parsed.breakfast },
      lunch: { ...DEFAULT_REMINDERS.lunch, ...parsed.lunch },
      dinner: { ...DEFAULT_REMINDERS.dinner, ...parsed.dinner },
      weighIn: { ...DEFAULT_REMINDERS.weighIn, ...parsed.weighIn },
    }
  } catch {
    return DEFAULT_REMINDERS
  }
}

export function saveReminders(settings: ReminderSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // A privacy-restricted WebView can refuse storage; the schedule still works
    // for this session, it just will not survive a reinstall.
  }
}

/** The notifications a given settings object implies. Pure, so it is testable. */
export function buildSchedule(settings: ReminderSettings): ScheduleOptions['notifications'] {
  const notifications: ScheduleOptions['notifications'] = []

  for (const meal of ['breakfast', 'lunch', 'dinner'] as const) {
    const reminder = settings[meal]
    if (!reminder.enabled) continue
    notifications.push({
      id: MEAL_IDS[meal],
      title: MEAL_COPY[meal].title,
      body: MEAL_COPY[meal].body,
      schedule: {
        on: { hour: reminder.hour, minute: reminder.minute },
        repeats: true,
        // A reminder that lands at 14:00 because the phone was dozing is worse
        // than useless, so ask for delivery even in idle.
        allowWhileIdle: true,
      },
    })
  }

  if (settings.weighIn.enabled) {
    notifications.push({
      id: WEIGH_IN_ID,
      title: 'Weigh-in',
      body: 'Step on the scale and log it — the trend is what matters.',
      schedule: {
        // Without a weekday this repeats *daily* — it was left out entirely, so a
        // Monday weigh-in arrived on a Sunday morning (FF-0070).
        on: {
          weekday: toCapacitorWeekday(settings.weighIn.weekday),
          hour: settings.weighIn.hour,
          minute: settings.weighIn.minute,
        },
        repeats: true,
        allowWhileIdle: true,
      },
    })
  }

  return notifications
}

export type ScheduleOutcome = 'scheduled' | 'denied' | 'unsupported' | 'nothing-enabled'

/**
 * Make the device's schedule match `settings`.
 *
 * Idempotent by design: everything is cancelled first, then re-scheduled with
 * fixed ids. That makes it safe to run on every app start, which is how a phone
 * reboot or a cleared alarm survives without extra bookkeeping.
 */
export async function applyReminders(settings: ReminderSettings): Promise<ScheduleOutcome> {
  const local = plugin()
  if (!local) return 'unsupported'

  const wanted = buildSchedule(settings)
  const allIds = [...Object.values(MEAL_IDS), WEIGH_IN_ID].map((id) => ({ id }))

  try {
    await local.cancel({ notifications: allIds })
  } catch {
    // Nothing scheduled yet, or the plugin refused; rescheduling is still worth a try.
  }

  if (wanted.length === 0) return 'nothing-enabled'

  const permission = await notificationPermission()
  if (permission === 'denied') return 'denied'
  if (permission === 'unsupported') return 'unsupported'

  try {
    await local.schedule({ notifications: wanted })
    return 'scheduled'
  } catch {
    return 'unsupported'
  }
}

export async function clearReminders(): Promise<void> {
  const local = plugin()
  if (!local) return
  try {
    await local.cancel({
      notifications: [...Object.values(MEAL_IDS), WEIGH_IN_ID].map((id) => ({ id })),
    })
  } catch {
    // Nothing to clear.
  }
}

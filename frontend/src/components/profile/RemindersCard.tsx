import { useEffect, useState } from 'react'
import {
  DEFAULT_REMINDERS,
  loadReminders,
  remindersAvailable,
  saveReminders,
  type ReminderSettings,
} from '@/notifications'

import { refreshReminderSchedule } from '@/reminderLifecycle'

const GREY = '#757575'

type MealKey = 'breakfast' | 'lunch' | 'dinner'
const MEALS: Array<{ key: MealKey; label: string }> = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
]

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function timeValue(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function parseTime(value: string, fallback: { hour: number; minute: number }) {
  const [h, m] = value.split(':').map((part) => Number.parseInt(part, 10))
  if (Number.isNaN(h) || Number.isNaN(m)) return fallback
  return { hour: h, minute: m }
}

/**
 * Reminders (FF-0056).
 *
 * Device-local by design: the phone owns the schedule, so there is nothing to
 * sync and nothing to notify through a server. Inside a plain browser the card
 * says so instead of offering switches that would do nothing.
 */
export default function RemindersCard() {
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDERS)
  const [status, setStatus] = useState<string | null>(null)
  const supported = remindersAvailable()

  useEffect(() => {
    const stored = loadReminders()
    setSettings(stored)
    // Re-apply on mount so a rebooted phone gets its schedule back without the
    // user touching anything.
    if (supported && (stored.breakfast.enabled || stored.lunch.enabled || stored.dinner.enabled || stored.weighIn.enabled)) {
      void refreshReminderSchedule(stored)
    }
  }, [supported])

  const update = async (next: ReminderSettings) => {
    setSettings(next)
    saveReminders(next)
    const outcome = await refreshReminderSchedule(next, true)
    if (outcome === 'denied') {
      setStatus('Notifications are blocked for AweFit. Turn them on in Android settings, then flip a reminder again.')
    } else if (outcome === 'unsupported') {
      setStatus('This build cannot schedule reminders yet — install the latest AweFit.')
    } else if (outcome === 'nothing-enabled') {
      setStatus('Reminders off.')
    } else {
      setStatus('Reminders updated.')
    }
  }

  const toggleMeal = (meal: MealKey) =>
    update({ ...settings, [meal]: { ...settings[meal], enabled: !settings[meal].enabled } })

  const setMealTime = (meal: MealKey, value: string) =>
    update({ ...settings, [meal]: { ...settings[meal], ...parseTime(value, settings[meal]) } })

  const toggleWeighIn = () =>
    update({ ...settings, weighIn: { ...settings.weighIn, enabled: !settings.weighIn.enabled } })

  const setWeighInDay = (weekday: number) =>
    update({ ...settings, weighIn: { ...settings.weighIn, weekday } })

  const setWeighInTime = (value: string) =>
    update({ ...settings, weighIn: { ...settings.weighIn, ...parseTime(value, settings.weighIn) } })

  return (
    <div className="bg-white rounded-lg mt-4 mx-4 overflow-hidden">
      <div className="bg-[#185ADB] px-4 py-3">
        <span className="text-white text-base font-medium">Reminders</span>
      </div>

      <div className="px-4 py-3 space-y-3">
        {!supported && (
          <p className="text-xs" style={{ color: GREY }}>
            Reminders are sent by the phone, so they only work in the AweFit app — not in a
            browser tab.
          </p>
        )}

        {MEALS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm" style={{ color: '#212121' }}>
              <input
                type="checkbox"
                aria-label={`${label} reminder`}
                checked={settings[key].enabled}
                disabled={!supported}
                onChange={() => toggleMeal(key)}
              />
              {label}
            </label>
            <input
              type="time"
              aria-label={`${label} reminder time`}
              value={timeValue(settings[key].hour, settings[key].minute)}
              disabled={!supported || !settings[key].enabled}
              onChange={(event) => setMealTime(key, event.target.value)}
              className="border border-[#e0e0e0] rounded-lg px-2 py-1 text-sm"
            />
          </div>
        ))}

        <div className="border-t border-[#e0e0e0] pt-3 space-y-2">
          <label className="flex items-center gap-2 text-sm" style={{ color: '#212121' }}>
            <input
              type="checkbox"
              aria-label="Weigh-in reminder"
              checked={settings.weighIn.enabled}
              disabled={!supported}
              onChange={toggleWeighIn}
            />
            Weekly weigh-in
          </label>

          {settings.weighIn.enabled && (
            <div className="flex items-center gap-2 pl-6">
              <select
                aria-label="Weigh-in day"
                value={settings.weighIn.weekday}
                disabled={!supported}
                onChange={(event) => setWeighInDay(Number(event.target.value))}
                className="border border-[#e0e0e0] rounded-lg px-2 py-1 text-sm flex-1"
              >
                {WEEKDAYS.map((day, index) => (
                  <option key={day} value={index}>{day}</option>
                ))}
              </select>
              <input
                type="time"
                aria-label="Weigh-in reminder time"
                value={timeValue(settings.weighIn.hour, settings.weighIn.minute)}
                disabled={!supported}
                onChange={(event) => setWeighInTime(event.target.value)}
                className="border border-[#e0e0e0] rounded-lg px-2 py-1 text-sm"
              />
            </div>
          )}
        </div>

        {status && (
          <p className="text-xs" style={{ color: GREY }} role="status">{status}</p>
        )}

        <p className="text-[11px]" style={{ color: GREY }}>
          Reminders skip meals and weigh-ins already logged for today. Changes from other devices
          sync when this app opens or resumes. Notifications are scheduled on this phone, not sent from the server.
        </p>
      </div>
    </div>
  )
}

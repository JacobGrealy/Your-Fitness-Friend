import { Capacitor, registerPlugin } from '@capacitor/core'
import { api } from './api/client'
import { remindersAvailable, type ReminderSettings, type ScheduleOutcome } from './notifications'
import { createReminderCoordinator } from './reminderCoordinator'

interface AppPlugin {
  addListener(event: 'appStateChange', listener: (state: { isActive: boolean }) => void): Promise<{ remove(): Promise<void> }>
}
let current: ReturnType<typeof createReminderCoordinator> | null = null

export function refreshReminderSchedule(settings?: ReminderSettings, interactive = false): Promise<ScheduleOutcome> {
  return current?.refresh(settings, interactive) || Promise.resolve('unsupported')
}

export function affectsReminders(method?: string, url?: string): boolean {
  if (!['post', 'put', 'patch', 'delete'].includes((method || 'get').toLowerCase())) return false
  const path = (url || '').split('?')[0]
  return /(?:^|\/)(food\/log|weight\/logs|meals)(?:\/|$)/.test(path)
}

/** Mounted for an authenticated user, independent of which screen is open. */
export function startReminderSync(userId: string): () => void {
  if (!Capacitor.isNativePlatform() || !remindersAvailable()) return () => undefined
  let active = true
  const coordinator = createReminderCoordinator({
    userId, isCurrent: () => active && current === coordinator,
    meals: day => api.get('/food/log', { params: { date: day }, timeout: 5000 }).then(response => {
      if (!Array.isArray(response.data.logs)) throw new Error('Invalid meal status')
      return response.data.logs
    }),
    weights: day => api.get('/weight/logs', { params: { start_date: day, end_date: day }, timeout: 5000 }).then(response => {
      if (!Array.isArray(response.data)) throw new Error('Invalid weigh-in status')
      return response.data
    }),
  })
  current = coordinator
  const refresh = () => { if (active) void coordinator.refresh() }
  // One interception point covers Quick Add, recent, copy, edit, deletion, and AI-created logs.
  // Never intercept failed writes, and never let reminder failure turn a saved log into an error.
  const interceptor = api.interceptors.response.use(async response => {
    if (active && affectsReminders(response.config.method, response.config.url)) {
      await coordinator.refresh()
    }
    return response
  })
  const visible = () => { if (document.visibilityState === 'visible') refresh() }
  document.addEventListener('visibilitychange', visible)
  window.addEventListener('focus', refresh)
  window.addEventListener('online', refresh)
  let nativeListener: { remove(): Promise<void> } | undefined
  try {
    void registerPlugin<AppPlugin>('App').addListener('appStateChange', state => {
      if (state.isActive) refresh()
    }).then(listener => { if (active) nativeListener = listener; else void listener.remove() }).catch(() => undefined)
  } catch { /* Older app: visibility/focus still reconcile. */ }
  // While foregrounded, keep today correct across midnight, travel/time-zone changes and
  // remote-device logging. This is not background cross-device synchronization.
  const timer = window.setInterval(() => { if (document.visibilityState === 'visible') refresh() }, 60000)
  refresh()
  return () => {
    active = false
    if (current === coordinator) current = null
    api.interceptors.response.eject(interceptor)
    document.removeEventListener('visibilitychange', visible)
    window.removeEventListener('focus', refresh)
    window.removeEventListener('online', refresh)
    window.clearInterval(timer)
    void nativeListener?.remove()
  }
}

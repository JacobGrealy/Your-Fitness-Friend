export function readPreference<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}
export function writePreference(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Tracking still works with storage disabled. */ }
}
export const exerciseKey = (userId: string, name: string) => `awefit.exercise:${userId}:${name}`
export const exerciseError = (error: any) => error?.response?.data?.error || error?.response?.data?.message || 'Unable to reach exercise tracking. Please try again.'

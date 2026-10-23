/**
 * The local calendar date as YYYY-MM-DD.
 *
 * `new Date().toISOString()` is UTC, so anywhere east or west of Greenwich it
 * disagrees with the user's calendar for part of every day. West of UTC that means
 * every evening: a food logged at 20:54 EDT is 00:54 UTC the *next* day, so a diary
 * filed by UTC files it on tomorrow and the entry vanishes from the day being
 * looked at (FF-0059 — five duplicate logs before anyone noticed).
 */
export function todayLocal(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Accept a canonical calendar date from navigation, never a UTC timestamp. */
export function requestedLocalDate(value: string | null): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T12:00:00`)
    if (!Number.isNaN(parsed.getTime()) && todayLocal(parsed) === value) return value
  }
  return todayLocal()
}

/** The local calendar date of a parsed timestamp, for display. */
export function localDateOf(value: string | Date): string {
  return todayLocal(value instanceof Date ? value : new Date(value))
}

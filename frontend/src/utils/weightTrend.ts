import { localDateOf } from './localDate'

/**
 * One definition of "the weight trend" (FF-0084).
 *
 * Home and Progress were answering different questions: different windows, different date
 * parsing, different units, different verdict thresholds. Neither was lying and together
 * they were useless. Everything both screens need now comes from here.
 */

/** Days of history both screens show. The window is stated on screen. */
export const TREND_WINDOW_DAYS = 7

/** A move smaller than this is "stable", for both screens. */
export const TREND_THRESHOLD_LBS = 0.5

export type TrendDirection = 'down' | 'up' | 'stable'

export interface WeightPoint {
  /** Calendar day, 'YYYY-MM-DD', already local. */
  day: string
  /** Local-midnight timestamp for the chart's x axis. */
  date: number
  weight: number
}

/**
 * The calendar day of a stored value.
 *
 * A date-only string IS a calendar day and must not be shifted by a timezone; a
 * `recorded_at` timestamp is converted through utils/localDate, which is the only place
 * allowed to do that conversion. Both screens go through this, which is what stops the same
 * weigh-in appearing on two different days.
 */
export function dayOf(value: string | null | undefined): string {
  if (!value) return ''
  // 'YYYY-MM-DD' carries no time, so no conversion applies.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return localDateOf(value)
}

/** Local midnight for a 'YYYY-MM-DD' day, without the UTC parse trap. */
export function localMidnight(day: string): number {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, date ?? 1).getTime()
}

/**
 * The oldest day included in a window that ends today.
 *
 * Inclusive of today, so a 7-day window is today plus the six before it — the same rule the
 * rest of the app uses for "last 7 days".
 */
export function windowStart(days = TREND_WINDOW_DAYS, now = new Date()): string {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  start.setDate(start.getDate() - (days - 1))
  return localDateOf(start)
}

/**
 * Points for the last `days` days, oldest first, one per day.
 *
 * When a day has several weigh-ins the last one wins (logs come newest-first from the API),
 * so a mid-day correction replaces the morning number instead of drawing a spike.
 */
export function buildWeightSeries(
  logs: Array<{ weight: number; recorded_at?: string | null; date?: string | null }>,
  /** How many days back to include; null means the whole history. */
  days: number | null = TREND_WINDOW_DAYS,
  now = new Date()
): WeightPoint[] {
  const start = days === null ? '' : windowStart(days, now)
  // Keep the latest record per day, comparing timestamps rather than relying on the order
  // the API happened to return (FF-0084: Progress and Home were fed different orders).
  const byDay = new Map<string, { weight: number; at: number }>()

  for (const log of logs) {
    const raw = log.recorded_at ?? log.date
    const day = dayOf(raw)
    if (!day) continue
    if (start && day < start) continue
    const at = raw && raw.includes('T') ? new Date(raw).getTime() : localMidnight(day)
    const existing = byDay.get(day)
    if (!existing || at >= existing.at) {
      byDay.set(day, { weight: log.weight, at })
    }
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([day, entry]) => ({ day, date: localMidnight(day), weight: entry.weight }))
}

/**
 * The verdict, from the same points both screens draw.
 *
 * First-vs-last inside the window with one threshold. Deliberately not a regression slope:
 * the number shown to a user should be explainable ("down 2.4 lb since the 12th"), and an
 * averaged slope invites arguments about how it was computed.
 */
export function trendDirection(points: WeightPoint[]): TrendDirection {
  if (points.length < 2) return 'stable'
  const change = points[points.length - 1].weight - points[0].weight
  if (change <= -TREND_THRESHOLD_LBS) return 'down'
  if (change >= TREND_THRESHOLD_LBS) return 'up'
  return 'stable'
}

export function trendChange(points: WeightPoint[]): number {
  if (points.length < 2) return 0
  return points[points.length - 1].weight - points[0].weight
}

/**
 * The y-axis range, shared so the same series cannot look steeper on one screen.
 *
 * A goal line inside the data range is folded in, otherwise it would be drawn off-chart;
 * the padding keeps points off the top and bottom edges.
 */
export function weightYDomain(
  points: WeightPoint[],
  goal?: number | null
): [number, number] {
  const values = points.map((point) => point.weight)
  if (goal && Number.isFinite(goal) && goal > 0) values.push(goal)
  if (values.length === 0) return [0, 1]

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(max - min, 1)
  const pad = span * 0.15
  return [Math.round((min - pad) * 10) / 10, Math.round((max + pad) * 10) / 10]
}

/**
 * When will the weight goal be reached? (FF-0026)
 *
 * Two sources, in order of trust:
 *
 * 1. **The logged trend** — a least-squares slope over the last few weeks of
 *    weigh-ins. This is what the body is actually doing.
 * 2. **The configured weekly goal** — what the user asked for, when the trend is
 *    flat, moving the wrong way, or too short to fit a line to.
 *
 * If neither is usable the answer is `null`, and the UI shows nothing. A date
 * invented from a trend of zero is the sort of confident nonsense that makes a
 * tracker untrustworthy, and it is worse than an empty space.
 */

export type WeeklyGoal = 'maintain' | 'lose_0_5' | 'lose_1' | 'lose_1_5' | 'lose_2' | string | null | undefined

export interface WeightPoint {
  weight: number
  /** Anything `Date` can parse. */
  recorded_at: string
}

export interface GoalEta {
  /** Projected date of hitting the goal weight. */
  date: Date
  /** Signed rate used, in lbs per week (negative = losing). */
  rateLbsPerWeek: number
  source: 'trend' | 'goal'
}

const TREND_WINDOW_DAYS = 28
const MIN_TREND_DAYS = 7
const MIN_TREND_POINTS = 3
/** Below this the line is noise, not progress. */
const MIN_RATE_LBS_PER_WEEK = 0.2
/** Beyond two years is a fantasy, not a plan. */
const MAX_HORIZON_DAYS = 730

const WEEKLY_RATES: Record<string, number> = {
  lose_0_5: -0.5,
  lose_1: -1,
  lose_1_5: -1.5,
  lose_2: -2,
}

const DAY_MS = 86_400_000

/** Slope of the last few weeks of weigh-ins, in lbs per week. */
export function observedRateLbsPerWeek(logs: WeightPoint[], now: Date = new Date()): number | null {
  const cutoff = now.getTime() - TREND_WINDOW_DAYS * DAY_MS
  const points = logs
    .map((log) => ({ t: new Date(log.recorded_at).getTime(), w: log.weight }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.w) && p.t >= cutoff)
    .sort((a, b) => a.t - b.t)

  if (points.length < MIN_TREND_POINTS) return null
  const spanDays = (points[points.length - 1].t - points[0].t) / DAY_MS
  if (spanDays < MIN_TREND_DAYS) return null

  const meanT = points.reduce((sum, p) => sum + p.t, 0) / points.length
  const meanW = points.reduce((sum, p) => sum + p.w, 0) / points.length
  const numerator = points.reduce((sum, p) => sum + (p.t - meanT) * (p.w - meanW), 0)
  const denominator = points.reduce((sum, p) => sum + (p.t - meanT) ** 2, 0)
  if (denominator === 0) return null

  return (numerator / denominator) * 7 * DAY_MS
}

/**
 * Project the date the goal weight is reached.
 *
 * Returns null when the goal is already met (nothing to project), when there is
 * no usable rate, or when the projection is further out than two years.
 */
export function estimateGoalEta({
  currentWeight,
  goalWeight,
  logs,
  weeklyGoal,
  now = new Date(),
}: {
  currentWeight: number | null
  goalWeight: number | null | undefined
  logs: WeightPoint[]
  weeklyGoal?: WeeklyGoal
  now?: Date
}): GoalEta | null {
  if (currentWeight === null || goalWeight === null || goalWeight === undefined) return null
  if (!Number.isFinite(currentWeight) || !Number.isFinite(goalWeight)) return null

  const remaining = currentWeight - goalWeight
  // Within rounding of the goal already: no projection to make.
  if (Math.abs(remaining) < 0.2) return null

  const direction = remaining > 0 ? -1 : 1 // negative rate when losing

  const observed = observedRateLbsPerWeek(logs, now)
  let rate: number | null = null
  let source: GoalEta['source'] = 'trend'

  if (observed !== null && Math.abs(observed) >= MIN_RATE_LBS_PER_WEEK && Math.sign(observed) === direction) {
    rate = observed
  } else {
    const configured = WEEKLY_RATES[weeklyGoal ?? ''] ?? null
    if (configured !== null && Math.sign(configured) === direction) {
      rate = configured
      source = 'goal'
    }
  }

  if (rate === null) return null

  const daysAhead = (Math.abs(remaining) / Math.abs(rate)) * 7
  if (!Number.isFinite(daysAhead) || daysAhead > MAX_HORIZON_DAYS) return null

  return {
    date: new Date(now.getTime() + daysAhead * DAY_MS),
    rateLbsPerWeek: rate,
    source,
  }
}

/** "Mar 14, 2027" — the date only; the UI supplies the sentence around it. */
export function formatEtaDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

import { estimateGoalEta, observedRateLbsPerWeek, formatEtaDate } from '@/utils/goalEta'

const NOW = new Date('2026-10-17T12:00:00')

/** Weigh-ins drifting by `perWeek` lbs over `weeks`, ending at `endWeight`. */
function drift(endWeight: number, perWeek: number, weeks: number, count = 5) {
  const logs = []
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.round(((count - 1 - i) / Math.max(count - 1, 1)) * weeks * 7)
    logs.push({
      // perWeek < 0 means losing, so older weigh-ins are heavier
      weight: endWeight - (perWeek * daysAgo) / 7,
      recorded_at: new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString(),
    })
  }
  return logs
}

describe('observed trend', () => {
  it('measures a steady loss', () => {
    const rate = observedRateLbsPerWeek(drift(200, -1, 4), NOW)
    expect(rate).toBeCloseTo(-1, 1)
  })

  it('refuses to guess from too few points', () => {
    expect(observedRateLbsPerWeek(drift(200, -1, 4, 2), NOW)).toBeNull()
  })

  it('ignores weigh-ins older than the window', () => {
    const old = [{ weight: 230, recorded_at: '2026-06-01T12:00:00Z' }]
    expect(observedRateLbsPerWeek([...old, ...drift(200, -1, 4, 2)], NOW)).toBeNull()
  })
})

describe('goal ETA (FF-0026)', () => {
  const base = { goalWeight: 190, weeklyGoal: 'lose_1', now: NOW }

  it('projects from the logged trend when there is one', () => {
    const eta = estimateGoalEta({ ...base, currentWeight: 200, logs: drift(200, -1, 4) })

    expect(eta).not.toBeNull()
    expect(eta!.source).toBe('trend')
    expect(eta!.rateLbsPerWeek).toBeCloseTo(-1, 1)
    // 10 lbs at ~1 lb/week ≈ 10 weeks out
    const days = (eta!.date.getTime() - NOW.getTime()) / 86_400_000
    expect(days).toBeGreaterThan(60)
    expect(days).toBeLessThan(80)
  })

  it('falls back to the configured weekly goal when the trend is flat', () => {
    const flat = drift(200, 0, 4)
    const eta = estimateGoalEta({ ...base, weeklyGoal: 'lose_2', currentWeight: 200, logs: flat })

    expect(eta).not.toBeNull()
    expect(eta!.source).toBe('goal')
    expect(eta!.rateLbsPerWeek).toBe(-2)
  })

  it('refuses a trend moving away from the goal', () => {
    const gaining = drift(200, 1, 4)
    const eta = estimateGoalEta({ ...base, weeklyGoal: 'maintain', currentWeight: 200, logs: gaining })

    expect(eta).toBeNull()
  })

  it('says nothing when the goal is already reached', () => {
    expect(estimateGoalEta({ ...base, currentWeight: 190, logs: [] })).toBeNull()
    expect(estimateGoalEta({ ...base, currentWeight: 189.9, logs: [] })).toBeNull()
  })

  it('says nothing without a goal or a current weight', () => {
    expect(estimateGoalEta({ ...base, goalWeight: null, currentWeight: 200, logs: [] })).toBeNull()
    expect(estimateGoalEta({ ...base, currentWeight: null, logs: [] })).toBeNull()
  })

  it('refuses a projection beyond two years', () => {
    // 100 lbs to lose at 0.5 lb/week is ~3.8 years
    const eta = estimateGoalEta({ ...base, weeklyGoal: 'lose_0_5', currentWeight: 290, logs: [] })

    expect(eta).toBeNull()
  })

  it('projects a gain when the goal is above the current weight', () => {
    const eta = estimateGoalEta({
      currentWeight: 150, goalWeight: 160, weeklyGoal: 'maintain', logs: [], now: NOW,
    })

    // 'maintain' implies no movement, so there is nothing to project
    expect(eta).toBeNull()
  })

  it('formats the date it projects', () => {
    expect(formatEtaDate(new Date('2027-03-14T12:00:00'))).toMatch(/Mar/)
  })
})

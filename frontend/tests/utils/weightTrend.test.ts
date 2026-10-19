import {
  TREND_THRESHOLD_LBS,
  TREND_WINDOW_DAYS,
  buildWeightSeries,
  dayOf,
  localMidnight,
  trendChange,
  trendDirection,
  weightYDomain,
  windowStart,
} from '@/utils/weightTrend'

// FF-0084: Home and Progress disagreed about the series, the day label, the unit and the
// verdict. These pin the single definition both screens now share.

describe('dayOf', () => {
  it('leaves a date-only string alone, because it is already a calendar day', () => {
    // The Home bug: new Date('2026-10-18') is UTC midnight, which renders as Oct 17 in any
    // negative offset. A date-only value must never go through a Date at all.
    expect(dayOf('2026-10-18')).toBe('2026-10-18')
  })

  it('converts a timestamp to the local day', () => {
    // Local time in the test runner's zone; localDateOf is the only conversion allowed.
    expect(dayOf('2026-10-18T12:00:00')).toBe('2026-10-18')
  })

  it('gives the same day for both forms of the same weigh-in', () => {
    expect(dayOf('2026-10-18')).toBe(dayOf('2026-10-18T00:00:00'))
  })

  it('handles a missing value without inventing a day', () => {
    expect(dayOf(null)).toBe('')
    expect(dayOf(undefined)).toBe('')
  })
})

describe('buildWeightSeries', () => {
  const now = new Date(2026, 9, 18, 9, 0, 0)   // 18 Oct 2026, local

  it('keeps only the window, oldest first', () => {
    const series = buildWeightSeries(
      [
        { weight: 259.3, recorded_at: '2026-10-18T07:00:00' },
        { weight: 264.7, recorded_at: '2026-10-17T07:00:00' },
        { weight: 179.0, recorded_at: '2026-05-05T07:00:00' },   // far outside
      ],
      TREND_WINDOW_DAYS,
      now
    )

    expect(series.map((point) => point.day)).toEqual(['2026-10-17', '2026-10-18'])
    expect(series.map((point) => point.weight)).toEqual([264.7, 259.3])
  })

  it('agrees with the date-only form used by the dashboard endpoint', () => {
    const fromTimestamp = buildWeightSeries(
      [{ weight: 259.3, recorded_at: '2026-10-18T00:00:00' }], 7, now
    )
    const fromDate = buildWeightSeries([{ weight: 259.3, date: '2026-10-18' }], 7, now)

    expect(fromDate).toEqual(fromTimestamp)
  })

  it('keeps the latest weigh-in when a day has several', () => {
    const series = buildWeightSeries(
      [
        { weight: 259.0, recorded_at: '2026-10-18T20:00:00' },
        { weight: 261.0, recorded_at: '2026-10-18T06:00:00' },
      ],
      7,
      now
    )

    expect(series).toHaveLength(1)
    expect(series[0].weight).toBe(259.0)
  })

  it('uses local midnight for the x axis, not UTC', () => {
    const [point] = buildWeightSeries([{ weight: 200, recorded_at: '2026-10-18T12:00:00' }], 7, now)
    const midnight = new Date(localMidnight(point.day))
    expect(midnight.getDate()).toBe(18)
    expect(midnight.getHours()).toBe(0)
  })
})

describe('windowStart', () => {
  it('includes today, so a 7-day window is today plus six', () => {
    const now = new Date(2026, 9, 18)
    expect(windowStart(7, now)).toBe('2026-10-12')
  })
})

describe('trendDirection', () => {
  const point = (day: string, weight: number) => ({ day, date: localMidnight(day), weight })

  it('is stable with fewer than two points', () => {
    expect(trendDirection([])).toBe('stable')
    expect(trendDirection([point('2026-10-18', 200)])).toBe('stable')
  })

  it('uses one threshold for both screens', () => {
    const nearly = [point('2026-10-17', 200), point('2026-10-18', 200 + TREND_THRESHOLD_LBS / 2)]
    expect(trendDirection(nearly)).toBe('stable')

    const moved = [point('2026-10-17', 200), point('2026-10-18', 200 - TREND_THRESHOLD_LBS)]
    expect(trendDirection(moved)).toBe('down')
    expect(trendDirection([...moved].reverse())).toBe('up')
  })

  it('reports the change the verdict is based on', () => {
    expect(trendChange([point('2026-10-17', 264.7), point('2026-10-18', 259.3)])).toBeCloseTo(-5.4, 2)
  })
})

describe('weightYDomain', () => {
  const point = (day: string, weight: number) => ({ day, date: localMidnight(day), weight })

  it('pads the data range so points are not on the edges', () => {
    const [min, max] = weightYDomain([point('2026-10-17', 200), point('2026-10-18', 210)])
    expect(min).toBeLessThan(200)
    expect(max).toBeGreaterThan(210)
  })

  it('folds the goal in so its line is visible', () => {
    const [min, max] = weightYDomain([point('2026-10-17', 300), point('2026-10-18', 305)], 180)
    expect(min).toBeLessThanOrEqual(180)
    expect(max).toBeGreaterThan(305)
  })

  it('survives an empty series', () => {
    expect(weightYDomain([])).toEqual([0, 1])
  })
})

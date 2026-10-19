import {
  BMI_THRESHOLDS,
  bmi,
  bmiBand,
  bmiThresholds,
  weightAtBmi,
} from '@/utils/bmi'

// FF-0085: the bands are computed from height, so these vectors come from the ticket
// (owner's height 74.0 in = 187.96 cm) and are pinned rather than re-derived.

const HEIGHT_CM = 187.96

describe('weightAtBmi', () => {
  it('matches the ticket vectors for a 74 inch height', () => {
    expect(weightAtBmi(18.5, HEIGHT_CM)).toBeCloseTo(144.1, 0)
    expect(weightAtBmi(25, HEIGHT_CM)).toBeCloseTo(194.7, 0)
    expect(weightAtBmi(30, HEIGHT_CM)).toBeCloseTo(233.7, 0)
  })

  it('has no answer without a height', () => {
    expect(weightAtBmi(25, null)).toBeNull()
    expect(weightAtBmi(25, 0)).toBeNull()
  })
})

describe('bmi', () => {
  it('agrees with the stored example: 259.3 lb at this height is 33.29', () => {
    expect(bmi(259.3, HEIGHT_CM)).toBeCloseTo(33.29, 1)
  })

  it('puts the stored 190 lb goal inside the healthy band', () => {
    expect(bmiBand(bmi(190, HEIGHT_CM))).toBe('healthy')
  })

  it('is null without a height rather than NaN', () => {
    expect(bmi(259.3, null)).toBeNull()
    expect(bmiBand(bmi(259.3, null))).toBeNull()
  })
})

describe('bmiBand', () => {
  it('uses the standard cut-points', () => {
    expect(bmiBand(18.4)).toBe('underweight')
    expect(bmiBand(18.5)).toBe('healthy')
    expect(bmiBand(24.9)).toBe('healthy')
    expect(bmiBand(25)).toBe('overweight')
    expect(bmiBand(29.9)).toBe('overweight')
    expect(bmiBand(30)).toBe('obese')
  })
})

describe('bmiThresholds', () => {
  it('returns the three lines the chart draws', () => {
    const lines = bmiThresholds(HEIGHT_CM)
    expect(lines.healthyLow).toBeCloseTo(144.1, 0)
    expect(lines.healthyHigh).toBeCloseTo(194.7, 0)
    expect(lines.obeseLow).toBeCloseTo(233.7, 0)
  })

  it('returns nulls when there is no height, so the UI can hide the feature', () => {
    expect(bmiThresholds(null)).toEqual({ healthyLow: null, healthyHigh: null, obeseLow: null })
  })

  it('exposes the thresholds it uses', () => {
    expect(BMI_THRESHOLDS).toEqual({ underweight: 18.5, healthy: 25, overweight: 30 })
  })
})

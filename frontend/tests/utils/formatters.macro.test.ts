import { formatMacro, formatMacros } from '@/utils/formatters'
import { formatNumber } from '@/utils/serving'

// FF-0092: macros are stored at full precision (dividing by servings leaves 0.7000000000000001)
// and must never display more than 2 decimals.

describe('formatMacro (FF-0092)', () => {
  it('cleans the value that was actually on screen', () => {
    // food_logs id 85 on the live database
    expect(formatMacro(0.7000000000000001)).toBe('0.7')
  })

  it('keeps up to two decimals', () => {
    expect(formatMacro(1.4000000000000001)).toBe('1.4')
    expect(formatMacro(0.666)).toBe('0.67')
    expect(formatMacro(12.345)).toBe('12.35')
  })

  it('drops trailing zeros', () => {
    expect(formatMacro(2)).toBe('2')
    expect(formatMacro(2.0)).toBe('2')
    expect(formatMacro(2.5)).toBe('2.5')
  })

  it('never renders an exponent or a long tail', () => {
    for (const value of [0.1 + 0.2, 1 / 3, 2.675, 0.000001]) {
      expect(formatMacro(value)).toMatch(/^-?\d+(\.\d{1,2})?$/)
    }
  })

  it('copes with missing and broken values', () => {
    expect(formatMacro(null)).toBe('0')
    expect(formatMacro(undefined)).toBe('0')
    expect(formatMacro(Number.NaN)).toBe('0')
    expect(formatMacro(Number.POSITIVE_INFINITY)).toBe('0')
  })

  it('is what formatMacros uses, so a row renders clean', () => {
    expect(formatMacros(0.7000000000000001, 0.8, 1.6)).toBe('P: 0.7g C: 0.8g F: 1.6g')
  })

  it('matches the serving helper, which delegates to it', () => {
    // one implementation of the rule, two names for existing callers
    expect(formatNumber(0.7000000000000001)).toBe(formatMacro(0.7000000000000001))
  })
})

import {
  formatDate,
  formatDateTime,
  formatWeight,
  formatCalories,
  formatMacros,
  formatDuration,
  getMacroPercentage,
  calculateCaloriesRemaining,
} from '@/utils/formatters'

describe('formatter functions', () => {
  describe('formatDate', () => {
    it('formats string date input', () => {
      const result = formatDate('2024-03-15T12:00:00Z')
      expect(result).toContain('Mar')
      expect(result).toContain('15')
      expect(result).toContain('2024')
    })

    it('formats Date input', () => {
      const date = new Date('2024-03-15T12:00:00Z')
      const result = formatDate(date)
      expect(result).toContain('Mar')
      expect(result).toContain('15')
      expect(result).toContain('2024')
    })
  })

  describe('formatDateTime', () => {
    it('formats date with time', () => {
      const result = formatDateTime('2024-03-15T14:30:00')
      expect(result).toContain('Mar')
      expect(result).toContain('15')
      expect(result).toContain('2024')
    })
  })

  describe('formatWeight', () => {
    it('formats weight with one decimal and lbs unit', () => {
      expect(formatWeight(75.456)).toBe('75.5 lbs')
      expect(formatWeight(80)).toBe('80.0 lbs')
    })
  })

  describe('formatCalories', () => {
    it('formats calories with locale string', () => {
      expect(formatCalories(2500)).toBe('2,500')
    })
  })

  describe('formatMacros', () => {
    it('formats macros with P, C, F labels', () => {
      expect(formatMacros(50, 200, 30)).toBe('P: 50g C: 200g F: 30g')
    })
  })

  describe('formatDuration', () => {
    it('formats minutes less than 60', () => {
      expect(formatDuration(30)).toBe('30m')
      expect(formatDuration(0)).toBe('0m')
    })

    it('formats minutes more than 60', () => {
      expect(formatDuration(90)).toBe('1h 30m')
      expect(formatDuration(120)).toBe('2h')
    })
  })

  describe('getMacroPercentage', () => {
    it('calculates percentage correctly', () => {
      expect(getMacroPercentage(500, 2000)).toBe(25)
    })

    it('returns 0 when total is 0', () => {
      expect(getMacroPercentage(500, 0)).toBe(0)
    })
  })

  describe('calculateCaloriesRemaining', () => {
    it('calculates remaining calories', () => {
      expect(calculateCaloriesRemaining(1500, 2000)).toBe(500)
      expect(calculateCaloriesRemaining(2500, 2000)).toBe(-500)
    })
  })
})

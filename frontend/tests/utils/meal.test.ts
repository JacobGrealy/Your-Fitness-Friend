import { mealForHour, resolveMealType, isMealType } from '@/utils/meal'

describe('meal resolution (FF-0018)', () => {
  it('uses midnight as a snack window', () => {
    expect(mealForHour(1)).toBe('snack')
    expect(mealForHour(3)).toBe('snack')
  })

  it('maps the day to the usual meals', () => {
    expect(mealForHour(8)).toBe('breakfast')
    expect(mealForHour(12)).toBe('lunch')
    expect(mealForHour(18)).toBe('dinner')
    expect(mealForHour(22)).toBe('snack')
  })

  it('prefers an explicit meal from the diary link', () => {
    const noon = new Date('2026-10-17T12:00:00')
    expect(resolveMealType('breakfast', noon)).toBe('breakfast')
  })

  it('falls back to the clock when the parameter is absent or junk', () => {
    const noon = new Date('2026-10-17T12:00:00')
    expect(resolveMealType(null, noon)).toBe('lunch')
    expect(resolveMealType('', noon)).toBe('lunch')
    expect(resolveMealType('brunch', noon)).toBe('lunch')
  })

  it('recognises only real meal types', () => {
    expect(isMealType('lunch')).toBe(true)
    expect(isMealType('Lunch')).toBe(false)
    expect(isMealType(null)).toBe(false)
  })
})

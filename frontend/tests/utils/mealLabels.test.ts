import { MEAL_LABELS, MEAL_TYPES } from '@/utils/constants'

// FF-0039: meal labels used to live in five places - a positional array in
// PhotoLog, a Record in DailyFood, another (saying "Snack") in FoodLogSelect and
// EditFoodLog, and a fifth in Dashboard. They now have one home, and this test is
// what makes that home a contract: add a meal type without a label and it fails.

describe('meal labels (FF-0039)', () => {
  it('labels every meal type', () => {
    for (const type of MEAL_TYPES) {
      expect(MEAL_LABELS[type]).toBeTruthy()
    }
  })

  it('has no label for anything that is not a meal type', () => {
    expect(Object.keys(MEAL_LABELS).sort()).toEqual([...MEAL_TYPES].sort())
  })

  it('calls the singular meal type "Snacks" in the UI', () => {
    // The data says 'snack'; every screen shows "Snacks" (FF-0037).
    expect(MEAL_LABELS.snack).toBe('Snacks')
  })

  it('is ordered breakfast, lunch, dinner, snack', () => {
    expect([...MEAL_TYPES]).toEqual(['breakfast', 'lunch', 'dinner', 'snack'])
  })
})

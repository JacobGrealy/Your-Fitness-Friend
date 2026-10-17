import { saveAcceptedEntries, type ReviewEntry } from '@/utils/photoLogEntries'

// FF-0042: accepting a photo review used to skip any entry without an id,
// silently losing that food. An entry with an id is updated; one without is
// created — a duplicate row the user can delete beats an invisible missing row.

const entry = (over: Partial<ReviewEntry> = {}): ReviewEntry => ({
  id: '7',
  food_name: 'Greek yogurt',
  calories: 120,
  protein_g: 17,
  carbs_g: 6,
  fat_g: 0,
  meal_type: 'breakfast',
  ...over,
})

const deps = () => ({
  updateFoodLog: jest.fn().mockResolvedValue(undefined),
  logFood: jest.fn().mockResolvedValue(undefined),
})

describe('saveAcceptedEntries', () => {
  it('updates entries that already exist', async () => {
    const d = deps()

    const result = await saveAcceptedEntries([entry()], d)

    expect(d.updateFoodLog).toHaveBeenCalledWith('7', {
      food_name: 'Greek yogurt',
      calories: 120,
      protein_g: 17,
      carbs_g: 6,
      fat_g: 0,
      meal_type: 'breakfast',
    })
    expect(d.logFood).not.toHaveBeenCalled()
    expect(result).toEqual({ updated: 1, created: 0 })
  })

  it('creates an entry that has no id instead of dropping it', async () => {
    const d = deps()

    const result = await saveAcceptedEntries([entry({ id: null })], d)

    expect(d.logFood).toHaveBeenCalledWith({
      food_name: 'Greek yogurt',
      calories: 120,
      protein_g: 17,
      carbs_g: 6,
      fat_g: 0,
      meal_type: 'breakfast',
    })
    expect(d.updateFoodLog).not.toHaveBeenCalled()
    expect(result).toEqual({ updated: 0, created: 1 })
  })

  it('treats an empty-string id as missing', async () => {
    const d = deps()

    await saveAcceptedEntries([entry({ id: '' })], d)

    expect(d.logFood).toHaveBeenCalledTimes(1)
  })

  it('handles a mixed batch and keeps every entry', async () => {
    const d = deps()

    const result = await saveAcceptedEntries(
      [entry(), entry({ id: undefined, food_name: 'Trail mix', calories: 180 }), entry({ id: '9' })],
      d
    )

    expect(result).toEqual({ updated: 2, created: 1 })
    expect(d.updateFoodLog.mock.calls.map((c) => c[0])).toEqual(['7', '9'])
    expect(d.logFood.mock.calls[0][0].food_name).toBe('Trail mix')
  })

  it('does nothing for an empty review', async () => {
    const d = deps()

    expect(await saveAcceptedEntries([], d)).toEqual({ updated: 0, created: 0 })
    expect(d.updateFoodLog).not.toHaveBeenCalled()
    expect(d.logFood).not.toHaveBeenCalled()
  })

  it('surfaces a failure instead of swallowing it', async () => {
    const d = deps()
    d.updateFoodLog.mockRejectedValue(new Error('boom'))

    await expect(saveAcceptedEntries([entry()], d)).rejects.toThrow('boom')
  })
})

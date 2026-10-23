import type { FoodLogCreate } from '@/types'

/**
 * Save the reviewed photo-log entries (FF-0042).
 *
 * The photo flow is unusual: `/api/meals/ai-log` creates a FoodLog row for every
 * analysed item and returns it with an id, so accepting the review is normally a
 * series of updates. The screen used to guard that with
 * `if (entry.id) { update } else { /* silently nothing *\/ }` — which meant that if
 * an entry ever arrived without an id, the user's food would vanish with no error
 * and no row: the worst possible failure for a tracking app.
 *
 * So: an entry with an id is updated, an entry without one is **created**. A
 * duplicate row is a visible mistake a user can delete; a missing row is invisible
 * data loss.
 */

export interface ReviewEntry {
  id?: string | number | null
  food_name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  meal_type: FoodLogCreate['meal_type']
}

export interface SaveEntryDeps {
  updateFoodLog: (id: string, data: Partial<FoodLogCreate>) => Promise<unknown>
  logFood: (data: FoodLogCreate) => Promise<unknown>
}

export interface SaveEntryResult {
  updated: number
  created: number
}

export async function saveAcceptedEntries(
  entries: ReviewEntry[],
  deps: SaveEntryDeps,
  date?: string
): Promise<SaveEntryResult> {
  let updated = 0
  let created = 0

  for (const entry of entries) {
    const nutrition = {
      food_name: entry.food_name,
      calories: entry.calories,
      protein_g: entry.protein_g,
      carbs_g: entry.carbs_g,
      fat_g: entry.fat_g,
      meal_type: entry.meal_type,
      ...(date ? { date } : {}),
    }

    if (entry.id !== undefined && entry.id !== null && entry.id !== '') {
      await deps.updateFoodLog(String(entry.id), nutrition)
      updated += 1
    } else {
      await deps.logFood(nutrition)
      created += 1
    }
  }

  return { updated, created }
}

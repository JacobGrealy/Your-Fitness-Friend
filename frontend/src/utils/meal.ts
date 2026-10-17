/**
 * Which meal a quick-add should land in (FF-0018).
 *
 * The Add Food screen can be opened from a specific meal in the diary
 * (`/food/log?meal=lunch`), and then that meal is obviously the right answer.
 * Opened from the tab bar there is no such context, so the time of day picks:
 * guessing from the clock is one tap fewer than asking, and picking the wrong
 * meal is a correction the diary already supports.
 */

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

const VALID: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export function isMealType(value: string | null | undefined): value is MealType {
  return !!value && (VALID as string[]).includes(value)
}

/** Meal implied by the hour of `now` (local time). */
export function mealForHour(hour: number): MealType {
  if (hour < 4) return 'snack'   // late night
  if (hour < 11) return 'breakfast'
  if (hour < 16) return 'lunch'
  if (hour < 21) return 'dinner'
  return 'snack'                 // evening
}

/**
 * The meal to log into: the URL's `?meal=` when it is a real meal type,
 * otherwise the one the clock implies.
 */
export function resolveMealType(param: string | null | undefined, now: Date = new Date()): MealType {
  if (isMealType(param)) return param
  return mealForHour(now.getHours())
}

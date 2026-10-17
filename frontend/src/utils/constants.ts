export const MAX_WEIGHT_LOG_NOTES = 500
export const MAX_EXERCISE_DESCRIPTION = 1000
export const MAX_EXERCISE_INSTRUCTIONS = 2000
export const MAX_EXERCISE_LOG_NOTES = 500
export const DEFAULT_DAILY_CALORIE_GOAL = 2000
export const DEFAULT_MACRO_GOALS = { protein: 150, carbs: 250, fat: 65 }
export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const
export type MealTypeKey = (typeof MEAL_TYPES)[number]
/**
 * Display names for the meal types. Keyed by type, not ordered by position: a
 * positional array silently files a meal under the wrong name as soon as the
 * lists drift, which is exactly what happened in Dashboard (FF-0037) and was
 * waiting to happen in PhotoLog (FF-0039).
 */
export const MEAL_LABELS: Record<MealTypeKey, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
}
export const INTENSITIES = ['low', 'medium', 'high'] as const
export const MUSCLE_GROUPS = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'full_body'] as const
export const EXERCISE_TYPES = ['cardio', 'strength', 'flexibility', 'other'] as const
export const GENDERS = ['male', 'female', 'other'] as const
export const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active'] as const
export const SEARCH_DEBOUNCE_MS = 300
export const RECENT_FOODS_DAYS = 7
export const SEARCH_RESULTS_LIMIT = 15

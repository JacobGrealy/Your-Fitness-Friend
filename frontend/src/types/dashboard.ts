/**
 * Dashboard summary type definitions for the FitnessFriend frontend.
 *
 * These types represent daily and weekly summary data displayed
 * on the user dashboard, combining nutrition, exercise, and weight data.
 */

/**
 * Nutritional data for a single day.
 */
export interface DailyCalorieData {
  consumed: number
  goal: number
  remaining: number
  burned_exercise: number
}

/**
 * Macro breakdown for a single day.
 * Each macro has consumed and goal values.
 */
export interface DailyMacroData {
  protein: { consumed: number; goal: number }
  carbs: { consumed: number; goal: number }
  fat: { consumed: number; goal: number }
}

/**
 * Weight data for a single day.
 */
export interface DailyWeightData {
  current: number | null
  change_from_yesterday: number | null
  change_from_week_ago: number | null
}

/**
 * Exercise entry in daily exercises list.
 */
export interface DailyExerciseItem {
  name: string
  duration_min: number
  calories: number
}

/**
 * Meal entry in daily meals list.
 */
export interface DailyMealItem {
  meal_type: string
  food_name: string
  calories: number
}

/**
 * A daily summary combining nutrition, exercise, and meal photo data.
 * Used by the dashboard to display a snapshot of the user's day.
 */
export interface DailySummary {
  date: string
  calories: DailyCalorieData
  macros: DailyMacroData
  weight: DailyWeightData
  exercises: DailyExerciseItem[]
  meals: DailyMealItem[]
}

/**
 * A weekly summary aggregating data across a 7-day period.
 * Used by the dashboard to display trends and weekly progress.
 */
export interface WeeklySummary {
  week_start: string
  week_end: string
  average_calories: number
  calorie_goal: number
  total_exercise_calories: number
  exercise_days: number
  weight_change: number | null
}

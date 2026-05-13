/**
 * Food and nutrition type definitions for the FitnessFriend frontend.
 *
 * These types represent food items, food logs, daily totals, creation data,
 * search queries, macro goals, and meal types for the nutrition tracking feature.
 */

/**
 * A user-defined food item with nutritional information.
 * Mirrors the backend Food model.
 */
export interface Food {
  id: string
  user_id: string
  name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  brand?: string
  created_at: string
}

/**
 * A log entry recording consumption of a food item.
 * Mirrors the backend FoodLog model.
 */
export interface FoodLog {
  id: string
  user_id: string
  food_name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  created_at: string
}

/**
 * Aggregated daily nutritional totals for a single day.
 */
export interface DailyTotals {
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  calorie_goal: number
  calories_remaining: number
}

/**
 * Data required to create a new food item.
 */
export interface FoodCreate {
  name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  serving_size: string
}

/**
 * Data required to create a new food log entry.
 */
export interface FoodLogCreate {
  food_id?: string
  quantity?: number
  food_name?: string
  calories?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  date?: string
  serving_size?: string
  brand?: string
  barcode_id?: string
}

/**
 * Data for searching or creating a food item from an external database.
 */
export interface FoodSearch {
  name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  serving_size: string
}

/**
 * Daily macro nutrient goals in grams.
 */
export interface MacroGoals {
  protein: number
  carbs: number
  fat: number
}

/**
 * Meal type literal union type.
 */
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

/**
 * Summary of a recently logged food, grouped by name.
 */
export interface FoodRecent {
  food_name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  serving_size: string | null
  brand: string | null
  barcode_id: string | null
  total_logs: number
  last_logged: string
}

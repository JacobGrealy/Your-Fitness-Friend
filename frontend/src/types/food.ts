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
export interface ServingReference {
  serving_amount?: number | null
  serving_unit?: string | null
}
export interface ConsumedQuantity extends ServingReference {
  amount?: number | null
  unit?: string | null
}

export interface Food extends ServingReference {
  id: string
  user_id: string
  name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  brand?: string
  serving_size?: string | null
  barcode_id?: string | null
  created_at: string
}

/**
 * A log entry recording consumption of a food item.
 * Mirrors the backend FoodLog model.
 */
export interface FoodLog extends ConsumedQuantity {
  id: string
  user_id: string
  food_name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  serving_size?: string
  number_of_servings?: number
  photo_url?: string | null
  brand?: string
  barcode_id?: string | null
  food_id?: string | null
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
export interface FoodCreate extends ServingReference {
  name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  serving_size: string
  food_id?: string
}

/**
 * Data required to create a new food log entry.
 */
export interface ExternalFood extends Omit<Food, 'id' | 'user_id' | 'created_at'> {
  source: 'openfoodfacts'
  token: string
}

export interface FoodLogCreate extends ConsumedQuantity {
  external_food_token?: string
  calories_per_serving?: number
  protein_per_serving?: number
  carbs_per_serving?: number
  fat_per_serving?: number
  food_id?: string
  quantity?: number
  food_name?: string
  calories?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  date?: string
  number_of_servings?: number
  serving_size?: string
  photo_url?: string | null
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
export interface FoodRecent extends ConsumedQuantity {
  number_of_servings?: number
  calories_per_serving?: number
  protein_per_serving?: number
  carbs_per_serving?: number
  fat_per_serving?: number
  food_name: string
  food_id?: string | null
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  serving_size: string | null
  brand: string | null
  barcode_id: string | null
  /** Newest photo from this food's history, if any (FF-0087). */
  photo_url?: string | null
  total_logs: number
  last_logged: string
}

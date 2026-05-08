/**
 * Meal photo AI analysis type definitions for the FitnessFriend frontend.
 *
 * These types represent meal photos, creation data for uploading photos,
 * and AI-generated nutritional analysis results.
 */

/**
 * A meal photo with AI-estimated nutritional values.
 * Mirrors the backend MealPhoto model.
 */
export interface MealPhoto {
  id: string
  user_id: string
  photo_path: string
  estimated_calories: number | null
  estimated_protein: number | null
  estimated_carbs: number | null
  estimated_fat: number | null
  date: string
  created_at: string
}

/**
 * Data required to upload a new meal photo.
 * Uses FormData for file upload.
 */
export interface MealPhotoCreate {
  file: File
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
}

/**
 * AI-estimated nutritional breakdown for a meal photo.
 */
export interface MealAnalysis {
  estimated_calories: number
  protein: number
  carbs: number
  fat: number
}

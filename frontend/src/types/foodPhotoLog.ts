/**
 * Types for the food photo AI log feature.
 */

/**
 * A log entry returned from the AI analysis or conversation.
 */
export interface FoodPhotoLogEntry {
  id: number | null
  food_name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
}

/**
 * A message in the AI conversation.
 */
export interface FoodPhotoMessage {
  role: 'user' | 'ai'
  content: string
}

/**
 * Response from the AI log endpoint.
 */
export interface AiLogResponse {
  logs: FoodPhotoLogEntry[]
  conversation_history: FoodPhotoMessage[]
  photo_path?: string
  error?: string
}

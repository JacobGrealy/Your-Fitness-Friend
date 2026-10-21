/**
 * Exercise tracking type definitions for the FitnessFriend frontend.
 *
 * These types represent saved exercises, exercise logs, creation data,
 * and filtering options for the exercise tracking feature.
 */

/**
 * A user-saved reference exercise.
 * Mirrors the backend SavedExercise model.
 */
export interface SavedExercise {
  id: string
  user_id: string
  name: string
  muscle_group: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'full_body'
  type: 'cardio' | 'strength' | 'flexibility' | 'other'
  description: string | null
  instructions: string | null
  created_at: string
}

/**
 * A logged exercise session.
 * Mirrors the backend ExerciseLog model.
 */
export interface ExerciseLog {
  id: string
  user_id: string
  saved_exercise_id: string | null
  exercise_name: string
  duration: number | null
  calories_burned: number | null
  intensity: 'low' | 'medium' | 'high'
  notes: string | null
  logged_at: string
  date?: string
  activity_id?: string | null
  tracking_format?: string | null
  details?: ExerciseEstimate | null
  photo_url?: string | null
  photo_endpoint?: string | null
}

export interface ExerciseActivity {
  id: string
  name: string
  category: string
  tracking_format: string
}

export interface TreadmillSessionCreate {
  activity_id: 'treadmill_walking'
  date: string
  duration_minutes: number
  speed?: number
  speed_unit?: 'mph' | 'km/h'
  pace?: number
  pace_unit?: 'min/mile' | 'min/km'
  incline_percent: number
  calorie_override?: number | null
  notes?: string
}

export interface ExerciseEstimate {
  activity_id: string
  tracking_format: string
  duration_minutes: number
  speed_mph: number
  incline_percent: number
  distance_miles: number
  distance_km: number
  active_calories: number | null
  gross_calories: number | null
  calories_burned: number
  calorie_override?: number | null
  calorie_basis: 'active'
  weight_lbs: number
  weight_kg: number
  weight_source: 'weigh_in' | 'profile'
  weight_date: string | null
  method: string
  source: string
  warnings: string[]
}

/**
 * Data required to create a new exercise log entry.
 */
export interface ExerciseLogCreate {
  exercise_id: string
  sets?: number | null
  reps?: number | null
  weight_lbs?: number | null
  duration_minutes: number
  intensity?: 'low' | 'medium' | 'high'
}

/**
 * Data required to create a new saved exercise.
 */
export interface SavedExerciseCreate {
  name: string
  muscle_group?: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'full_body'
  type?: 'cardio' | 'strength' | 'flexibility' | 'other'
  description?: string | null
  instructions?: string | null
}

/**
 * Filter options for querying exercise logs.
 */
export interface ExerciseFilter {
  start_date?: string
  end_date?: string
}

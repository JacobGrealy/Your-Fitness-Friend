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

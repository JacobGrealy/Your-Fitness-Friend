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
  details?: ExerciseEstimate | StrengthEstimate | ActivityEstimate | null
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
  arms_supported?: boolean
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
  arms_supported?: boolean
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

export type ActivityId = 'outdoor_walking' | 'outdoor_running' | 'treadmill_running' | 'cycling' | 'stationary_cycling' | 'stretching' | 'yoga'
export interface ActivitySessionCreate {
  activity_id: ActivityId
  date: string
  duration_minutes: number
  distance?: number
  distance_unit?: 'mi' | 'km'
  speed?: number
  speed_unit?: 'mph' | 'km/h'
  pace?: number
  pace_unit?: 'min/mile' | 'min/km'
  incline_percent?: number
  power_watts?: number
  effort?: 'light' | 'moderate' | 'vigorous'
  yoga_style?: 'general' | 'hatha' | 'vinyasa' | 'power'
  calorie_override?: number | null
  notes?: string
}
export interface ActivityEstimate {
  activity_id: ActivityId
  tracking_format: string
  duration_minutes: number
  speed_mph: number | null
  distance_miles: number | null
  distance_km: number | null
  incline_percent: number | null
  power_watts: number | null
  effort: 'light' | 'moderate' | 'vigorous'
  yoga_style: string | null
  active_calories: number
  gross_calories: number
  calories_burned: number
  calorie_override: number | null
  weight_lbs: number
  weight_source: 'weigh_in' | 'profile'
  weight_date: string | null
  method: string
  source: string
  warnings: string[]
}

export type StrengthEquipment = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'other'
export interface StrengthLibraryItem { id: string; name: string; equipment: StrengthEquipment }
export interface StrengthExercise {
  exercise_id: string | null
  name: string
  equipment: StrengthEquipment
  load_convention?: string
  sets: { reps: number; weight_lbs: number | null }[]
}
export interface StrengthSessionCreate {
  activity_id: 'strength_training'
  date: string
  exercises: StrengthExercise[]
  duration_minutes?: number | null
  effort: 'moderate' | 'vigorous'
  calorie_override?: number | null
  notes?: string
}
export interface StrengthEstimate {
  activity_id: 'strength_training'
  tracking_format: 'strength'
  exercises: StrengthExercise[]
  duration_minutes: number | null
  effort: 'moderate' | 'vigorous'
  active_calories: number | null
  gross_calories: number | null
  calories_burned: number | null
  calorie_override: number | null
  weight_lbs: number | null
  weight_source: 'weigh_in' | 'profile' | null
  weight_date: string | null
  method: string
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

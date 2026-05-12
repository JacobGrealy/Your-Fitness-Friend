/**
 * Barrel export for all FitnessFriend frontend type definitions.
 *
 * Import everything from this single file for convenience:
 *   import { User, WeightLog, Food, DailySummary } from '@/types'
 */

export type {
  User,
  UserProfile,
  AuthResponse,
  RegisterData,
  LoginData,
} from './user'

export type {
  WeightLog,
  WeightStatistics,
  WeightTrend,
  WeightLogCreate,
  WeightFilter,
} from './weight'

export type {
  SavedExercise,
  ExerciseLog,
  ExerciseLogCreate,
  SavedExerciseCreate,
  ExerciseFilter,
} from './exercise'

export type {
  Food,
  FoodLog,
  DailyTotals,
  FoodCreate,
  FoodLogCreate,
  FoodSearch,
  MacroGoals,
  MealType,
} from './food'

export type {
  MealPhoto,
  MealPhotoCreate,
  MealAnalysis,
} from './meals'

export type {
  FoodPhotoLogEntry,
  FoodPhotoMessage,
  AiLogResponse,
} from './foodPhotoLog'

export type {
  DailySummary,
  DailyCalorieData,
  DailyMacroData,
  DailyExerciseItem,
  DailyMealItem,
  WeeklySummary,
} from './dashboard'

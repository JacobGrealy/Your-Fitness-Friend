# Plan: Define TypeScript Types

## Overview
Create TypeScript interfaces for all backend models and API responses.

## Tasks

### 1. Create src/types/user.ts
- **User**: id, username, email, age, gender, height, weight, activity_level, daily_calorie_goal
- **UserProfile**: id, username, email, age, gender, height, weight
- **AuthResponse**: access_token, user (User)
- **RegisterData**: username, email, password, age, gender, height, weight
- **LoginData**: username, password

### 2. Create src/types/weight.ts
- **WeightLog**: id, user_id, weight, recorded_at, notes, photo_url
- **WeightStatistics**: current_weight, average_weight, min_weight, max_weight, count
- **WeightTrend**: current_weight, previous_weight, change_7d, change_30d, trend
- **WeightLogCreate**: weight, body_fat_percentage (optional), notes (optional)
- **WeightFilter**: start_date (optional), end_date (optional)

### 3. Create src/types/exercise.ts
- **SavedExercise**: id, user_id, name, muscle_group, type, description, instructions, created_at
- **ExerciseLog**: id, user_id, saved_exercise_id, exercise_name, duration, calories_burned, intensity, notes, logged_at
- **ExerciseLogCreate**: exercise_id, sets (optional), reps (optional), weight (optional), duration_minutes, intensity (optional)
- **SavedExerciseCreate**: name, muscle_group (optional), type (optional), description (optional), instructions (optional)
- **ExerciseFilter**: start_date (optional), end_date (optional)

### 4. Create src/types/food.ts
- **Food**: id, user_id, name, calories, protein_g, carbs_g, fat_g, created_at
- **FoodLog**: id, user_id, food_name, calories, protein_g, carbs_g, fat_g, date, meal_type, created_at
- **DailyTotals**: total_calories, total_protein, total_carbs, total_fat, calorie_goal, calories_remaining
- **FoodCreate**: name, calories, protein_g, carbs_g, fat_g, serving_size
- **FoodLogCreate**: food_id, quantity, meal_type
- **FoodSearch**: name, calories, protein_g, carbs_g, fat_g, serving_size
- **MacroGoals**: protein, carbs, fat (grams)

### 5. Create src/types/meals.ts
- **MealPhoto**: id, user_id, photo_path, estimated_calories, estimated_protein, estimated_carbs, estimated_fat, date, created_at
- **MealPhotoCreate**: file (FormData), meal_type
- **MealAnalysis**: estimated_calories, protein, carbs, fat

### 6. Create src/types/api.ts
- **ApiResponse<T>**: data: T, message?: string
- **ApiError**: error: string, message?: string
- **PaginatedResponse<T>**: data: T[], total: number, page: number, limit: number

### 7. Create src/types/dashboard.ts
- **DailySummary**: date, calories (consumed, goal, remaining), macros (protein, carbs, fat), exercises (count, calories, duration), meal_photos
- **WeeklySummary**: week_start, week_end, average_calories, calorie_goal, total_exercise_calories, exercise_days, weight_change

### 8. Create src/types/index.ts
- Export all type definitions
- Create combined exports for easier imports

## Expected Outcome
- All backend models have TypeScript equivalents
- Type safety for API responses
- Intellisense support in IDE
- Compile-time error detection for type mismatches

## Notes
- Match backend field names exactly (snake_case)
- Mark optional fields with ?
- Use union types for enums (e.g., meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack')
- Keep types in sync with backend models
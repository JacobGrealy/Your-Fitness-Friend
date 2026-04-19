# Plan: Create Form Validation Schemas

## Overview
Define Zod schemas for all form validations and create utility functions.

## Tasks

### 1. Create src/utils/validation.ts
- Import zod from 'zod'
- Define schema constants:

**Auth Schemas:**
- registerSchema:
  - username: string, min 3, max 20
  - email: string, email format
  - password: string, min 6 characters
  - age: number, optional, 1-120
  - gender: enum ('male' | 'female' | 'other'), optional
  - height: number, optional, 30-300 cm
  - weight: number, optional, 1-500 kg

- loginSchema:
  - username: string
  - password: string

**Weight Schemas:**
- logWeightSchema:
  - weight: number, min 1, max 500
  - body_fat_percentage: number, optional, 0-100
  - notes: string, optional, max 500 chars

**Exercise Schemas:**
- saveExerciseSchema:
  - name: string, min 1, max 100
  - muscle_group: enum, optional
  - type: enum, optional
  - description: string, optional
  - instructions: string, optional

- logExerciseSchema:
  - exercise_id: number
  - duration: number, min 1
  - intensity: enum, optional

**Food Schemas:**
- customFoodSchema:
  - name: string, min 1, max 120
  - calories: number, min 1
  - protein_g: number, optional, min 0
  - carbs_g: number, optional, min 0
  - fat_g: number, optional, min 0
  - serving_size: string, optional

- logFoodSchema:
  - food_id: number
  - quantity: number, min 0.1, max 100
  - meal_type: enum ('breakfast' | 'lunch' | 'dinner' | 'snack')

### 2. Create src/utils/formatters.ts
- **formatWeight(kg)**: Format weight with 1 decimal, add 'kg' suffix
- **formatCalories(calories)**: Format with commas
- **formatMacros(grams)**: Format with 1 decimal, add 'g' suffix
- **formatDate(date)**: Relative date ('2 hours ago', 'Yesterday', 'Jan 15')
- **formatDateFull(date)**: Full date format ('January 15, 2024')
- **formatTime(date)**: Time format ('8:30 AM')

### 3. Create src/utils/constants.ts
- **MEAL_TYPES**: ['breakfast', 'lunch', 'dinner', 'snack']
- **MUSCLE_GROUPS**: ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio']
- **EXERCISE_TYPES**: ['strength', 'cardio', 'flexibility', 'hiit']
- **INTENSITY_LEVELS**: ['low', 'medium', 'high']
- **GENDERS**: ['male', 'female', 'other']
- **ACTIVITY_LEVELS**: ['sedentary', 'light', 'moderate', 'active', 'very_active']

### 4. Create src/utils/index.ts
- Export all utilities
- Create unified import

## Expected Outcome
- All forms have validation schemas
- Consistent error messages
- Reusable formatting functions
- Centralized constants
- Type-safe validation

## Notes
- Use Zod's built-in methods where possible
- Add custom error messages for UX
- Keep schemas isolated from components
- Test schemas with edge cases
# Plan 4: Exercise Tracking with AI

## Objective
Implement exercise logging with AI-powered calorie estimation and saved exercises.

## Tasks

### 4.1 Exercise Models

**ExerciseLog (models/exercise_log.py)**
- id (Integer, PK)
- user_id (Integer, FK)
- exercise_description (Text)
- duration_min (Integer)
- calories_burned (Float)
- date (Date, default today)
- created_at (DateTime)

**SavedExercise (models/saved_exercise.py)**
- id (Integer, PK)
- user_id (Integer, FK)
- name (String)
- description (Text)
- avg_calories_per_min (Float)
- created_at (DateTime)

### 4.2 Qwen Client (utils/qwen_client.py)
Create client for exercise calorie estimation:
- Function: `estimate_exercise_calories(description, duration_min, weight_kg)`
- Prompt: "Estimate calories burned for [description] for [duration] minutes for a person weighing [weight]kg. Return JSON: {\"calories\": number}"
- Parse JSON response
- Handle errors and invalid responses

### 4.3 Exercise Routes (routes/exercise.py)

**POST /api/exercise/log**
- Body: { "exercise_description": string, "duration_min": int }
- Get current user's weight from profile
- Call Qwen API to estimate calories
- Save exercise log with estimated calories
- Return: Created log with AI-estimated calories

**GET /api/exercise/saved**
- Returns: Array of user's saved exercises

**POST /api/exercise/save**
- Body: { "name": string, "description": string, "avg_calories_per_min": float }
- Save exercise for future use
- Returns: Saved exercise

**POST /api/exercise/estimate** (optional)
- Body: { "exercise_description": string, "duration_min": int }
- Returns: Estimated calories without creating log
- Useful for preview before logging

## Acceptance Criteria
- Users can log exercises with description and duration
- Calories are estimated via Qwen AI based on description, duration, and user weight
- Users can save frequently used exercises
- Saved exercises can be retrieved for quick logging
- AI estimation handles errors gracefully

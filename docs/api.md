# FitnessFriend API Documentation

## Base URL

```
http://localhost:5000/api
```

## Authentication

All authenticated endpoints require a JWT access token in the `Authorization` header:

```
Authorization: Bearer <token>
```

### Getting a Token

1. Register a new user:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123",
    "email": "test@example.com",
    "age": 25,
    "gender": "male",
    "height": 175,
    "weight": 70
  }'
```

2. Login to get token:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## Auth Endpoints

### Register User
**POST** `/auth/register`

Register a new user account.

**Request:**
```json
{
  "username": "testuser",
  "password": "password123",
  "email": "test@example.com",
  "age": 25,
  "gender": "male",
  "height": 175,
  "weight": 70
}
```

**Response (201):**
```json
{
  "id": 1,
  "username": "testuser",
  "email": "test@example.com",
  "age": 25,
  "gender": "male",
  "height": 175,
  "weight": 70,
  "bmr": 1728,
  "daily_calorie_goal": 2000
}
```

### Login
**POST** `/auth/login`

Authenticate and receive access token.

**Request:**
```json
{
  "username": "testuser",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Logout
**POST** `/auth/logout`

Logout current user.

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

### Get Profile
**GET** `/auth/profile`

Get current user profile.

**Response (200):**
```json
{
  "id": 1,
  "username": "testuser",
  "email": "test@example.com",
  "age": 25,
  "gender": "male",
  "height": 175,
  "weight": 70,
  "bmr": 1728,
  "daily_calorie_goal": 2000
}
```

### Update Profile
**PUT** `/auth/profile`

Update user profile information.

**Request:**
```json
{
  "age": 26,
  "weight": 72,
  "daily_calorie_goal": 2200
}
```

**Response (200):**
```json
{
  "id": 1,
  "username": "testuser",
  "age": 26,
  "weight": 72,
  "daily_calorie_goal": 2200
}
```

---

## Weight Tracking Endpoints

### Log Weight
**POST** `/weight`

Add a new weight log entry.

**Request:**
```json
{
  "weight": 70.5,
  "body_fat_percentage": 15.0,
  "notes": "Morning weigh-in"
}
```

**Response (201):**
```json
{
  "id": 1,
  "user_id": 1,
  "weight": 70.5,
  "body_fat_percentage": 15.0,
  "notes": "Morning weigh-in",
  "timestamp": "2024-01-15T08:00:00"
}
```

### List Weight Logs
**GET** `/weight`

Get all weight logs for current user.

**Response (200):**
```json
{
  "logs": [
    {
      "id": 1,
      "weight": 70.5,
      "body_fat_percentage": 15.0,
      "notes": "Morning weigh-in",
      "timestamp": "2024-01-15T08:00:00"
    }
  ]
}
```

### Weight Statistics
**GET** `/weight/statistics`

Get weight statistics (current, average, min, max).

**Response (200):**
```json
{
  "current_weight": 70.5,
  "average_weight": 71.2,
  "min_weight": 68.0,
  "max_weight": 75.0,
  "count": 10
}
```

### Weight Trend
**GET** `/weight/trend`

Get weight trend over time.

**Response (200):**
```json
{
  "current_weight": 70.5,
  "previous_weight": 71.0,
  "change_7d": -0.5,
  "change_30d": -2.0,
  "trend": "down"
}
```

---

## Exercise Endpoints

### Save Exercise
**POST** `/exercises/saved`

Save a custom exercise to your library.

**Request:**
```json
{
  "name": "Bench Press",
  "muscle_group": "chest",
  "calories_per_rep": 3
}
```

**Response (201):**
```json
{
  "id": 1,
  "user_id": 1,
  "name": "Bench Press",
  "muscle_group": "chest",
  "calories_per_rep": 3
}
```

### List Saved Exercises
**GET** `/exercises/saved`

Get all saved exercises.

**Response (200):**
```json
{
  "exercises": [
    {
      "id": 1,
      "name": "Bench Press",
      "muscle_group": "chest",
      "calories_per_rep": 3
    }
  ]
}
```

### Log Exercise
**POST** `/exercises/log`

Log an exercise workout (AI-calories).

**Request:**
```json
{
  "exercise_id": 1,
  "sets": 3,
  "reps": 10,
  "weight": 135,
  "duration_minutes": 15
}
```

**Response (201):**
```json
{
  "id": 1,
  "user_id": 1,
  "exercise_id": 1,
  "sets": 3,
  "reps": 10,
  "weight": 135,
  "duration_minutes": 15,
  "estimated_calories": 90
}
```

---

## Food Endpoints

### Add Custom Food
**POST** `/food/custom`

Add a custom food entry.

**Request:**
```json
{
  "name": "Homemade Salad",
  "calories": 250,
  "protein": 10,
  "carbs": 30,
  "fat": 8,
  "serving_size": "1 bowl"
}
```

**Response (201):**
```json
{
  "id": 1,
  "user_id": 1,
  "name": "Homemade Salad",
  "calories": 250,
  "protein": 10,
  "carbs": 30,
  "fat": 8,
  "serving_size": "1 bowl"
}
```

### List Custom Foods
**GET** `/food/custom`

Get all custom foods.

**Response (200):**
```json
{
  "foods": [
    {
      "id": 1,
      "name": "Homemade Salad",
      "calories": 250,
      "protein": 10,
      "carbs": 30,
      "fat": 8
    }
  ]
}
```

### Log Food
**POST** `/food/log`

Log a food entry for today.

**Request:**
```json
{
  "food_id": 1,
  "quantity": 1,
  "meal_type": "breakfast"
}
```

**Response (201):**
```json
{
  "id": 1,
  "user_id": 1,
  "food_id": 1,
  "quantity": 1,
  "meal_type": "breakfast",
  "calories": 250
}
```

### Daily Food Totals
**GET** `/food/daily`

Get today's nutritional totals.

**Response (200):**
```json
{
  "total_calories": 1800,
  "total_protein": 120,
  "total_carbs": 180,
  "total_fat": 60,
  "calorie_goal": 2000,
  "calories_remaining": 200
}
```

### Search Food
**GET** `/food/search`

Search food database.

**Query Parameters:**
- `q` (required): Search query

**Response (200):**
```json
{
  "results": [
    {
      "name": "Chicken Breast",
      "calories": 165,
      "protein": 31,
      "carbs": 0,
      "fat": 3.6,
      "serving_size": "100g"
    }
  ]
}
```

### Upload Meal Photo
**POST** `/food/photos`

Upload a meal photo for AI analysis.

**Request (multipart/form-data):**
- `file`: Image file (png, jpg, jpeg, gif)
- `meal_type`: breakfast, lunch, dinner, snack

**Response (201):**
```json
{
  "id": 1,
  "image_path": "/uploads/meal_photos/2024-01-15_photo.jpg",
  "meal_type": "dinner",
  "timestamp": "2024-01-15T19:00:00",
  "analyzed": true,
  "analysis": {
    "estimated_calories": 500,
    "protein": 30,
    "carbs": 50,
    "fat": 20
  }
}
```

### List Meal Photos
**GET** `/food/photos`

Get all meal photos.

**Response (200):**
```json
{
  "photos": [
    {
      "id": 1,
      "image_path": "/uploads/meal_photos/photo.jpg",
      "meal_type": "dinner",
      "timestamp": "2024-01-15T19:00:00",
      "analyzed": true
    }
  ]
}
```

---

## Dashboard Endpoints

### Daily Summary
**GET** `/dashboard/daily`

Get daily summary with calories, macros, and exercises.

**Response (200):**
```json
{
  "date": "2024-01-15",
  "calories": {
    "consumed": 1800,
    "goal": 2000,
    "remaining": 200
  },
  "macros": {
    "protein": {"grams": 120, "goal": 150},
    "carbs": {"grams": 180, "goal": 200},
    "fat": {"grams": 60, "goal": 67}
  },
  "exercises": {
    "count": 3,
    "calories": 150,
    "duration_minutes": 45
  },
  "meal_photos": 2
}
```

### Weight Trend
**GET** `/dashboard/weight-trend`

Get weight trend information.

**Response (200):**
```json
{
  "current_weight": 70.5,
  "previous_weight": 71.0,
  "change_24h": -0.5,
  "change_7d": -2.0,
  "trend": "down"
}
```

### Weekly Summary
**GET** `/dashboard/weekly-summary`

Get weekly summary statistics.

**Response (200):**
```json
{
  "week_start": "2024-01-08",
  "week_end": "2024-01-14",
  "average_calories": 1900,
  "calorie_goal": 2000,
  "total_exercise_calories": 850,
  "exercise_days": 5,
  "weight_change": -1.5
}
```

---

## User Endpoints

### Get User Stats
**GET** `/user/stats`

Get user statistics and goals.

**Response (200):**
```json
{
  "daily_calorie_goal": 2000,
  "bmr": 1728,
  "macro_goals": {
    "protein": 150,
    "carbs": 200,
    "fat": 67
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource does not exist |
| 422 | Unprocessable Entity - Validation error |
| 500 | Internal Server Error - Server error |

### Error Response Format

```json
{
  "error": "Error message here"
}
```

---

## Environment Variables

```bash
# Required
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///fitness_friend.db

# Optional
FLASK_ENV=development
QWEN_BASE_URL=http://localhost:8080/v1
QWEN_API_KEY=your-api-key
CORS_ORIGINS=http://localhost:3000
```

---

## Deployment

### With Gunicorn

```bash
gunicorn app:app
```

### With Procfile (Heroku)

```bash
web: gunicorn app:app
```

### Production Setup

1. Set `FLASK_ENV=production`
2. Use strong `SECRET_KEY`
3. Configure proper `DATABASE_URL`
4. Set up logging
5. Enable CORS for your frontend domain

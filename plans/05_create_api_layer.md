# Plan: Create API Layer

## Overview
Build the API layer with Axios, including interceptors for authentication and error handling.

## Tasks

### 1. Create src/api/client.ts
- Import axios
- Create axios instance with base URL from environment variable
- Set default headers (Content-Type: application/json)
- Configure timeout (e.g., 30 seconds)
- Add request interceptor:
  - Get token from auth store
  - Attach token to Authorization header if present
- Add response interceptor:
  - Handle 401 errors (token expired, logout user)
  - Handle 403 errors (forbidden)
  - Handle 422 errors (validation errors)
  - Handle 500 errors (server error)
  - Return consistent error format

### 2. Create src/api/auth.api.ts
- **login**: POST /auth/login with credentials
- **register**: POST /auth/register with user data
- **logout**: POST /auth/logout
- **getProfile**: GET /auth/profile
- **updateProfile**: PUT /auth/profile with updated data

### 3. Create src/api/weight.api.ts
- **getLogs**: GET /api/weight/logs with optional date filters
- **getStatistics**: GET /api/weight/statistics
- **getTrend**: GET /api/weight/trend
- **logWeight**: POST /api/weight/logs with weight data

### 4. Create src/api/exercise.api.ts
- **getSavedExercises**: GET /api/exercise/saved
- **saveExercise**: POST /api/exercise/saved with exercise data
- **logExercise**: POST /api/exercise/log with exercise data
- **getExerciseLogs**: GET /api/exercise/logs with optional filters

### 5. Create src/api/food.api.ts
- **searchFoods**: GET /api/food?q={query}
- **getCustomFoods**: GET /api/food
- **createCustomFood**: POST /api/food with food data
- **logFood**: POST /api/food/log with food log data
- **getDailyTotals**: GET /api/food/daily

### 6. Create src/api/meals.api.ts
- **uploadPhoto**: POST /api/meals/photos with FormData (multipart)
- **getPhotos**: GET /api/meals/photos with optional date filters
- **deletePhoto**: DELETE /api/meals/photos/{id}

### 7. Create src/api/index.ts
- Export all API functions
- Create unified API object for easy imports

### 8. Create .env.example
- VITE_API_URL=http://localhost:5000
- Document environment variables

## Expected Outcome
- Axios instance configured with interceptors
- All API endpoints have typed functions
- Token automatically attached to requests
- Errors handled consistently
- Ready for component integration

## Notes
- Use environment variables for API URL
- Handle multipart form data for file uploads
- Keep API functions pure (no UI logic)
- Add comments explaining each endpoint
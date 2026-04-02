# Plan 6: AI Meal Photo Analysis

## Objective
Implement meal photo upload with Qwen AI nutrition estimation.

## Tasks

### 6.1 Meal Photo Model (models/meal_photo.py)
Fields:
- id (Integer, PK)
- user_id (Integer, FK)
- photo_path (String)
- estimated_calories (Integer)
- estimated_protein (Float)
- estimated_carbs (Float)
- estimated_fat (Float)
- date (Date)
- created_at (DateTime)

### 6.2 Qwen Image Analysis Function
Create function in `utils/qwen_client.py`:
- Function: `analyze_meal_photo(image_base64)`
- Prompt: "Analyze this meal photo. Estimate total calories, protein (g), carbohydrates (g), and fat (g). Also list the food items you see. Return JSON: {\"calories\": number, \"protein\": number, \"carbs\": number, \"fat\": number, \"items\": [\"item1\", \"item2\"]}"
- Handle image encoding to base64
- Parse JSON response
- Handle errors and invalid responses

### 6.3 Meal Photo Routes (routes/meals.py)

**POST /api/meals/photo**
- Content-Type: multipart/form-data
- Field: photo (file, image/jpeg or image/png)
- Process:
  1. Validate file type and size
  2. Save file to uploads folder
  3. Read file and encode to base64
  4. Call Qwen API for analysis
  5. Parse response and validate
  6. Create meal_photo record
  7. Optionally create food_log entry with estimated nutrition
  8. Return: Analysis results

### 6.4 File Upload Handling
- Create uploads directory with proper permissions
- Validate file types (jpg, png only)
- Validate file size (max 10MB)
- Generate unique filename
- Store relative path in database

### 6.5 Error Handling
- Invalid file type: Return 400 with error message
- File too large: Return 400 with error message
- AI analysis fails: Return 422 with error message
- Invalid AI response: Return 422 with error message

## Acceptance Criteria
- Users can upload meal photos
- Photos are validated for type and size
- Qwen AI analyzes photo and returns nutrition estimates
- Results are saved to database
- Error handling for all failure cases
- Optional: Auto-create food log from photo analysis

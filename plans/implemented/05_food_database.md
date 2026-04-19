# Plan 5: Food Database

## Objective
Implement custom food database and manual food logging.

## Tasks

### 5.1 Food Model (models/food.py)
Fields:
- id (Integer, PK)
- user_id (Integer, FK, nullable for shared foods)
- name (String)
- calories (Integer)
- protein_g (Float)
- carbs_g (Float)
- fat_g (Float)
- created_at (DateTime)

### 5.2 Food Log Model (models/food_log.py)
Fields:
- id (Integer, PK)
- user_id (Integer, FK)
- food_name (String)
- calories (Integer)
- protein_g (Float)
- carbs_g (Float)
- fat_g (Float)
- date (Date)
- meal_type (String: 'breakfast', 'lunch', 'dinner', 'snack')
- created_at (DateTime)

### 5.3 Food Routes (routes/food.py)

**GET /api/food**
- Query param: q (search term)
- Returns: Foods matching search (user's foods + shared foods)
- Limit results to 20

**POST /api/food**
- Body: { "name": string, "calories": int, "protein_g": float, "carbs_g": float, "fat_g": float }
- Create custom food entry
- Returns: Created food

**GET /api/food/log**
- Query params: date (optional, default today)
- Returns: Food logs for user on specified date
- Include totals: total_calories, total_protein, total_carbs, total_fat

**POST /api/food/log**
- Body: { "food_name": string, "calories": int, "protein_g": float, "carbs_g": float, "fat_g": float, "date": "YYYY-MM-DD", "meal_type": string }
- Add food entry to daily log
- Returns: Created log entry

### 5.4 Daily Totals Calculation
Create utility to calculate daily totals:
- Sum calories, protein, carbs, fat from food logs
- Compare against daily calorie goal
- Calculate remaining calories

## Acceptance Criteria
- Users can create custom food entries
- Users can search food database
- Users can log foods by meal type
- Daily food log shows entries and totals
- Totals compare against calorie goal

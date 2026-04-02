# Plan 7: Dashboard & Aggregations

## Objective
Create dashboard endpoints that aggregate data from all tracking features.

## Tasks

### 7.1 Dashboard Routes (routes/dashboard.py)

**GET /api/dashboard/daily**
- Query param: date (optional, default today)
- Returns:
  ```json
  {
    "date": "2026-04-01",
    "calories": {
      "consumed": 1800,
      "goal": 2200,
      "remaining": 400,
      "burned_exercise": 350
    },
    "macros": {
      "protein": { "consumed": 120, "goal": 150 },
      "carbs": { "consumed": 180, "goal": 250 },
      "fat": { "consumed": 60, "goal": 70 }
    },
    "weight": {
      "current": 75.5,
      "change_from_yesterday": -0.3,
      "change_from_week_ago": -1.2
    },
    "exercises": [
      { "name": "running", "duration_min": 30, "calories": 280 },
      { "name": "cycling", "duration_min": 20, "calories": 170 }
    ],
    "meals": [
      { "meal_type": "breakfast", "calories": 450 },
      { "meal_type": "lunch", "calories": 680 },
      { "meal_type": "dinner", "calories": 670 }
    ]
  }
  ```

**GET /api/dashboard/weight-trend**
- Query params: days (optional, default 7)
- Returns: Array of weight entries for last N days
- Format: [{ "date": "YYYY-MM-DD", "weight_kg": 75.5 }]

**GET /api/dashboard/weekly-summary**
- Query param: week_start (optional)
- Returns: Weekly summary
  - Total calories consumed
  - Average daily calories
  - Total exercise calories burned
  - Average weight
  - Weight change

### 7.2 Aggregation Utilities
Create `utils/aggregations.py`:
- `get_daily_totals(user_id, date)` - Sum food logs for day
- `get_exercise_totals(user_id, date)` - Sum exercise calories for day
- `get_weight_trend(user_id, days)` - Get weight entries for period
- `calculate_macro_goals(calorie_goal)` - Calculate macro split based on calories

### 7.3 Macro Goal Calculation
Default split (adjustable):
- Protein: 30% of calories
- Carbs: 40% of calories
- Fat: 30% of calories

Convert to grams:
- Protein: 4 cal/g
- Carbs: 4 cal/g
- Fat: 9 cal/g

## Acceptance Criteria
- Dashboard endpoint aggregates all daily data
- Weight trend shows historical data
- Weekly summary provides overview
- Macro goals calculated from calorie goal
- All endpoints return properly formatted JSON

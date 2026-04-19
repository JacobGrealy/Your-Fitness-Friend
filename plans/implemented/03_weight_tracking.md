# Plan 3: Weight Tracking

## Objective
Implement weight logging and history functionality.

## Tasks

### 3.1 Weight Log Model (models/weight_log.py)
Fields:
- id (Integer, PK)
- user_id (Integer, FK to users)
- weight_kg (Float)
- date (Date, default today)
- notes (Text, nullable)
- created_at (DateTime)

### 3.2 Weight Routes (routes/weight.py)
Endpoints:

**GET /api/weight**
- Query params: start_date, end_date (optional)
- Returns: Array of weight logs for current user
- Order: by date descending

**POST /api/weight**
- Body: { "weight_kg": float, "date": "YYYY-MM-DD", "notes": string }
- Validates weight is positive number
- Sets date to today if not provided
- Returns: Created weight log

### 3.3 Weight Calculation Utilities
Create helper functions:
- `calculate_weight_trend()` - Calculate average weight over period
- `calculate_weight_change()` - Calculate change from first to last entry

### 3.4 Validation
- Weight must be positive number
- Date must be valid ISO format
- Weight logged by current user only

## Acceptance Criteria
- Users can log weight entries
- Weight history can be retrieved with optional date filtering
- Weight entries are user-specific
- Validation prevents invalid data
- Default date is today when not specified

# Add Food Screen — MyFitnessPal-Style Redesign

## Overview

Redesign the `/food/log` page from a simple dropdown form into a MyFitnessPal-style search-and-select interface with history, quick add, and a dedicated food detail screen.

## Scope

- Redesign LogFood page with search bar and history list
- Add FoodLogSelect screen for food detail + meal type + serving size
- Add Quick Add flow (with and without name)
- Add Food Photo action button (routes to existing photo log)
- Backend: new `brand`, `barcode_id` fields on Food; `serving_size` on FoodLog; new `/food/recent` endpoint

---

## Page Layout

The `/food/log` page is redesigned as a single scrollable screen with 3 zones:

### Top Zone (sticky)

```
┌─────────────────────────┐
│ [🔍  search...]         │  ← Search input (full width, debounced)
├─────────────────────────┤
│  [Quick Add] [Food Photo]│  ← Two action buttons
└─────────────────────────┘
```

- Search bar triggers typeahead with configurable debounce (default 300ms)
- Quick Add navigates to blank detail screen
- Food Photo navigates to existing `/food/photo-log`

### Middle Zone (scrollable)

**No search term:** Shows "Recent Foods" section from `GET /food/recent`.

**With search term:** Shows search results from `GET /food?q=term`, with matching history items prefixed (history first, then database matches).

### List Item Format

```
┌──────────────────────────────────────┐
│  Chicken Breast                      │
│  310 cal · USDA · 1 serving          │
└──────────────────────────────────────┘
```

- Top line: food name
- Bottom line: calories + brand (if present) + serving size
- Tapping a item navigates to `/food/log/select/:foodId`

---

## Food Detail Screen

Route: `/food/log/select/:foodId?` (foodId is optional for Quick Add)

```
┌─────────────────────────┐
│  ← Add Food      ✓      │  ← Header with back + checkmark submit
├─────────────────────────┤
│  Chicken Breast         │  ← Food name
│  310 cal · USDA         │  ← Calories + brand
├─────────────────────────┤
│  Meal Type              │
│  [ Breakfast ▼ ]        │  ← Dropdown: Breakfast, Lunch, Dinner, Snacks
├─────────────────────────┤
│  Serving Size           │
│  [  1.2      ] servings │  ← Number input, supports decimals
├─────────────────────────┤
│  Nutrition              │
│  372 cal · P:74g C:0g F:8g │
└─────────────────────────┘
```

- Nutrition auto-calculates based on serving size multiplier
- Checkmark submit is enabled when form is valid
- On success: navigate back to search page, refresh food logs

### Quick Add Flow

Same screen, but blank form:

- **With name:** Saves to Food DB, then logs to diary
- **Without name:** Logs directly to diary only (no DB entry), placeholder name in food_logs
- Only calories are required; name, protein, carbs, fat, brand, barcode_id are all optional

---

## Backend Changes

### 1. Food Model — New Fields

`app/models/food.py`:

```python
brand = db.Column(db.String(100), nullable=True, index=False)
barcode_id = db.Column(db.String(100), nullable=True, index=False)
```

Update `to_dict()` to include `brand` and `barcode_id`.

### 2. FoodLog Model — New Field

`app/models/food_log.py`:

```python
serving_size = db.Column(db.String(100), nullable=True)
```

Update `to_dict()` to include `serving_size`.

### 3. New Endpoint: GET /food/recent

Returns user's most recently logged foods grouped by name.

**Query params:**
- `days` (optional, default 7): time range in days

**Response:**

```json
[
  {
    "id": null,
    "food_name": "Chicken Breast",
    "calories": 165,
    "protein_g": 31.0,
    "carbs_g": 0.0,
    "fat_g": 3.6,
    "serving_size": "1 breast",
    "total_logs": 5,
    "last_logged": "2026-05-12"
  }
]
```

Note: `id` is `null` for foods not in the database (unnamed quick adds).

### 4. Update Existing Endpoints

- `POST /food`: accept `brand` and `barcode_id` in request body
- `POST /food/log`: accept `brand`, `barcode_id`, and `serving_size` in request body

---

## Frontend Changes

### 1. Redesign LogFood.tsx

Replace the dropdown form with:
- Sticky search bar (debounced typeahead)
- Action buttons row (Quick Add, Food Photo)
- Scrollable results/history list
- Each item is a clickable card

### 2. New FoodLogSelect.tsx

Full-screen detail page at `/food/log/select/:foodId?`:
- Food info display (name, calories, brand)
- Meal type dropdown
- Serving size number input (supports decimals)
- Auto-calculated nutrition display
- Checkmark submit in header

### 3. Store Updates

`foodStore.ts`:
- Add `recentFoods: FoodRecent[]` state
- Add `fetchRecentFoods(days?: number)` action
- Add `FoodRecent` type: `{ id, food_name, calories, protein_g, carbs_g, fat_g, serving_size, total_logs, last_logged }`

### 4. API Updates

`api/food.ts`:
- Add `getRecentFoods(days?: number)` method
- Update `createFood()` to pass `brand` and `barcode_id`
- Update `logFood()` to pass `brand`, `barcode_id`, and `serving_size`

### 5. Router Updates

`router.tsx`:
- Add route: `/food/log/select/:foodId?` → `FoodLogSelect`

### 6. Constants

New configurable constants (e.g., in `utils/constants.ts`):
- `SEARCH_DEBOUNCE_MS = 300`
- `RECENT_FOODS_DAYS = 7`
- `SEARCH_RESULTS_LIMIT = 15`

---

## Data Flow

### Logging a food from search/history:
1. User taps food → navigates to detail screen with food pre-loaded
2. User adjusts serving size → nutrition updates in real-time
3. User selects meal type
4. User taps ✓ → `POST /food/log` with food_id + quantity + meal_type
5. On success → navigate back, refresh logs

### Quick Add (with name):
1. User taps "Quick Add" → navigates to blank detail screen
2. User enters name, calories (required), optional macros/brand/barcode_id
3. User taps ✓ → `POST /food` (save to DB) + `POST /food/log` (log it)
4. On success → navigate back

### Quick Add (without name):
1. User taps "Quick Add" → blank detail screen
2. User enters calories (required), optional macros
3. User taps ✓ → `POST /food/log` directly (no DB entry)
4. On success → navigate back

---

## Error Handling

- Network errors → toast notification via `useUIStore.showToast()`
- Validation errors (e.g., calories ≤ 0) → inline error below the field
- Empty search → shows "Recent Foods" section
- No recent foods → shows empty state with message

---

## Migration

A new migration file will be created to add the three new columns:
- `foods.brand` (String, nullable)
- `foods.barcode_id` (String, nullable)
- `food_logs.serving_size` (String, nullable)

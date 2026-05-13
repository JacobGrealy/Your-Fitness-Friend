# Add Food Screen — MyFitnessPal-Style Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `/food/log` page from a dropdown form into a MyFitnessPal-style search-and-select interface with history, quick add, and a dedicated food detail screen.

**Architecture:** Backend adds optional `brand`, `barcode_id` fields to Food, `serving_size` to FoodLog, and a new `/food/recent` endpoint. Frontend replaces `LogFood.tsx` with a search bar + action buttons + results/history list. Tapping a food navigates to a new `FoodLogSelect.tsx` detail screen for serving size + meal type selection. Quick Add opens a blank detail form.

**Tech Stack:** Python 3, Flask, SQLAlchemy, React 18, TypeScript, Tailwind CSS, Zustand, react-hook-form, zod, date-fns

---

## Files to Modify/Create

| Action | File |
|--------|------|
| Modify | `app/models/food.py` — add `brand`, `barcode_id` fields |
| Modify | `app/models/food_log.py` — add `serving_size` field |
| Modify | `app/routes/food_routes.py` — add `GET /food/recent`, update POST endpoints |
| Create | `migrations/versions/<hash>_add_food_brand_barcode_serving_size.py` |
| Modify | `frontend/src/utils/constants.ts` — add configurable constants |
| Modify | `frontend/src/types/food.ts` — add `FoodRecent` type, update existing types |
| Modify | `frontend/src/types/index.ts` — export `FoodRecent` |
| Modify | `frontend/src/api/food.ts` — add `getRecentFoods`, update existing methods |
| Modify | `frontend/src/store/foodStore.ts` — add `recentFoods` state, `fetchRecentFoods` action |
| Create | `frontend/src/pages/Food/FoodLogSelect.tsx` — new detail screen |
| Modify | `frontend/src/pages/Food/LogFood.tsx` — complete redesign |
| Modify | `frontend/src/pages/Food/index.ts` — export `FoodLogSelect` |
| Modify | `frontend/src/router.tsx` — add `/food/log/select/:foodId?` route |
| Modify | `frontend/src/utils/schemas.ts` — add `quickAddFoodSchema` |

---

# Task 1: Backend — Add `brand` and `barcode_id` to Food Model

**Files:**
- Modify: `app/models/food.py`

- [ ] **Step 1: Add `brand` and `barcode_id` fields to Food model**

Open `app/models/food.py`. Add two fields after `fat_g`:

```python
brand = db.Column(db.String(100), nullable=True)
barcode_id = db.Column(db.String(100), nullable=True)
```

Update the `to_dict()` method to include these fields:

```python
def to_dict(self):
    return {
        'id': self.id,
        'user_id': self.user_id,
        'name': self.name,
        'calories': self.calories,
        'protein_g': self.protein_g,
        'carbs_g': self.carbs_g,
        'fat_g': self.fat_g,
        'brand': self.brand,
        'barcode_id': self.barcode_id,
        'created_at': self.created_at.isoformat() if self.created_at else None
    }
```

- [ ] **Step 2: Commit**

```bash
git add app/models/food.py
git commit -m "backend: add brand and barcode_id fields to Food model"
```

---

# Task 2: Backend — Add `serving_size` to FoodLog Model

**Files:**
- Modify: `app/models/food_log.py`

- [ ] **Step 1: Add `serving_size` field to FoodLog model**

Open `app/models/food_log.py`. Add a field after `fat_g`:

```python
serving_size = db.Column(db.String(100), nullable=True)
```

Update the `to_dict()` method to include this field:

```python
def to_dict(self):
    return {
        'id': self.id,
        'user_id': self.user_id,
        'food_name': self.food_name,
        'calories': self.calories,
        'protein_g': self.protein_g,
        'carbs_g': self.carbs_g,
        'fat_g': self.fat_g,
        'serving_size': self.serving_size,
        'date': self.date.isoformat() if self.date else None,
        'meal_type': self.meal_type,
        'created_at': self.created_at.isoformat() if self.created_at else None
    }
```

- [ ] **Step 2: Commit**

```bash
git add app/models/food_log.py
git commit -m "backend: add serving_size field to FoodLog model"
```

---

# Task 3: Backend — Add `GET /food/recent` Endpoint

**Files:**
- Modify: `app/routes/food_routes.py`

- [ ] **Step 1: Add the recent foods endpoint**

Add this function before the `@bp.route('', methods=['POST'])` decorator (around line 43):

```python
from datetime import timedelta


@bp.route('/recent', methods=['GET'])
@login_required
def get_recent_foods():
    """Get user's recently logged foods, grouped by food name."""
    days = request.args.get('days', 7, type=int)
    cutoff_date = datetime.utcnow().date() - timedelta(days=days)

    logs = FoodLog.query.filter(
        FoodLog.user_id == current_user.id,
        FoodLog.date >= cutoff_date
    ).order_by(FoodLog.date.desc()).all()

    # Group by food_name, keeping the most recent macros
    grouped = {}
    for log in logs:
        key = log.food_name
        if key not in grouped:
            grouped[key] = {
                'food_name': log.food_name,
                'calories': log.calories,
                'protein_g': log.protein_g,
                'carbs_g': log.carbs_g,
                'fat_g': log.fat_g,
                'serving_size': log.serving_size,
                'total_logs': 0,
                'last_logged': log.date.isoformat(),
            }
        grouped[key]['total_logs'] += 1
        # Keep the latest macros (already sorted by date desc)

    result = list(grouped.values())
    # Sort by last_logged descending
    result.sort(key=lambda x: x['last_logged'], reverse=True)

    return jsonify(result), 200
```

- [ ] **Step 2: Commit**

```bash
git add app/routes/food_routes.py
git commit -m "backend: add GET /food/recent endpoint for history"
```

---

# Task 4: Backend — Update POST Endpoints to Accept New Fields

**Files:**
- Modify: `app/routes/food_routes.py`

- [ ] **Step 1: Update `create_food` to accept `brand` and `barcode_id`**

Find the `create_food` function. Update where it gets data:

```python
name = data.get('name')
calories = data.get('calories')
protein_g = data.get('protein_g', 0.0)
carbs_g = data.get('carbs_g', 0.0)
fat_g = data.get('fat_g', 0.0)
brand = data.get('brand')
barcode_id = data.get('barcode_id')
```

Update the Food creation:

```python
food = Food(
    user_id=current_user.id,
    name=name,
    calories=calories,
    protein_g=protein_g,
    carbs_g=carbs_g,
    fat_g=fat_g,
    brand=brand,
    barcode_id=barcode_id
)
```

Update the response JSON to include `brand` and `barcode_id`:

```python
return jsonify({
    'id': food.id,
    'user_id': food.user_id,
    'name': food.name,
    'calories': food.calories,
    'protein_g': food.protein_g,
    'carbs_g': food.carbs_g,
    'fat_g': food.fat_g,
    'brand': food.brand,
    'barcode_id': food.barcode_id,
}), 201
```

- [ ] **Step 2: Update `create_food_log` to accept `brand`, `barcode_id`, and `serving_size`**

Find the `create_food_log` function. Add these lines after `meal_type = data.get('meal_type')`:

```python
brand = data.get('brand')
barcode_id = data.get('barcode_id')
serving_size = data.get('serving_size')
```

Update the FoodLog creation:

```python
food_log = FoodLog(
    user_id=current_user.id,
    food_name=food_name,
    calories=calories,
    protein_g=protein_g,
    carbs_g=carbs_g,
    fat_g=fat_g,
    serving_size=serving_size,
    date=log_date,
    meal_type=meal_type
)
```

Update the response JSON:

```python
return jsonify({
    'id': food_log.id,
    'food_name': food_log.food_name,
    'calories': food_log.calories,
    'protein_g': food_log.protein_g,
    'carbs_g': food_log.carbs_g,
    'fat_g': food_log.fat_g,
    'serving_size': food_log.serving_size,
    'date': food_log.date.isoformat(),
    'meal_type': food_log.meal_type
}), 201
```

- [ ] **Step 3: Commit**

```bash
git add app/routes/food_routes.py
git commit -m "backend: accept brand, barcode_id, serving_size in POST endpoints"
```

---

# Task 5: Backend — Create Database Migration

**Files:**
- Create: `migrations/versions/<hash>_add_food_brand_barcode_serving_size.py`

- [ ] **Step 1: Generate migration with Alembic**

Run from the project root:

```bash
cd /home/angrygiant/github_projects/FitnessFriend && ./venv/bin/flask db migrate -m "add food brand barcode_id and food_log serving_size"
```

This will create a migration file in `migrations/versions/`. Verify the generated migration includes:
- `op.add_column('foods', sa.Column('brand', sa.String(length=100), nullable=True))`
- `op.add_column('foods', sa.Column('barcode_id', sa.String(length=100), nullable=True))`
- `op.add_column('food_logs', sa.Column('serving_size', sa.String(length=100), nullable=True))`
- `op.create_index(op.f('ix_food_logs_user_id_date'), 'food_logs', ['user_id', 'date'], unique=False)` — composite index

- [ ] **Step 2: Run the migration**

```bash
./venv/bin/flask db upgrade
```

- [ ] **Step 3: Commit**

```bash
git add migrations/versions/
git commit -m "backend: migration for food brand, barcode_id, and serving_size fields"
```

---

# Task 6: Frontend — Add Constants and Types

**Files:**
- Modify: `frontend/src/utils/constants.ts`
- Modify: `frontend/src/types/food.ts`
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Add configurable constants**

Append to `frontend/src/utils/constants.ts`:

```typescript
export const SEARCH_DEBOUNCE_MS = 300
export const RECENT_FOODS_DAYS = 7
export const SEARCH_RESULTS_LIMIT = 15
```

- [ ] **Step 2: Add `FoodRecent` type**

Append to `frontend/src/types/food.ts`:

```typescript
/**
 * Summary of a recently logged food, grouped by name.
 */
export interface FoodRecent {
  food_name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  serving_size: string | null
  total_logs: number
  last_logged: string
}
```

- [ ] **Step 3: Export `FoodRecent` from barrel**

In `frontend/src/types/index.ts`, add to the food exports section:

```typescript
export type {
  Food,
  FoodLog,
  DailyTotals,
  FoodCreate,
  FoodLogCreate,
  FoodSearch,
  MacroGoals,
  MealType,
  FoodRecent,
} from './food'
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/utils/constants.ts frontend/src/types/food.ts frontend/src/types/index.ts
git commit -m "frontend: add constants and FoodRecent type for search/history"
```

---

# Task 7: Frontend — Add API Methods for Recent Foods and New Fields

**Files:**
- Modify: `frontend/src/api/food.ts`

- [ ] **Step 1: Add `getRecentFoods` method**

Append to the `foodApi` object in `frontend/src/api/food.ts`:

```typescript
  getRecentFoods: (days?: number) =>
    api.get<FoodRecent[]>('/food/recent', { params: { days } }).then(res => res.data),
```

- [ ] **Step 2: Update `createFood` to pass brand/barcode_id**

The existing `createFood` already passes the full `FoodCreate` object, so no changes needed here — the new fields will flow through automatically once we update the type.

- [ ] **Step 3: Update `logFood` to pass brand/barcode_id/serving_size**

The existing `logFood` already passes the full `FoodLogCreate` object, so no changes needed here either.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/food.ts
git commit -m "frontend: add getRecentFoods API method"
```

---

# Task 8: Frontend — Update Store with Recent Foods State

**Files:**
- Modify: `frontend/src/store/foodStore.ts`

- [ ] **Step 1: Add imports and state**

Update the imports at the top of `frontend/src/store/foodStore.ts`:

```typescript
import { create } from 'zustand'
import { foodApi } from '@/api/food'
import type { Food, FoodLog, DailyTotals, FoodCreate, FoodLogCreate, FoodSearch, MacroGoals, FoodRecent } from '@/types'
import { useUIStore } from './uiStore'
import { RECENT_FOODS_DAYS } from '@/utils/constants'
```

Add `recentFoods: FoodRecent[]` to the interface:

```typescript
interface FoodState {
  foods: Food[]
  recentFoods: FoodRecent[]
  foodLogs: FoodLog[]
  dailyTotals: DailyTotals | null
  macroGoals: MacroGoals | null
  isLoading: boolean
  error: string | null
  fetchFoods: (params?: FoodSearch) => Promise<void>
  fetchRecentFoods: (days?: number) => Promise<void>
  fetchFoodLogs: (date?: string) => Promise<void>
  fetchDailyTotals: (date?: string) => Promise<void>
  fetchMacroGoals: () => Promise<void>
  createFood: (data: FoodCreate) => Promise<void>
  logFood: (data: FoodLogCreate) => Promise<void>
  deleteFood: (id: string) => Promise<void>
  deleteFoodLog: (id: string) => Promise<void>
  setMacroGoals: (goals: MacroGoals) => Promise<void>
  clearError: () => void
}
```

Add initial state:

```typescript
export const useFoodStore = create<FoodState>((set, get) => ({
  foods: [],
  recentFoods: [],
  foodLogs: [],
```

- [ ] **Step 2: Add `fetchRecentFoods` action**

Add this method inside the store object (after `fetchFoods`):

```typescript
  fetchRecentFoods: async (days?: number) => {
    set({ isLoading: true, error: null })
    try {
      const daysParam = days ?? RECENT_FOODS_DAYS
      const recentFoods = await foodApi.getRecentFoods(daysParam)
      set({ recentFoods, isLoading: false })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch recent foods',
        isLoading: false,
      })
    }
  },
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/store/foodStore.ts
git commit -m "frontend: add recent foods state and fetchRecentFoods action"
```

---

# Task 9: Frontend — Add Quick Add Validation Schema

**Files:**
- Modify: `frontend/src/utils/schemas.ts`

- [ ] **Step 1: Add `quickAddFoodSchema`**

Append to `frontend/src/utils/schemas.ts`:

```typescript
export const quickAddFoodSchema = z.object({
  name: z.string().optional(),
  calories: z.coerce.number()
    .refine((val) => !Number.isNaN(val), { message: 'Expected number, received nan' })
    .pipe(z.number().positive('Calories must be a positive number')),
  protein_g: z.coerce.number()
    .refine((val) => !Number.isNaN(val), { message: 'Expected number, received nan' })
    .pipe(z.number().nonnegative('Protein must be a non-negative number'))
    .optional(),
  carbs_g: z.coerce.number()
    .refine((val) => !Number.isNaN(val), { message: 'Expected number, received nan' })
    .pipe(z.number().nonnegative('Carbs must be a non-negative number'))
    .optional(),
  fat_g: z.coerce.number()
    .refine((val) => !Number.isNaN(val), { message: 'Expected number, received nan' })
    .pipe(z.number().nonnegative('Fat must be a non-negative number'))
    .optional(),
  brand: z.string().max(100, 'Brand must be at most 100 characters').optional(),
  barcode_id: z.string().max(100, 'Barcode ID must be at most 100 characters').optional(),
  serving_size: z.string().optional(),
  meal_type: z.union([
    z.literal('breakfast'),
    z.literal('lunch'),
    z.literal('dinner'),
    z.literal('snack'),
  ]),
})
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/utils/schemas.ts
git commit -m "frontend: add quickAddFoodSchema validation"
```

---

# Task 10: Frontend — Create FoodLogSelect Detail Screen

**Files:**
- Create: `frontend/src/pages/Food/FoodLogSelect.tsx`

- [ ] **Step 1: Create the full component**

Create `frontend/src/pages/Food/FoodLogSelect.tsx`:

```typescript
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFoodStore } from '@/store/foodStore'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import type { Food, FoodLogCreate } from '@/types'
import { MEAL_TYPES } from '@/utils/constants'
import { formatMacros } from '@/utils/formatters'
import { quickAddFoodSchema } from '@/utils/schemas'
import Button from '@/components/common/Button'
import Loading from '@/components/common/Loading'

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
}

export default function FoodLogSelect() {
  const { setTitle } = usePageTitle()
  const navigate = useNavigate()
  const location = useLocation()
  const { foodId } = useParams<{ foodId?: string }>()
  const { foods, isLoading, logFood, createFood, fetchFoods, error, clearError } = useFoodStore()

  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const [isQuickAdd, setIsQuickAdd] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [mealType, setMealType] = useState('breakfast')
  const [servingSize, setServingSize] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors: formErrors },
    watch,
  } = useForm({
    resolver: zodResolver(quickAddFoodSchema),
    defaultValues: {
      name: '',
      calories: undefined,
      protein_g: undefined,
      carbs_g: undefined,
      fat_g: undefined,
      brand: '',
      barcode_id: '',
      serving_size: '',
      meal_type: 'breakfast',
    },
  })

  const name = watch('name')
  const calories = watch('calories')
  const protein_g = watch('protein_g') || 0
  const carbs_g = watch('carbs_g') || 0
  const fat_g = watch('fat_g') || 0
  const brand = watch('brand')
  const barcode_id = watch('barcode_id')
  const meal_type = watch('meal_type')

  useEffect(() => {
    setTitle('Add Food')
    clearError()

    if (foodId) {
      const food = foods.find(f => String(f.id) === foodId)
      if (food) {
        setSelectedFood(food)
        setValue('name', food.name)
        setValue('calories', food.calories)
        setValue('protein_g', food.protein_g)
        setValue('carbs_g', food.carbs_g)
        setValue('fat_g', food.fat_g)
        setValue('brand', food.brand || '')
        setValue('barcode_id', food.barcode_id || '')
      } else {
        fetchFoods()
      }
    } else {
      setIsQuickAdd(true)
    }
  }, [foodId, fetchFoods, clearError, setValue])

  const handleFoodSelect = useCallback((food: Food) => {
    setSelectedFood(food)
    setValue('name', food.name)
    setValue('calories', food.calories)
    setValue('protein_g', food.protein_g)
    setValue('carbs_g', food.carbs_g)
    setValue('fat_g', food.fat_g)
    setValue('brand', food.brand || '')
    setValue('barcode_id', food.barcode_id || '')
  }, [setValue])

  const handleAddFromList = async (food: Food) => {
    setSelectedFood(food)
    setIsQuickAdd(false)
    setValue('name', food.name)
    setValue('calories', food.calories)
    setValue('protein_g', food.protein_g)
    setValue('carbs_g', food.carbs_g)
    setValue('fat_g', food.fat_g)
    setValue('brand', food.brand || '')
    setValue('barcode_id', food.barcode_id || '')
  }

  const onSubmit = async (data: any) => {
    setIsSubmitting(true)
    try {
      const quantityNum = parseFloat(servingSize) || 1

      if (data.name && !selectedFood) {
        // Save to DB first, then log
        const foodCreate = {
          name: data.name,
          calories: data.calories,
          protein_g: data.protein_g || 0,
          carbs_g: data.carbs_g || 0,
          fat_g: data.fat_g || 0,
          serving_size: data.serving_size || '',
          brand: data.brand || undefined,
          barcode_id: data.barcode_id || undefined,
        }
        await createFood(foodCreate)
        fetchFoods()
      }

      // Log the food
      const logData: FoodLogCreate = {
        food_id: selectedFood ? String(selectedFood.id) : undefined,
        quantity: quantityNum,
        food_name: data.name || 'Quick Add',
        calories: Math.round(data.calories * quantityNum),
        protein_g: (data.protein_g || 0) * quantityNum,
        carbs_g: (data.carbs_g || 0) * quantityNum,
        fat_g: (data.fat_g || 0) * quantityNum,
        meal_type: meal_type as FoodLogCreate['meal_type'],
        serving_size: data.serving_size || '',
        brand: data.brand || undefined,
        barcode_id: data.barcode_id || undefined,
      }

      await logFood(logData)
      navigate('/food/log')
    } catch {
      // Error handled by store
    } finally {
      setIsSubmitting(false)
    }
  }

  const calculateNutrition = () => {
    const qty = parseFloat(servingSize) || 1
    return {
      calories: Math.round(calories * qty),
      protein: (protein_g * qty).toFixed(1),
      carbs: (carbs_g * qty).toFixed(1),
      fat: (fat_g * qty).toFixed(1),
    }
  }

  if (isLoading && !selectedFood && !isQuickAdd) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex justify-center py-12">
        <Loading text="Loading food..." />
      </div>
    )
  }

  const nutrition = calculateNutrition()

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      {/* Header */}
      <div className="bg-white border-b border-[#e0e0e0] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="text-[#185ADB] text-sm font-medium"
        >
          ← Back
        </button>
        <h1 className="font-bold text-[#212121]">
          {selectedFood ? selectedFood.name : 'Quick Add'}
        </h1>
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting || !calories}
          className="text-[#185ADB] disabled:opacity-30"
          aria-label="Submit"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {/* Food Info */}
      <div className="bg-white px-4 py-3 border-b border-[#e0e0e0]">
        <h2 className="font-bold text-lg text-[#212121]">
          {selectedFood?.name || name || 'Unnamed Food'}
        </h2>
        <p className="text-sm text-[#757575] mt-1">
          {calories} cal{selectedFood?.brand || brand ? ` · ${selectedFood?.brand || brand}` : ''}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
        {/* Meal Type */}
        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium text-[#212121] mb-2">
            Meal Type
          </label>
          <div className="flex gap-1">
            {MEAL_TYPES.map(meal => (
              <button
                key={meal}
                type="button"
                onClick={() => setMealType(meal)}
                className={`flex-1 py-2 px-2 text-xs font-medium rounded-md transition-colors ${
                  mealType === meal
                    ? 'bg-[#185ADB] text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {MEAL_LABELS[meal]}
              </button>
            ))}
          </div>
        </div>

        {/* Serving Size */}
        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium text-[#212121] mb-2">
            Serving Size
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={servingSize}
              onChange={(e) => setServingSize(e.target.value)}
              placeholder="e.g. 1.5"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
            />
            <span className="text-sm text-[#757575]">servings</span>
          </div>
          {formErrors.serving_size && (
            <p className="mt-1 text-xs text-[#E53935]">{formErrors.serving_size.message}</p>
          )}
        </div>

        {/* Nutrition */}
        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium text-[#212121] mb-2">
            Nutrition
          </label>
          <div className="text-sm text-[#757575]">
            <span className="font-medium text-[#212121]">{nutrition.calories}</span> cal ·
            P:{nutrition.protein}g C:{nutrition.carbs}g F:{nutrition.fat}g
          </div>
        </div>

        {/* Quick Add Fields */}
        {isQuickAdd && (
          <>
            <div className="bg-white rounded-lg p-4">
              <label className="block text-sm font-medium text-[#212121] mb-2">
                Food Name (optional)
              </label>
              <input
                {...register('name')}
                placeholder="e.g. Banana"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
              />
              {formErrors.name && (
                <p className="mt-1 text-xs text-[#E53935]">{formErrors.name.message}</p>
              )}
            </div>

            <div className="bg-white rounded-lg p-4">
              <label className="block text-sm font-medium text-[#212121] mb-2">
                Calories *
              </label>
              <input
                type="number"
                min="1"
                {...register('calories')}
                placeholder="e.g. 105"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
              />
              {formErrors.calories && (
                <p className="mt-1 text-xs text-[#E53935]">{formErrors.calories.message}</p>
              )}
            </div>

            <div className="bg-white rounded-lg p-4">
              <label className="block text-sm font-medium text-[#212121] mb-2">
                Protein (g)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                {...register('protein_g')}
                placeholder="e.g. 1.3"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
              />
              {formErrors.protein_g && (
                <p className="mt-1 text-xs text-[#E53935]">{formErrors.protein_g.message}</p>
              )}
            </div>

            <div className="bg-white rounded-lg p-4">
              <label className="block text-sm font-medium text-[#212121] mb-2">
                Carbs (g)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                {...register('carbs_g')}
                placeholder="e.g. 27"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
              />
              {formErrors.carbs_g && (
                <p className="mt-1 text-xs text-[#E53935]">{formErrors.carbs_g.message}</p>
              )}
            </div>

            <div className="bg-white rounded-lg p-4">
              <label className="block text-sm font-medium text-[#212121] mb-2">
                Fat (g)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                {...register('fat_g')}
                placeholder="e.g. 0.4"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
              />
              {formErrors.fat_g && (
                <p className="mt-1 text-xs text-[#E53935]">{formErrors.fat_g.message}</p>
              )}
            </div>

            <div className="bg-white rounded-lg p-4">
              <label className="block text-sm font-medium text-[#212121] mb-2">
                Brand (optional)
              </label>
              <input
                {...register('brand')}
                placeholder="e.g. USDA"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
              />
            </div>

            <div className="bg-white rounded-lg p-4">
              <label className="block text-sm font-medium text-[#212121] mb-2">
                Barcode ID (optional)
              </label>
              <input
                {...register('barcode_id')}
                placeholder="e.g. 012345678901"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
              />
            </div>
          </>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-[#E53935]">{error}</p>
          </div>
        )}
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Food/FoodLogSelect.tsx
git commit -m "frontend: add FoodLogSelect detail screen for serving size and meal type"
```

---

# Task 11: Frontend — Redesign LogFood Page

**Files:**
- Modify: `frontend/src/pages/Food/LogFood.tsx`
- Modify: `frontend/src/pages/Food/index.ts`

- [ ] **Step 1: Replace LogFood.tsx with the new design**

Replace the entire contents of `frontend/src/pages/Food/LogFood.tsx`:

```typescript
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFoodStore } from '@/store/foodStore'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import type { Food, FoodRecent } from '@/types'
import { SEARCH_DEBOUNCE_MS, RECENT_FOODS_DAYS } from '@/utils/constants'
import { formatMacros } from '@/utils/formatters'
import Button from '@/components/common/Button'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'

export default function LogFood() {
  const { setTitle } = usePageTitle()
  const navigate = useNavigate()
  const { foods, recentFoods, isLoading, error, fetchFoods, fetchRecentFoods, clearError } = useFoodStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Food[]>([])
  const [historyResults, setHistoryResults] = useState<FoodRecent[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    setTitle('Add Food')
    fetchFoods()
    fetchRecentFoods()
    clearError()
  }, [fetchFoods, fetchRecentFoods, clearError])

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      if (!term.trim()) {
        setSearchResults([])
        setHistoryResults([])
        setShowSearchResults(false)
        return
      }

      const filtered = foods.filter(f =>
        f.name.toLowerCase().includes(term.toLowerCase())
      ).slice(0, 15)

      const matchingHistory = recentFoods.filter(h =>
        h.food_name.toLowerCase().includes(term.toLowerCase())
      )

      setSearchResults(filtered)
      setHistoryResults(matchingHistory)
      setShowSearchResults(true)
    }, SEARCH_DEBOUNCE_MS)
  }, [foods, recentFoods])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleSearch(e.target.value)
  }

  const handleClearSearch = () => {
    setSearchTerm('')
    setSearchResults([])
    setHistoryResults([])
    setShowSearchResults(false)
  }

  const handleFoodTap = (food: Food) => {
    navigate(`/food/log/select/${food.id}`)
  }

  const handleQuickAdd = () => {
    navigate('/food/log/select')
  }

  const handleFoodPhoto = () => {
    navigate('/food/photo-log')
  }

  if (isLoading && foods.length === 0 && recentFoods.length === 0) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex justify-center py-12">
        <Loading text="Loading..." />
      </div>
    )
  }

  const displayItems = showSearchResults
    ? [
        ...historyResults,
        ...searchResults.map(f => ({ ...f, _type: 'food' as const })),
      ]
    : recentFoods.map(h => ({ ...h, _type: 'history' as const }))

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      {/* Sticky Top Zone */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#e0e0e0]">
        {/* Search Bar */}
        <div className="px-4 py-3">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={handleInputChange}
              onFocus={() => searchTerm && setShowSearchResults(true)}
              placeholder="Search foods..."
              className="w-full pl-10 pr-10 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-3 flex gap-2">
          <Button size="sm" onClick={handleQuickAdd}>
            Quick Add
          </Button>
          <Button size="sm" variant="outline" onClick={handleFoodPhoto}>
            Food Photo
          </Button>
        </div>
      </div>

      {/* Scrollable Results/History Zone */}
      <div className="px-4 py-3 space-y-2">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-[#E53935]">{error}</p>
          </div>
        )}

        {!showSearchResults && recentFoods.length === 0 && (
          <EmptyState
            title="No recent foods"
            description="Foods you log will appear here for quick re-adding."
          />
        )}

        {showSearchResults && searchResults.length === 0 && historyResults.length === 0 && (
          <EmptyState
            title="No results"
            description="Try a different search term."
          />
        )}

        {showSearchResults && searchTerm && (
          <h2 className="text-sm font-medium text-[#757575] mt-2">
            Search Results
          </h2>
        )}

        {!showSearchResults && recentFoods.length > 0 && (
          <h2 className="text-sm font-medium text-[#757575] mt-2">
            Recent Foods
          </h2>
        )}

        {displayItems.map((item, index) => {
          if (item._type === 'food') {
            const food = item as Food & { _type: 'food' }
            return (
              <button
                key={food.id}
                onClick={() => handleFoodTap(food)}
                className="w-full bg-white rounded-lg p-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-sm text-[#212121]">{food.name}</div>
                <div className="text-xs text-[#757575] mt-0.5">
                  {food.calories} cal{food.brand ? ` · ${food.brand}` : ''}
                </div>
              </button>
            )
          }

          const history = item as FoodRecent & { _type: 'history' }
          return (
            <button
              key={`${history.food_name}-${index}`}
              onClick={() => handleFoodTap({
                id: history.food_name,
                name: history.food_name,
                calories: history.calories,
                protein_g: history.protein_g,
                carbs_g: history.carbs_g,
                fat_g: history.fat_g,
                brand: null,
                barcode_id: null,
                user_id: '',
                created_at: '',
              })}
              className="w-full bg-white rounded-lg p-3 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-sm text-[#212121]">{history.food_name}</div>
              <div className="text-xs text-[#757575] mt-0.5">
                {history.calories} cal · {history.total_logs} log{history.total_logs > 1 ? 's' : ''}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

Wait — the above has an issue. The history items don't have a real `id` to navigate to. Let me revise the approach: history items should navigate to the detail screen with the food name pre-filled (not from DB). Let me fix this:

```typescript
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFoodStore } from '@/store/foodStore'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import type { Food, FoodRecent } from '@/types'
import { SEARCH_DEBOUNCE_MS, RECENT_FOODS_DAYS } from '@/utils/constants'
import Button from '@/components/common/Button'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'

export default function LogFood() {
  const { setTitle } = usePageTitle()
  const navigate = useNavigate()
  const { foods, recentFoods, isLoading, error, fetchFoods, fetchRecentFoods, clearError } = useFoodStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Food[]>([])
  const [historyResults, setHistoryResults] = useState<FoodRecent[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    setTitle('Add Food')
    fetchFoods()
    fetchRecentFoods()
    clearError()
  }, [fetchFoods, fetchRecentFoods, clearError])

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      if (!term.trim()) {
        setSearchResults([])
        setHistoryResults([])
        setShowSearchResults(false)
        return
      }

      const filtered = foods.filter(f =>
        f.name.toLowerCase().includes(term.toLowerCase())
      ).slice(0, 15)

      const matchingHistory = recentFoods.filter(h =>
        h.food_name.toLowerCase().includes(term.toLowerCase())
      )

      setSearchResults(filtered)
      setHistoryResults(matchingHistory)
      setShowSearchResults(true)
    }, SEARCH_DEBOUNCE_MS)
  }, [foods, recentFoods])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleSearch(e.target.value)
  }

  const handleClearSearch = () => {
    setSearchTerm('')
    setSearchResults([])
    setHistoryResults([])
    setShowSearchResults(false)
  }

  const handleFoodTap = (food: Food) => {
    navigate(`/food/log/select/${food.id}`)
  }

  const handleHistoryTap = (history: FoodRecent) => {
    // Navigate to detail screen with food name from history
    navigate(`/food/log/select?name=${encodeURIComponent(history.food_name)}&calories=${history.calories}&protein=${history.protein_g}&carbs=${history.carbs_g}&fat=${history.fat_g}`)
  }

  const handleQuickAdd = () => {
    navigate('/food/log/select')
  }

  const handleFoodPhoto = () => {
    navigate('/food/photo-log')
  }

  if (isLoading && foods.length === 0 && recentFoods.length === 0) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex justify-center py-12">
        <Loading text="Loading..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      {/* Sticky Top Zone */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#e0e0e0]">
        {/* Search Bar */}
        <div className="px-4 py-3">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={handleInputChange}
              onFocus={() => searchTerm && setShowSearchResults(true)}
              placeholder="Search foods..."
              className="w-full pl-10 pr-10 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-3 flex gap-2">
          <Button size="sm" onClick={handleQuickAdd}>
            Quick Add
          </Button>
          <Button size="sm" variant="outline" onClick={handleFoodPhoto}>
            Food Photo
          </Button>
        </div>
      </div>

      {/* Scrollable Results/History Zone */}
      <div className="px-4 py-3 space-y-2">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-[#E53935]">{error}</p>
          </div>
        )}

        {!showSearchResults && recentFoods.length === 0 && (
          <EmptyState
            title="No recent foods"
            description="Foods you log will appear here for quick re-adding."
          />
        )}

        {showSearchResults && searchResults.length === 0 && historyResults.length === 0 && (
          <EmptyState
            title="No results"
            description="Try a different search term."
          />
        )}

        {showSearchResults && searchTerm && (
          <h2 className="text-sm font-medium text-[#757575] mt-2">
            Search Results
          </h2>
        )}

        {!showSearchResults && recentFoods.length > 0 && (
          <h2 className="text-sm font-medium text-[#757575] mt-2">
            Recent Foods
          </h2>
        )}

        {displayItems.map((item, index) => {
          if (item._type === 'food') {
            const food = item as Food & { _type: 'food' }
            return (
              <button
                key={food.id}
                onClick={() => handleFoodTap(food)}
                className="w-full bg-white rounded-lg p-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-sm text-[#212121]">{food.name}</div>
                <div className="text-xs text-[#757575] mt-0.5">
                  {food.calories} cal{food.brand ? ` · ${food.brand}` : ''}
                </div>
              </button>
            )
          }

          const history = item as FoodRecent & { _type: 'history' }
          return (
            <button
              key={`${history.food_name}-${index}`}
              onClick={() => handleHistoryTap(history)}
              className="w-full bg-white rounded-lg p-3 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-sm text-[#212121]">{history.food_name}</div>
              <div className="text-xs text-[#757575] mt-0.5">
                {history.calories} cal · {history.total_logs} log{history.total_logs > 1 ? 's' : ''}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

Hmm, this is getting complex with the union type. Let me simplify — I'll define a proper union type and use a simpler approach:

Actually, let me provide the clean final version. The key insight: history items navigate to `/food/log/select` with query params. The detail screen will read query params and pre-fill the form.

Here's the final `LogFood.tsx`:

```typescript
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFoodStore } from '@/store/foodStore'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import type { Food, FoodRecent } from '@/types'
import { SEARCH_DEBOUNCE_MS } from '@/utils/constants'
import Button from '@/components/common/Button'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'

export default function LogFood() {
  const { setTitle } = usePageTitle()
  const navigate = useNavigate()
  const { foods, recentFoods, isLoading, error, fetchFoods, fetchRecentFoods, clearError } = useFoodStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Food[]>([])
  const [historyResults, setHistoryResults] = useState<FoodRecent[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    setTitle('Add Food')
    fetchFoods()
    fetchRecentFoods()
    clearError()
  }, [fetchFoods, fetchRecentFoods, clearError])

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      if (!term.trim()) {
        setSearchResults([])
        setHistoryResults([])
        setShowSearchResults(false)
        return
      }

      const filtered = foods.filter(f =>
        f.name.toLowerCase().includes(term.toLowerCase())
      ).slice(0, 15)

      const matchingHistory = recentFoods.filter(h =>
        h.food_name.toLowerCase().includes(term.toLowerCase())
      )

      setSearchResults(filtered)
      setHistoryResults(matchingHistory)
      setShowSearchResults(true)
    }, SEARCH_DEBOUNCE_MS)
  }, [foods, recentFoods])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleSearch(e.target.value)
  }

  const handleClearSearch = () => {
    setSearchTerm('')
    setSearchResults([])
    setHistoryResults([])
    setShowSearchResults(false)
  }

  const handleFoodTap = (food: Food) => {
    navigate(`/food/log/select/${food.id}`)
  }

  const handleHistoryTap = (history: FoodRecent) => {
    navigate(
      `/food/log/select?name=${encodeURIComponent(history.food_name)}&calories=${history.calories}&protein=${history.protein_g}&carbs=${history.carbs_g}&fat=${history.fat_g}`
    )
  }

  const handleQuickAdd = () => {
    navigate('/food/log/select')
  }

  const handleFoodPhoto = () => {
    navigate('/food/photo-log')
  }

  if (isLoading && foods.length === 0 && recentFoods.length === 0) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex justify-center py-12">
        <Loading text="Loading..." />
      </div>
    )
  }

  const displayItems = showSearchResults
    ? [
        ...historyResults.map(h => ({ ...h, _type: 'history' as const })),
        ...searchResults.map(f => ({ ...f, _type: 'food' as const })),
      ]
    : recentFoods.map(h => ({ ...h, _type: 'history' as const }))

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      {/* Sticky Top Zone */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#e0e0e0]">
        {/* Search Bar */}
        <div className="px-4 py-3">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={handleInputChange}
              onFocus={() => searchTerm && setShowSearchResults(true)}
              placeholder="Search foods..."
              className="w-full pl-10 pr-10 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-3 flex gap-2">
          <Button size="sm" onClick={handleQuickAdd}>
            Quick Add
          </Button>
          <Button size="sm" variant="outline" onClick={handleFoodPhoto}>
            Food Photo
          </Button>
        </div>
      </div>

      {/* Scrollable Results/History Zone */}
      <div className="px-4 py-3 space-y-2">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-[#E53935]">{error}</p>
          </div>
        )}

        {!showSearchResults && recentFoods.length === 0 && (
          <EmptyState
            title="No recent foods"
            description="Foods you log will appear here for quick re-adding."
          />
        )}

        {showSearchResults && searchResults.length === 0 && historyResults.length === 0 && (
          <EmptyState
            title="No results"
            description="Try a different search term."
          />
        )}

        {showSearchResults && searchTerm && (
          <h2 className="text-sm font-medium text-[#757575] mt-2">
            Search Results
          </h2>
        )}

        {!showSearchResults && recentFoods.length > 0 && (
          <h2 className="text-sm font-medium text-[#757575] mt-2">
            Recent Foods
          </h2>
        )}

        {displayItems.map((item, index) => {
          if (item._type === 'food') {
            const food = item as Food & { _type: 'food' }
            return (
              <button
                key={food.id}
                onClick={() => handleFoodTap(food)}
                className="w-full bg-white rounded-lg p-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-sm text-[#212121]">{food.name}</div>
                <div className="text-xs text-[#757575] mt-0.5">
                  {food.calories} cal{food.brand ? ` · ${food.brand}` : ''}
                </div>
              </button>
            )
          }

          const history = item as FoodRecent & { _type: 'history' }
          return (
            <button
              key={`${history.food_name}-${index}`}
              onClick={() => handleHistoryTap(history)}
              className="w-full bg-white rounded-lg p-3 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-sm text-[#212121]">{history.food_name}</div>
              <div className="text-xs text-[#757575] mt-0.5">
                {history.calories} cal · {history.total_logs} log{history.total_logs > 1 ? 's' : ''}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update index.ts export**

In `frontend/src/pages/Food/index.ts`, add:

```typescript
export { default as FoodLogSelect } from './FoodLogSelect'
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Food/LogFood.tsx frontend/src/pages/Food/FoodLogSelect.tsx frontend/src/pages/Food/index.ts
git commit -m "frontend: redesign LogFood with search/history and add FoodLogSelect detail screen"
```

---

# Task 12: Frontend — Update Router with New Route

**Files:**
- Modify: `frontend/src/router.tsx`

- [ ] **Step 1: Add FoodLogSelect import**

In `frontend/src/router.tsx`, update the import from Food:

```typescript
import { Food, DailyFood, LogFood, FoodLogSelect, CustomFoods, PhotoLog } from './pages/Food'
```

- [ ] **Step 2: Add route**

Add this route block (after the existing `/food/log` route):

```typescript
      {
        path: 'food/log/select/:foodId?',
        element: (
          <AuthGuard>
            <FoodLogSelect />
          </AuthGuard>
        ),
      },
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/router.tsx
git commit -m "frontend: add /food/log/select route for food detail screen"
```

---

# Task 13: Frontend — Update FoodLogSelect to Handle Query Params and History Items

**Files:**
- Modify: `frontend/src/pages/Food/FoodLogSelect.tsx`

- [ ] **Step 1: Update FoodLogSelect to read query params for history items**

Update the `useEffect` and add query param handling:

```typescript
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFoodStore } from '@/store/foodStore'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import type { Food, FoodLogCreate } from '@/types'
import { MEAL_TYPES } from '@/utils/constants'
import { quickAddFoodSchema } from '@/utils/schemas'
import Loading from '@/components/common/Loading'

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
}

export default function FoodLogSelect() {
  const { setTitle } = usePageTitle()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { foodId } = useParams<{ foodId?: string }>()
  const { foods, isLoading, logFood, createFood, fetchFoods, error, clearError } = useFoodStore()

  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const [isQuickAdd, setIsQuickAdd] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [mealType, setMealType] = useState('breakfast')
  const [servingSize, setServingSize] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors: formErrors },
    watch,
  } = useForm({
    resolver: zodResolver(quickAddFoodSchema),
    defaultValues: {
      name: '',
      calories: undefined,
      protein_g: undefined,
      carbs_g: undefined,
      fat_g: undefined,
      brand: '',
      barcode_id: '',
      serving_size: '',
      meal_type: 'breakfast',
    },
  })

  const name = watch('name')
  const calories = watch('calories')
  const protein_g = watch('protein_g') || 0
  const carbs_g = watch('carbs_g') || 0
  const fat_g = watch('fat_g') || 0
  const brand = watch('brand')
  const barcode_id = watch('barcode_id')
  const meal_type = watch('meal_type')

  useEffect(() => {
    setTitle('Add Food')
    clearError()

    // Check for history query params first
    const historyName = searchParams.get('name')
    const historyCalories = searchParams.get('calories')

    if (historyName && historyCalories) {
      setIsQuickAdd(true)
      setValue('name', historyName)
      setValue('calories', parseInt(historyCalories))
      setValue('protein_g', parseFloat(searchParams.get('protein') || '0'))
      setValue('carbs_g', parseFloat(searchParams.get('carbs') || '0'))
      setValue('fat_g', parseFloat(searchParams.get('fat') || '0'))
      return
    }

    if (foodId) {
      const food = foods.find(f => String(f.id) === foodId)
      if (food) {
        setSelectedFood(food)
        setValue('name', food.name)
        setValue('calories', food.calories)
        setValue('protein_g', food.protein_g)
        setValue('carbs_g', food.carbs_g)
        setValue('fat_g', food.fat_g)
        setValue('brand', food.brand || '')
        setValue('barcode_id', food.barcode_id || '')
      } else {
        fetchFoods()
      }
    } else {
      setIsQuickAdd(true)
    }
  }, [foodId, searchParams, fetchFoods, clearError, setValue])

  const onSubmit = async (data: any) => {
    setIsSubmitting(true)
    try {
      const quantityNum = parseFloat(servingSize) || 1

      if (data.name && !selectedFood) {
        // Save to DB first, then log
        const foodCreate = {
          name: data.name,
          calories: data.calories,
          protein_g: data.protein_g || 0,
          carbs_g: data.carbs_g || 0,
          fat_g: data.fat_g || 0,
          serving_size: data.serving_size || '',
          brand: data.brand || undefined,
          barcode_id: data.barcode_id || undefined,
        }
        await createFood(foodCreate)
        fetchFoods()
      }

      // Log the food
      const logData: FoodLogCreate = {
        food_id: selectedFood ? String(selectedFood.id) : undefined,
        quantity: quantityNum,
        food_name: data.name || 'Quick Add',
        calories: Math.round(data.calories * quantityNum),
        protein_g: (data.protein_g || 0) * quantityNum,
        carbs_g: (data.carbs_g || 0) * quantityNum,
        fat_g: (data.fat_g || 0) * quantityNum,
        meal_type: meal_type as FoodLogCreate['meal_type'],
        serving_size: data.serving_size || '',
        brand: data.brand || undefined,
        barcode_id: data.barcode_id || undefined,
      }

      await logFood(logData)
      navigate('/food/log')
    } catch {
      // Error handled by store
    } finally {
      setIsSubmitting(false)
    }
  }

  const calculateNutrition = () => {
    const qty = parseFloat(servingSize) || 1
    return {
      calories: Math.round(calories * qty),
      protein: (protein_g * qty).toFixed(1),
      carbs: (carbs_g * qty).toFixed(1),
      fat: (fat_g * qty).toFixed(1),
    }
  }

  if (isLoading && !selectedFood && !isQuickAdd) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex justify-center py-12">
        <Loading text="Loading food..." />
      </div>
    )
  }

  const nutrition = calculateNutrition()
  const displayName = selectedFood?.name || name || 'Unnamed Food'
  const displayBrand = selectedFood?.brand || brand

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      {/* Header */}
      <div className="bg-white border-b border-[#e0e0e0] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="text-[#185ADB] text-sm font-medium"
        >
          ← Back
        </button>
        <h1 className="font-bold text-[#212121]">{isQuickAdd ? 'Quick Add' : displayName}</h1>
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting || !calories}
          className="text-[#185ADB] disabled:opacity-30"
          aria-label="Submit"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {/* Food Info */}
      <div className="bg-white px-4 py-3 border-b border-[#e0e0e0]">
        <h2 className="font-bold text-lg text-[#212121]">{displayName}</h2>
        <p className="text-sm text-[#757575] mt-1">
          {calories} cal{displayBrand ? ` · ${displayBrand}` : ''}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
        {/* Meal Type */}
        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium text-[#212121] mb-2">
            Meal Type
          </label>
          <div className="flex gap-1">
            {MEAL_TYPES.map(meal => (
              <button
                key={meal}
                type="button"
                onClick={() => setMealType(meal)}
                className={`flex-1 py-2 px-2 text-xs font-medium rounded-md transition-colors ${
                  mealType === meal
                    ? 'bg-[#185ADB] text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {MEAL_LABELS[meal]}
              </button>
            ))}
          </div>
        </div>

        {/* Serving Size */}
        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium text-[#212121] mb-2">
            Serving Size
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={servingSize}
              onChange={(e) => setServingSize(e.target.value)}
              placeholder="e.g. 1.5"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
            />
            <span className="text-sm text-[#757575]">servings</span>
          </div>
        </div>

        {/* Nutrition */}
        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium text-[#212121] mb-2">
            Nutrition
          </label>
          <div className="text-sm text-[#757575]">
            <span className="font-medium text-[#212121]">{nutrition.calories}</span> cal ·
            P:{nutrition.protein}g C:{nutrition.carbs}g F:{nutrition.fat}g
          </div>
        </div>

        {/* Quick Add Fields */}
        {isQuickAdd && (
          <>
            <div className="bg-white rounded-lg p-4">
              <label className="block text-sm font-medium text-[#212121] mb-2">
                Food Name (optional)
              </label>
              <input
                {...register('name')}
                placeholder="e.g. Banana"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
              />
              {formErrors.name && (
                <p className="mt-1 text-xs text-[#E53935]">{formErrors.name.message}</p>
              )}
            </div>

            <div className="bg-white rounded-lg p-4">
              <label className="block text-sm font-medium text-[#212121] mb-2">
                Calories *
              </label>
              <input
                type="number"
                min="1"
                {...register('calories')}
                placeholder="e.g. 105"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
              />
              {formErrors.calories && (
                <p className="mt-1 text-xs text-[#E53935]">{formErrors.calories.message}</p>
              )}
            </div>

            <div className="bg-white rounded-lg p-4">
              <label className="block text-sm font-medium text-[#212121] mb-2">
                Protein (g)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                {...register('protein_g')}
                placeholder="e.g. 1.3"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
              />
              {formErrors.protein_g && (
                <p className="mt-1 text-xs text-[#E53935]">{formErrors.protein_g.message}</p>
              )}
            </div>

            <div className="bg-white rounded-lg p-4">
              <label className="block text-sm font-medium text-[#212121] mb-2">
                Carbs (g)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                {...register('carbs_g')}
                placeholder="e.g. 27"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
              />
              {formErrors.carbs_g && (
                <p className="mt-1 text-xs text-[#E53935]">{formErrors.carbs_g.message}</p>
              )}
            </div>

            <div className="bg-white rounded-lg p-4">
              <label className="block text-sm font-medium text-[#212121] mb-2">
                Fat (g)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                {...register('fat_g')}
                placeholder="e.g. 0.4"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
              />
              {formErrors.fat_g && (
                <p className="mt-1 text-xs text-[#E53935]">{formErrors.fat_g.message}</p>
              )}
            </div>

            <div className="bg-white rounded-lg p-4">
              <label className="block text-sm font-medium text-[#212121] mb-2">
                Brand (optional)
              </label>
              <input
                {...register('brand')}
                placeholder="e.g. USDA"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
              />
            </div>

            <div className="bg-white rounded-lg p-4">
              <label className="block text-sm font-medium text-[#212121] mb-2">
                Barcode ID (optional)
              </label>
              <input
                {...register('barcode_id')}
                placeholder="e.g. 012345678901"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
              />
            </div>
          </>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-[#E53935]">{error}</p>
          </div>
        )}
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Food/FoodLogSelect.tsx
git commit -m "frontend: update FoodLogSelect to handle history query params"
```

---

# Task 14: Run Tests and Verify

**Files:**
- Run: `./venv/bin/python -m pytest tests/`
- Run: `cd frontend && npm test`

- [ ] **Step 1: Run backend tests**

```bash
cd /home/angrygiant/github_projects/FitnessFriend && ./venv/bin/python -m pytest tests/ -v
```

Expected: All existing tests pass. If any tests fail due to the new fields, update them to include `brand` and `barcode_id` in expected responses.

- [ ] **Step 2: Run frontend tests**

```bash
cd /home/angrygiant/github_projects/FitnessFriend/frontend && npm test
```

Expected: All existing tests pass. If any tests fail due to the redesigned components, update snapshots or test assertions.

- [ ] **Step 3: Manual verification**

Start the backend and frontend, then verify:
1. Navigate to `/food/log` — see search bar and action buttons
2. Type in search — see filtered results
3. Tap a food — see detail screen with pre-filled info
4. Tap "Quick Add" — see blank form
5. Fill out Quick Add with a name — verify food is saved to DB
6. Fill out Quick Add without a name — verify food is logged but not saved to DB
7. Tap "Food Photo" — verify navigation to `/food/photo-log`
8. Tap history item — verify detail screen with pre-filled values from history

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "verify: run tests and manual verification for Add Food redesign"
```

---

# Task 15: Update TODO.md

**Files:**
- Modify: `TODO.md`

- [ ] **Step 1: Mark the feature as done**

In `TODO.md`, change:

```markdown
- [ ] Redesign Add Food screen to be MyFitnessPal-style:
```

to:

```markdown
- [x] Redesign Add Food screen to be MyFitnessPal-style:
```

- [ ] **Step 2: Commit**

```bash
git add TODO.md
git commit -m "docs: mark Add Food redesign as complete"
```

---

## Plan Self-Review

**1. Spec coverage:**
- ✅ Search bar at top — Task 11 (LogFood redesign)
- ✅ Action buttons row (Quick Add, Food Photo) — Task 11
- ✅ History section showing recently logged foods — Task 3 (backend), Task 11 (frontend)
- ✅ Sort history by most recent — Task 3 (backend sorts by last_logged desc)
- ✅ Serving size supports decimals — Task 10/11 (input type="number" step="0.1")
- ✅ Brand field on Food — Task 1, Task 10/11
- ✅ Barcode ID field — Task 1, Task 10/11
- ✅ Serving size on FoodLog — Task 2
- ✅ Composite index on food_logs — Task 5
- ✅ Configurable debounce/time range — Task 6
- ✅ Quick Add with/without name — Task 10/11
- ✅ Quick Add calories required, rest optional — Task 9 (schema)
- ✅ Nutrition auto-calculates — Task 10/11
- ✅ Checkmark submit in header — Task 10/11
- ✅ Meal type above servings — Task 10/11

**2. Placeholder scan:** No TBD/TODO markers. All code is complete.

**3. Type consistency:** `FoodRecent` type defined in Task 6, used in Tasks 3, 11. `FoodLogCreate` used consistently in Tasks 10, 11.

**4. Scope check:** Focused on the spec requirements. No extras.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-13-add-food-redesign.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**

<tool_call>
<function=todowrite>
<parameter=todos>
[{"content": "Explore project context — check files, docs, recent commits", "status": "completed", "priority": "high"}, {"content": "Offer visual companion", "status": "completed", "priority": "high"}, {"content": "Ask clarifying questions one at a time", "status": "completed", "priority": "high"}, {"content": "Propose 2-3 approaches", "status": "completed", "priority": "high"}, {"content": "Present design sections", "status": "completed", "priority": "high"}, {"content": "Write design doc", "status": "completed", "priority": "high"}, {"content": "Spec self-review", "status": "completed", "priority": "high"}, {"content": "User reviews written spec", "status": "completed", "priority": "high"}, {"content": "Map files to modify", "status": "completed", "priority": "high"}, {"content": "Write implementation plan", "status": "completed", "priority": "high"}, {"content": "Plan self-review", "status": "completed", "priority": "high"}, {"content": "Execution handoff", "status": "in_progress", "priority": "high"}]
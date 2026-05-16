# User Profile: Height, Activity Level, and Calorie Goal Calculation

## Overview

Add height, activity level, and related profile fields to the user profile page. Use these fields (along with age, gender, and weight) to calculate daily calorie usage (BMR, TDEE, calorie goal) and auto-update the goal whenever profile data changes.

## Current State

- **Backend**: User model already has `age`, `gender`, `height` (cm), `weight` (kg), `activity_level`, `daily_calorie_goal`, `weight_goal_lbs` fields. BMR/TDEE calculator exists in `bmr_calculator.py` but is only used during registration.
- **Frontend**: Profile page shows only email, weight goal, and settings. Registration page only collects name/email/password.
- **Dashboard**: CalorieSummaryBar displays `daily_calorie_goal` from the user model but has no visibility into BMR/TDEE.

## Design

### Profile Page UI

New "Profile Info" section inserted between the user info header and the Goals section:

```
┌─────────────────────────────────┐
│  Profile Info                   │
│  ─────────────────────────────  │
│  Age             [25 ▼]         │  ← clickable, opens date picker
│  Gender          [Male ▼]       │
│  Height        [5 ft] [74 in]   │
│  Weight        [180 lbs]        │
│  Activity      [Moderate ▼]     │
│  ─────────────────────────────  │
│  [Save]                         │
├─────────────────────────────────┤
│  Nutrition                      │
│  ─────────────────────────────  │
│  Weekly Goal     [Maintain ▼]   │
│  ─────────────────────────────  │
│  BMR           1,850 kcal/day   │
│  TDEE            2,868 kcal/day │
│  Calorie Goal  2,868 kcal/day   │
│  ─────────────────────────────  │
└─────────────────────────────────┘
```

- **Age**: displayed as calculated integer. Clicking opens a date picker modal for birthdate.
- **Gender**: select (male/female).
- **Height**: two number fields (feet + inches). Stored as cm on backend.
- **Weight**: one number field (lbs). Stored as kg on backend.
- **Activity level**: select with descriptions (sedentary, light, moderate, active, very active).
- **Weekly Goal**: select (Maintain, Lose 0.5 lb/wk, Lose 1 lb/wk, Lose 1.5 lb/wk, Lose 2 lb/wk).
- **BMR/TDEE**: read-only, auto-calculated.
- **Calorie Goal**: read-only, auto-calculated from TDEE minus weekly goal deficit.

### Backend Architecture

```
Profile Page (Frontend)
  └── PUT /api/auth/profile (age, gender, height_cm, weight_kg, activity_level)
         └── nutrition_service.recalculate_user_calories()
               ├── calculate_bmr(age, gender, height_cm, weight_kg)
               ├── calculate_tdee(bmr, activity_level)
               ├── apply_weekly_goal(tdee, weekly_goal)
               └── update user.daily_calorie_goal

Weight Log Creation (Frontend → POST /api/weight)
  └── After saving weight log entry
         └── nutrition_service.recalculate_from_weight_log()
               ├── get latest weight log entry by date
               ├── calculate_bmr(age, gender, height_cm, latest_weight_kg)
               ├── calculate_tdee(bmr, activity_level)
               ├── apply_weekly_goal(tdee, weekly_goal)
               └── update user.daily_calorie_goal if changed
```

### Backend Changes

1. **New file: `app/utils/nutrition_service.py`**
   - `calculate_calorie_goal(user, weekly_goal)` — orchestrates full calculation: BMR → TDEE → weekly goal adjustment → returns {bmr, tdee, calorie_goal}
   - `apply_weekly_goal(tdee, weekly_goal)` — applies deficit: maintain=0, lose_0_5=-250, lose_1=-500, lose_1_5=-750, lose_2=-1000
   - `recalculate_user_calories(user, weekly_goal)` — updates user's `daily_calorie_goal`, returns {bmr, tdee, calorie_goal}
   - `recalculate_from_weight_log(user, weekly_goal)` — finds latest weight log entry, uses its weight for BMR calculation

2. **Update: `app/routes/auth.py`** — profile PUT endpoint
   - When `height`, `gender`, `age`, or `activity_level` changes in request body, call `recalculate_user_calories()`
   - Return BMR, TDEE, calorie_goal in response so frontend can display them

3. **Update: `app/routes/weight.py`** — weight log creation
   - After saving a new WeightLog, call `recalculate_from_weight_log()` using user's latest weight log entry
   - Update `user.daily_calorie_goal` if the new calculation differs

4. **Update: `app/routes/auth.py`** — profile GET endpoint
   - Return BMR, TDEE along with profile data so frontend can display them
   - Also return `weekly_goal` field

5. **User model update**: Add `weekly_goal` field to store the user's weight loss preference (maintain, lose_0_5, lose_1, lose_1_5, lose_2). Default: "maintain".

### Frontend Changes

1. **Update: `frontend/src/api/types.ts`** — extend `UserProfile` interface
   - Add `bmr?: number`, `tdee?: number`, `weekly_goal?: string`

2. **Update: `frontend/src/api/auth.ts`** — profile API methods
   - `getProfile()` response now includes `bmr`, `tdee`, `weekly_goal`
   - `updateProfile()` accepts `weekly_goal`, returns updated profile with BMR/TDEE

3. **Update: `frontend/src/store/authStore.ts`** — store user state
   - Store `bmr`, `tdee`, `weekly_goal` in user state
   - After profile update or auth check, include these fields

4. **Update: `frontend/src/pages/Profile.tsx`** — add two new sections
   - **Profile Info section**: birthdate (clickable → date picker modal), gender (select), height (ft + in), weight (lbs), activity level (select with descriptions), Save button
   - **Nutrition section**: weekly goal (select), BMR (read-only), TDEE (read-only), Calorie Goal (read-only)
   - Follow existing layout style (white rounded card, blue header)
   - On Save: backend calculates age from birthdate, sends age, gender, height_cm, weight_kg, activity_level
   - On mount: fetch profile data (including BMR/TDEE)

5. **Update: `frontend/src/pages/Auth/Register.tsx`** — add profile fields to registration
   - Add birthdate, gender, height (ft + in), weight (lbs), activity level fields
   - Submit with registration data so backend can calculate initial calorie goal

### Data Flow

1. **Registration**: User enters birthdate, gender, height, weight, activity level → backend calculates BMR → TDEE → applies "maintain" weekly goal → saves `daily_calorie_goal`.
2. **Profile update**: User changes height/weight/activity/gender/birthdate → clicks Save → backend recalculates BMR → TDEE → applies current weekly goal → updates `daily_calorie_goal` → returns BMR/TDEE → frontend displays updated values.
3. **Weight log creation**: User logs weight → backend finds latest weight log entry → recalculates BMR using latest weight → TDEE → applies current weekly goal → updates `daily_calorie_goal` if changed.
4. **Dashboard**: CalorieSummaryBar reads `daily_calorie_goal` from the existing daily summary API (unchanged).

### Error Handling

- **Missing required fields**: If age, gender, height, or weight is missing, BMR cannot be calculated. Return current BMR/TDEE values or defaults (2000 kcal).
- **Invalid weekly goal**: Validate that weekly_goal is one of the allowed values. Default to "maintain" if invalid.
- **Weight log recalculation**: If user has no weight logs, use the user's stored weight field instead.

### Migration

- Add `weekly_goal` column to users table (default: "maintain").
- Existing users: `weekly_goal` defaults to "maintain", `daily_calorie_goal` remains unchanged until next profile update or weight log.

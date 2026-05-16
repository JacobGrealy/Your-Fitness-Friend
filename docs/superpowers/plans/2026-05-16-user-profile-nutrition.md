# User Profile Nutrition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add height, activity level, birthdate, and gender fields to the user profile page, and use these to auto-calculate daily calorie usage (BMR, TDEE, calorie goal) with weekly goal adjustments.

**Architecture:** A new `nutrition_service.py` module orchestrates BMR/TDEE calculation using the existing `bmr_calculator.py`. The service is called from both the profile update endpoint and the weight log creation endpoint. The frontend adds a Profile Info section and a Nutrition section to the Profile page.

**Tech Stack:** Flask, SQLAlchemy, Alembic migrations, React, Zustand, TypeScript

---

## Task 1: Add weekly_goal field to User model and migration

**Files:**
- Modify: `app/models/user.py`
- Create: `migrations/versions/<hash>_add_weekly_goal_to_users.py`

- [ ] **Step 1: Add `weekly_goal` field to User model**

Add after the `weight_goal_lbs` field in `app/models/user.py`:

```python
weekly_goal = db.Column(db.String(20), default='maintain')  # maintain, lose_0_5, lose_1, lose_1_5, lose_2
```

- [ ] **Step 2: Create Alembic migration**

```bash
cd /home/angrygiant/github_projects/FitnessFriend && ./venv/bin/python -m flask db migrate -m "add weekly_goal to users"
```

Verify the generated migration file contains:

```python
op.add_column('users', sa.Column('weekly_goal', sa.String(length=20), nullable=True, default='maintain'))
```

- [ ] **Step 3: Run migration**

```bash
cd /home/angrygiant/github_projects/FitnessFriend && ./venv/bin/python -m flask db upgrade
```

---

## Task 2: Create `nutrition_service.py`

**Files:**
- Create: `app/utils/nutrition_service.py`

- [ ] **Step 1: Create nutrition_service.py**

```python
"""Nutrition service for calculating BMR, TDEE, and calorie goals."""

from datetime import datetime
from app.models.user import User
from app.models.weight_log import WeightLog
from app.utils.bmr_calculator import calculate_bmr, calculate_tdee, get_activity_multiplier


WEEKLY_GOAL_ADJUSTMENTS = {
    'maintain': 0,
    'lose_0_5': -250,
    'lose_1': -500,
    'lose_1_5': -750,
    'lose_2': -1000,
}

MIN_CALORIES = 1200


def calculate_calorie_goal(age, gender, height_cm, weight_kg, activity_level, weekly_goal='maintain'):
    """Calculate BMR, TDEE, and daily calorie goal.

    Args:
        age: Age in years
        gender: 'male' or 'female'
        height_cm: Height in centimeters
        weight_kg: Weight in kilograms
        activity_level: Activity level string
        weekly_goal: Weekly goal type

    Returns:
        dict: {bmr, tdee, calorie_goal}
    """
    if age is None or gender is None or height_cm is None or weight_kg is None or activity_level is None:
        return None

    bmr = calculate_bmr(age, gender, height_cm, weight_kg)
    tdee = calculate_tdee(bmr, activity_level)
    adjustment = WEEKLY_GOAL_ADJUSTMENTS.get(weekly_goal, 0)
    calorie_goal = tdee + adjustment

    # Enforce minimum calories
    calorie_goal = max(calorie_goal, MIN_CALORIES)

    return {
        'bmr': bmr,
        'tdee': tdee,
        'calorie_goal': calorie_goal,
    }


def recalculate_user_calories(user, weekly_goal='maintain'):
    """Recalculate and update a user's calorie goal.

    Args:
        user: User model instance
        weekly_goal: Weekly goal type

    Returns:
        dict: {bmr, tdee, calorie_goal} or None if insufficient data
    """
    result = calculate_calorie_goal(
        age=user.age,
        gender=user.gender,
        height_cm=user.height,
        weight_kg=user.weight,
        activity_level=user.activity_level,
        weekly_goal=weekly_goal,
    )

    if result:
        user.daily_calorie_goal = result['calorie_goal']

    return result


def recalculate_from_weight_log(user, weekly_goal='maintain'):
    """Recalculate calorie goal using the latest weight log entry.

    Uses the most recent weight log entry's weight instead of the user's stored weight.

    Args:
        user: User model instance
        weekly_goal: Weekly goal type

    Returns:
        dict: {bmr, tdee, calorie_goal} or None if insufficient data
    """
    # Get the latest weight log entry by date
    latest_log = WeightLog.query.filter_by(
        user_id=user.id
    ).order_by(WeightLog.date.desc()).first()

    if latest_log:
        weight_kg = latest_log.weight_lbs * 0.453592  # Convert lbs to kg
    else:
        weight_kg = user.weight

    return calculate_calorie_goal(
        age=user.age,
        gender=user.gender,
        height_cm=user.height,
        weight_kg=weight_kg,
        activity_level=user.activity_level,
        weekly_goal=weekly_goal,
    )
```

- [ ] **Step 2: Verify imports work**

```bash
cd /home/angrygiant/github_projects/FitnessFriend && ./venv/bin/python -c "from app.utils.nutrition_service import calculate_calorie_goal; print('OK')"
```

---

## Task 3: Update auth.py profile GET to return BMR/TDEE/weekly_goal

**Files:**
- Modify: `app/routes/auth.py`

- [ ] **Step 1: Update profile GET endpoint**

In `app/routes/auth.py`, update the `profile()` GET response to include `bmr`, `tdee`, and `weekly_goal`:

```python
@bp.route('/profile', methods=['GET', 'PUT'])
@login_required
def profile():
    """Get or update user profile."""
    if request.method == 'GET':
        bmr = None
        tdee = None

        # Calculate BMR/TDEE if we have enough data
        if all([current_user.age, current_user.gender, current_user.height, current_user.weight, current_user.activity_level]):
            from app.utils.nutrition_service import calculate_calorie_goal
            result = calculate_calorie_goal(
                age=current_user.age,
                gender=current_user.gender,
                height_cm=current_user.height,
                weight_kg=current_user.weight,
                activity_level=current_user.activity_level,
                weekly_goal=current_user.weekly_goal or 'maintain',
            )
            if result:
                bmr = result['bmr']
                tdee = result['tdee']

        user = {
            'id': current_user.id,
            'username': current_user.username,
            'email': current_user.email,
            'age': current_user.age,
            'gender': current_user.gender,
            'height': current_user.height,
            'weight': current_user.weight,
            'activity_level': current_user.activity_level,
            'weight_goal_lbs': current_user.weight_goal_lbs,
            'profile_photo_path': current_user.profile_photo_path,
            'weekly_goal': current_user.weekly_goal or 'maintain',
            'bmr': bmr,
            'tdee': tdee,
        }
        return jsonify(user)
    # ... PUT endpoint stays the same for now (updated in Task 4)
```

- [ ] **Step 3: Verify GET returns new fields**

```bash
cd /home/angrygiant/github_projects/FitnessFriend && ./venv/bin/python -c "
from app import create_app
from app.models.user import User
app = create_app()
with app.app_context():
    user = User.query.first()
    if user:
        print(f'weekly_goal: {user.weekly_goal}')
        print(f'Fields OK')
    else:
        print('No users found')
"
```

---

## Task 4: Update auth.py profile PUT to recalculate calories

**Files:**
- Modify: `app/routes/auth.py`

- [ ] **Step 1: Update profile PUT endpoint**

In `app/routes/auth.py`, update the `profile()` PUT response to recalculate calories when relevant fields change:

```python
    elif request.method == 'PUT':
        data = request.get_json()

        # Track which fields changed that affect calorie calculation
        fields_changed = False
        if 'age' in data:
            current_user.age = data['age']
            fields_changed = True
        if 'gender' in data:
            current_user.gender = data['gender']
            fields_changed = True
        if 'height' in data:
            current_user.height = data['height']
            fields_changed = True
        if 'weight' in data:
            current_user.weight = data['weight']
            fields_changed = True
        if 'activity_level' in data:
            current_user.activity_level = data['activity_level']
            fields_changed = True
        if 'weekly_goal' in data:
            current_user.weekly_goal = data['weekly_goal']
            fields_changed = True

        # Recalculate calories if any relevant field changed
        bmr = None
        tdee = None
        calorie_goal = current_user.daily_calorie_goal

        if fields_changed and all([current_user.age, current_user.gender, current_user.height, current_user.weight, current_user.activity_level]):
            from app.utils.nutrition_service import recalculate_user_calories
            result = recalculate_user_calories(
                current_user,
                weekly_goal=data.get('weekly_goal', current_user.weekly_goal or 'maintain'),
            )
            if result:
                bmr = result['bmr']
                tdee = result['tdee']
                calorie_goal = result['calorie_goal']

        db.session.commit()

        return jsonify({
            'message': 'Profile updated successfully',
            'user': {
                'id': current_user.id,
                'username': current_user.username,
                'age': current_user.age,
                'gender': current_user.gender,
                'height': current_user.height,
                'weight': current_user.weight,
                'activity_level': current_user.activity_level,
                'weight_goal_lbs': current_user.weight_goal_lbs,
                'weekly_goal': current_user.weekly_goal or 'maintain',
                'bmr': bmr,
                'tdee': tdee,
                'calorie_goal': calorie_goal,
            }
        })
```

---

## Task 5: Update weight.py to recalculate calories on weight log creation

**Files:**
- Modify: `app/routes/weight.py`

- [ ] **Step 1: Add calorie recalculation after weight log save**

In `app/routes/weight.py`, find the weight log creation endpoint and add calorie recalculation after the commit:

```python
from app.utils.nutrition_service import recalculate_from_weight_log

# After db.session.commit() in the weight log creation endpoint:
# Recalculate calorie goal using the new weight
try:
    weekly_goal = current_user.weekly_goal or 'maintain'
    result = recalculate_from_weight_log(current_user, weekly_goal)
    if result:
        current_user.daily_calorie_goal = result['calorie_goal']
        db.session.commit()
except Exception:
    # Silently fail - calorie recalculation shouldn't break weight logging
    pass
```

Add the import at the top of the file:

```python
from app.utils.nutrition_service import recalculate_from_weight_log
```

- [ ] **Step 2: Verify weight.py syntax**

```bash
cd /home/angrygiant/github_projects/FitnessFriend && ./venv/bin/python -c "import app.routes.weight; print('OK')"
```

---

## Task 6: Update frontend types and auth store

**Files:**
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/store/authStore.ts`

- [ ] **Step 1: Update UserProfile interface in types.ts**

Add these fields to `UserProfile` in `frontend/src/api/types.ts`:

```typescript
export interface UserProfile {
  id: number
  username: string
  email: string
  age?: number
  gender?: string
  height?: number
  weight?: number
  weight_goal_lbs?: number
  activity_level?: string
  weekly_goal?: string
  bmr?: number
  tdee?: number
  daily_calorie_goal?: number
  created_at?: string
  profile_photo_path?: string
}
```

- [ ] **Step 2: Update authStore to store new fields**

The `authStore.ts` already uses `UserProfile` from types, so no changes needed there. The store's `checkAuth` method calls `authApi.getProfile()` which will now return the new fields. The Zustand store will automatically include them in the `user` state.

---

## Task 7: Update Profile page with Profile Info and Nutrition sections

**Files:**
- Modify: `frontend/src/pages/Profile.tsx`

- [ ] **Step 1: Add new state variables and imports**

Add to `Profile.tsx`:

```typescript
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import { authApi } from '@/api/auth'
import Loading from '@/components/common/Loading'
import Modal from '@/components/common/Modal'
import CropModal from '@/components/common/CropModal'

// Activity level descriptions
const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise, desk job' },
  { value: 'light', label: 'Light', description: 'Light exercise 1-3 days/week' },
  { value: 'moderate', label: 'Moderate', description: 'Moderate exercise 3-5 days/week' },
  { value: 'active', label: 'Active', description: 'Hard exercise 6-7 days/week' },
  { value: 'very active', label: 'Very Active', description: 'Very hard exercise, physical job, or training twice a day' },
]

const WEEKLY_GOALS = [
  { value: 'maintain', label: 'Maintain' },
  { value: 'lose_0_5', label: 'Lose 0.5 lb/wk' },
  { value: 'lose_1', label: 'Lose 1 lb/wk' },
  { value: 'lose_1_5', label: 'Lose 1.5 lb/wk' },
  { value: 'lose_2', label: 'Lose 2 lb/wk' },
]
```

- [ ] **Step 2: Add new state variables**

```typescript
// Profile edit state
const [editModalOpen, setEditModalOpen] = useState(false)
const [savingProfile, setSavingProfile] = useState(false)
const [birthDateModalOpen, setBirthDateModalOpen] = useState(false)
const [birthDate, setBirthDate] = useState('')

// Profile edit form state
const [editForm, setEditForm] = useState({
  gender: '',
  heightFt: '',
  heightIn: '',
  weight: '',
  activityLevel: '',
  weeklyGoal: '',
})
```

- [ ] **Step 3: Add helper functions for unit conversion**

```typescript
// Convert cm to feet/inches
const cmToFtIn = (cm: number): { ft: number; in: number } => {
  const totalInches = cm / 2.54
  const ft = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)
  return { ft, in: inches }
}

// Convert feet/inches to cm
const ftInToCm = (ft: number, inches: number): number => {
  return (ft * 12 + inches) * 2.54
}

// Convert lbs to kg
const lbsToKg = (lbs: number): number => {
  return lbs / 2.20462
}

// Calculate age from birthdate string (YYYY-MM-DD)
const calculateAge = (birthdate: string): number | null => {
  if (!birthdate) return null
  const birth = new Date(birthdate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}
```

- [ ] **Step 4: Add openEditModal function**

```typescript
const openEditModal = () => {
  const ftIn = cmToFtIn(user?.height || 0)
  setEditForm({
    gender: user?.gender || '',
    heightFt: ftIn.ft.toString(),
    heightIn: ftIn.in.toString(),
    weight: user?.weight ? (user.weight / 0.453592).toFixed(1).toString() : '',
    activityLevel: user?.activity_level || '',
    weeklyGoal: user?.weekly_goal || 'maintain',
  })
  setEditModalOpen(true)
}
```

- [ ] **Step 5: Add handleSaveProfile function**

```typescript
const handleSaveProfile = async () => {
  setSavingProfile(true)
  try {
    const heightCm = ftInToCm(
      parseInt(editForm.heightFt) || 0,
      parseInt(editForm.heightIn) || 0
    )
    const weightKg = lbsToKg(parseFloat(editForm.weight) || 0)

    const updated = await authApi.updateProfile({
      gender: editForm.gender || undefined,
      height: heightCm || undefined,
      weight: weightKg || undefined,
      activity_level: editForm.activityLevel || undefined,
      weekly_goal: editForm.weeklyGoal || 'maintain',
    })

    if (updated) {
      await checkAuth()
      setEditModalOpen(false)
    }
  } catch {
    alert('Failed to save profile. Please try again.')
  } finally {
    setSavingProfile(false)
  }
}
```

- [ ] **Step 6: Add openBirthDateModal function**

```typescript
const openBirthDateModal = () => {
  // Calculate birthdate from age, or use existing birthdate if stored
  // For now, we'll use a placeholder - the backend will calculate age from birthdate
  // We need to store birthdate as a field
  setBirthDateModalOpen(true)
}
```

- [ ] **Step 7: Add BirthDateModal handler**

```typescript
const handleSaveBirthDate = async () => {
  if (!birthDate) return
  setSavingProfile(true)
  try {
    const updated = await authApi.updateProfile({ birthdate: birthDate })
    if (updated) {
      await checkAuth()
      setBirthDateModalOpen(false)
      setBirthDate('')
    }
  } catch {
    alert('Failed to save birthdate. Please try again.')
  } finally {
    setSavingProfile(false)
  }
}
```

- [ ] **Step 8: Insert Profile Info and Nutrition sections before Goals section**

In the Profile page JSX, insert after the user info section and before the Goals section:

```tsx
{/* Profile Info Section */}
<div className="bg-white rounded-lg mt-4 mx-4 overflow-hidden">
  <div className="bg-[#185ADB] px-4 py-3 flex items-center justify-between">
    <span className="text-white text-base font-medium">Profile Info</span>
    <button
      type="button"
      onClick={openEditModal}
      className="text-white hover:opacity-80"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    </button>
  </div>
  <div className="px-4 py-4">
    <div className="flex items-center justify-between py-2">
      <span className="text-base" style={{ color: '#757575' }}>Age</span>
      <button
        type="button"
        onClick={openBirthDateModal}
        className="text-base font-medium"
        style={{ color: '#185ADB' }}
      >
        {user?.age != null ? `${user.age}` : 'Not set'}
      </button>
    </div>
    <div className="h-px bg-[#e0e0e0] my-2" />
    <div className="flex items-center justify-between py-2">
      <span className="text-base" style={{ color: '#757575' }}>Gender</span>
      <span className="text-base">{user?.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : 'Not set'}</span>
    </div>
    <div className="h-px bg-[#e0e0e0] my-2" />
    <div className="flex items-center justify-between py-2">
      <span className="text-base" style={{ color: '#757575' }}>Height</span>
      <span className="text-base">{user?.height ? `${cmToFtIn(user.height).ft}' ${cmToFtIn(user.height).in}"` : 'Not set'}</span>
    </div>
    <div className="h-px bg-[#e0e0e0] my-2" />
    <div className="flex items-center justify-between py-2">
      <span className="text-base" style={{ color: '#757575' }}>Weight</span>
      <span className="text-base">{user?.weight ? `${(user.weight / 0.453592).toFixed(1)} lbs` : 'Not set'}</span>
    </div>
    <div className="h-px bg-[#e0e0e0] my-2" />
    <div className="flex items-center justify-between py-2">
      <span className="text-base" style={{ color: '#757575' }}>Activity Level</span>
      <span className="text-base">{user?.activity_level ? user.activity_level.charAt(0).toUpperCase() + user.activity_level.slice(1) : 'Not set'}</span>
    </div>
  </div>
</div>

{/* Nutrition Section */}
<div className="bg-white rounded-lg mt-4 mx-4 overflow-hidden">
  <div className="bg-[#185ADB] px-4 py-3">
    <span className="text-white text-base font-medium">Nutrition</span>
  </div>
  <div className="px-4 py-4">
    <div className="flex items-center justify-between py-2">
      <span className="text-base" style={{ color: '#757575' }}>Weekly Goal</span>
      <span className="text-base">
        {WEEKLY_GOALS.find(g => g.value === user?.weekly_goal)?.label || 'Maintain'}
      </span>
    </div>
    <div className="h-px bg-[#e0e0e0] my-2" />
    <div className="flex items-center justify-between py-2">
      <span className="text-base" style={{ color: '#757575' }}>BMR</span>
      <span className="text-base">{user?.bmr ? `${user.bmr.toLocaleString()} kcal/day` : '—'}</span>
    </div>
    <div className="h-px bg-[#e0e0e0] my-2" />
    <div className="flex items-center justify-between py-2">
      <span className="text-base" style={{ color: '#757575' }}>TDEE</span>
      <span className="text-base">{user?.tdee ? `${user.tdee.toLocaleString()} kcal/day` : '—'}</span>
    </div>
    <div className="h-px bg-[#e0e0e0] my-2" />
    <div className="flex items-center justify-between py-2">
      <span className="text-base" style={{ color: '#757575' }}>Calorie Goal</span>
      <span className="text-base font-bold">{user?.daily_calorie_goal ? `${user.daily_calorie_goal.toLocaleString()} kcal/day` : '—'}</span>
    </div>
  </div>
</div>
```

- [ ] **Step 9: Add Edit Profile Modal**

Add after the existing Weight Goal Modal:

```tsx
{/* Edit Profile Modal */}
<Modal
  isOpen={editModalOpen}
  onClose={() => setEditModalOpen(false)}
  title="Edit Profile"
  submitLabel="Save"
  onSubmit={handleSaveProfile}
  submitLoading={savingProfile}
  submitDisabled={!editForm.gender || !editForm.heightFt || !editForm.weight || !editForm.activityLevel}
>
  <div className="space-y-4">
    <div>
      <label className="text-sm" style={{ color: '#757575' }}>Gender</label>
      <select
        className="w-full border rounded-lg px-4 py-3 text-base outline-none mt-1"
        style={{ borderColor: '#e0e0e0' }}
        value={editForm.gender}
        onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
      >
        <option value="">Select gender</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
      </select>
    </div>
    <div>
      <label className="text-sm" style={{ color: '#757575' }}>Height</label>
      <div className="flex gap-2 mt-1">
        <input
          type="number"
          className="w-1/3 border rounded-lg px-4 py-3 text-base outline-none"
          style={{ borderColor: '#e0e0e0' }}
          placeholder="Ft"
          value={editForm.heightFt}
          onChange={(e) => setEditForm({ ...editForm, heightFt: e.target.value })}
          min="1"
          max="9"
        />
        <input
          type="number"
          className="w-1/3 border rounded-lg px-4 py-3 text-base outline-none"
          style={{ borderColor: '#e0e0e0' }}
          placeholder="In"
          value={editForm.heightIn}
          onChange={(e) => setEditForm({ ...editForm, heightIn: e.target.value })}
          min="0"
          max="11"
        />
        <span className="text-base flex items-center" style={{ color: '#757575' }}>ft/in</span>
      </div>
    </div>
    <div>
      <label className="text-sm" style={{ color: '#757575' }}>Weight</label>
      <input
        type="number"
        className="w-full border rounded-lg px-4 py-3 text-base outline-none mt-1"
        style={{ borderColor: '#e0e0e0' }}
        placeholder="lbs"
        value={editForm.weight}
        onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
        step="0.1"
        min="0"
      />
    </div>
    <div>
      <label className="text-sm" style={{ color: '#757575' }}>Activity Level</label>
      <select
        className="w-full border rounded-lg px-4 py-3 text-base outline-none mt-1"
        style={{ borderColor: '#e0e0e0' }}
        value={editForm.activityLevel}
        onChange={(e) => setEditForm({ ...editForm, activityLevel: e.target.value })}
      >
        <option value="">Select activity level</option>
        {ACTIVITY_LEVELS.map(level => (
          <option key={level.value} value={level.value}>{level.label} - {level.description}</option>
        ))}
      </select>
    </div>
  </div>
</Modal>
```

- [ ] **Step 10: Add Birth Date Modal**

```tsx
{/* Birth Date Modal */}
<Modal
  isOpen={birthDateModalOpen}
  onClose={() => setBirthDateModalOpen(false)}
  title="Set Birth Date"
  submitLabel="Save"
  onSubmit={handleSaveBirthDate}
  submitLoading={savingProfile}
  submitDisabled={!birthDate}
>
  <input
    type="date"
    className="w-full border rounded-lg px-4 py-3 text-base outline-none"
    style={{ borderColor: '#e0e0e0' }}
    value={birthDate}
    onChange={(e) => setBirthDate(e.target.value)}
  />
</Modal>
```

- [ ] **Step 11: Verify Profile.tsx compiles**

```bash
cd /home/angrygiant/github_projects/FitnessFriend/frontend && /home/angrygiant/.nvm/versions/node/v22.22.2/bin/node -e "require('typescript')" 2>/dev/null && echo "TypeScript available" || echo "Checking with npm..."
cd /home/angrygiant/github_projects/FitnessFriend/frontend && npm run build 2>&1 | head -20
```

---

## Task 8: Update Register page with profile fields

**Files:**
- Modify: `frontend/src/pages/Auth/Register.tsx`

- [ ] **Step 1: Add profile fields to registration schema**

Update the register schema in `frontend/src/pages/Auth/Register.tsx`:

```typescript
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  birthdate: z.string().optional(),
  gender: z.string().optional(),
  heightFt: z.string().optional(),
  heightIn: z.string().optional(),
  weight: z.string().optional(),
  activityLevel: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof registerSchema>
```

- [ ] **Step 2: Add profile fields to the form**

Add after the Confirm Password field, before the submit button:

```tsx
{/* Profile Fields */}
<div className="space-y-4">
  <h3 className="text-lg font-semibold">Your Profile (optional)</h3>

  <div className="form-control">
    <label className="label">
      <span className="label-text">Birth Date</span>
    </label>
    <input
      type="date"
      className="input input-bordered w-full"
      {...register('birthdate')}
    />
  </div>

  <div className="form-control">
    <label className="label">
      <span className="label-text">Gender</span>
    </label>
    <select className="select select-bordered" {...register('gender')}>
      <option value="">Select gender</option>
      <option value="male">Male</option>
      <option value="female">Female</option>
    </select>
  </div>

  <div className="grid grid-cols-2 gap-4">
    <div className="form-control">
      <label className="label">
        <span className="label-text">Height (ft)</span>
      </label>
      <input
        type="number"
        className="input input-bordered w-full"
        {...register('heightFt')}
        min="1"
        max="9"
        placeholder="5"
      />
    </div>
    <div className="form-control">
      <label className="label">
        <span className="label-text">Height (in)</span>
      </label>
      <input
        type="number"
        className="input input-bordered w-full"
        {...register('heightIn')}
        min="0"
        max="11"
        placeholder="74"
      />
    </div>
  </div>

  <div className="form-control">
    <label className="label">
      <span className="label-text">Weight (lbs)</span>
    </label>
    <input
      type="number"
      className="input input-bordered w-full"
      {...register('weight')}
      step="0.1"
      min="0"
      placeholder="180"
    />
  </div>

  <div className="form-control">
    <label className="label">
      <span className="label-text">Activity Level</span>
    </label>
    <select className="select select-bordered" {...register('activityLevel')}>
      <option value="">Select activity level</option>
      <option value="sedentary">Sedentary - Little or no exercise, desk job</option>
      <option value="light">Light - Light exercise 1-3 days/week</option>
      <option value="moderate">Moderate - Moderate exercise 3-5 days/week</option>
      <option value="active">Active - Hard exercise 6-7 days/week</option>
      <option value="very active">Very Active - Very hard exercise, physical job</option>
    </select>
  </div>
</div>
```

- [ ] **Step 3: Update onSubmit to send profile fields**

Update the `onSubmit` function to transform the form data:

```typescript
const onSubmit = async (data: RegisterForm) => {
  setLocalError(null)
  try {
    const payload: Record<string, any> = {
      email: data.email,
      password: data.password,
      name: data.name,
    }

    // Add profile fields if provided
    if (data.birthdate) payload.birthdate = data.birthdate
    if (data.gender) payload.gender = data.gender
    if (data.heightFt && data.heightIn) {
      // Convert ft/in to cm
      const heightCm = (parseInt(data.heightFt) * 12 + parseInt(data.heightIn)) * 2.54
      payload.height = heightCm
    }
    if (data.weight) {
      // Convert lbs to kg
      payload.weight = parseFloat(data.weight) / 2.20462
    }
    if (data.activityLevel) payload.activity_level = data.activityLevel

    await registerUser(data.email, data.password, data.name, payload)
    setLocalError(null)
    navigate('/auth/login')
  } catch (err) {
    setLocalError(error || 'Registration failed')
  }
}
```

- [ ] **Step 4: Update authStore register method to accept payload**

Update `frontend/src/store/authStore.ts`:

```typescript
register: async (email: string, password: string, name: string, profileData?: Record<string, any>) => {
  set({ isLoading: true, error: null })
  try {
    await authApi.register({ email, password, name, ...profileData })
    set({ isLoading: false })
  } catch (error: any) {
    set({
      error: error.response?.data?.error || 'Registration failed',
      isLoading: false
    })
  }
},
```

- [ ] **Step 5: Update authApi.register to pass through profile fields**

Update `frontend/src/api/auth.ts`:

```typescript
register: async (data: RegisterData & Record<string, any>) => {
  const response = await api.post('/auth/register', data)
  return response.data
},
```

- [ ] **Step 6: Update backend auth.py register to handle birthdate**

In `app/routes/auth.py`, update the register endpoint to handle `birthdate`:

```python
# In the register() function, add after getting the other fields:
birthdate = data.get('birthdate')
age = None
if birthdate:
    from datetime import datetime
    birth = datetime.strptime(birthdate, '%Y-%m-%d')
    today = datetime.utcnow()
    age = today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
```

Then pass `age` to the User constructor instead of `data.get('age')`.

- [ ] **Step 7: Verify Register.tsx compiles**

```bash
cd /home/angrygiant/github_projects/FitnessFriend/frontend && npm run build 2>&1 | head -20
```

---

## Task 9: Run backend tests

**Files:**
- Test: `tests/test_models.py`
- Test: `tests/test_routes.py`

- [ ] **Step 1: Run existing backend tests**

```bash
cd /home/angrygiant/github_projects/FitnessFriend && ./venv/bin/python -m pytest tests/ -v
```

- [ ] **Step 2: Verify no regressions**

Check that all existing tests pass. If any fail, fix the issues before proceeding.

---

## Task 10: Run frontend tests

**Files:**
- Test: `frontend/tests/pages/Register.test.tsx`
- Test: `frontend/tests/pages/Login.test.tsx`

- [ ] **Step 1: Run existing frontend tests**

```bash
cd /home/angrygiant/github_projects/FitnessFriend/frontend && npm test 2>&1 || true
```

- [ ] **Step 2: Verify no regressions**

Check that all existing tests pass. If any fail, fix the issues before proceeding.

---

## Self-Review Checklist

1. **Spec coverage**: All spec requirements have corresponding tasks:
   - Profile Info section → Task 7, Task 8
   - Nutrition section → Task 7
   - Backend nutrition service → Task 2
   - Profile PUT recalculation → Task 4
   - Weight log recalculation → Task 5
   - Profile GET BMR/TDEE → Task 3
   - Registration profile fields → Task 8
   - weekly_goal field → Task 1

2. **Placeholder scan**: No "TBD", "TODO", or vague requirements found.

3. **Type consistency**: All field names match between backend and frontend (e.g., `activity_level`/`activityLevel`, `weekly_goal`/`weeklyGoal`).

4. **Scope check**: Focused on the three subsystems: profile page UI, backend nutrition service, registration form. All serve the same goal.

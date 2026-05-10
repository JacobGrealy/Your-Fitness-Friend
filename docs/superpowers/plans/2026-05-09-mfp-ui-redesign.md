# MyFitnessPal UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the entire FitnessFriend frontend to mimic MyFitnessPal's light theme, 4-tab navigation, calorie summary bar, and MFP-style diary layout, plus add weight goal tracking.

**Architecture:** Backend adds a `weight_goal_lbs` field to users. Frontend swaps DaisyUI dark theme for custom MFP-style light theme with Tailwind utility classes. Navigation restructures from 5 tabs to 4 (Home, Diary, Progress, More) with a central FAB. Pages reorganize data into MFP-style calorie summary bars, blue meal headers, and flat card design.

**Tech Stack:** Flask (Python 3.13), SQLAlchemy, React 18, TypeScript, Tailwind CSS 3.4, DaisyUI 4.4, Recharts 2.10, React Hook Form 7.49, Zustand 4.4.7

---

## Task 1: Backend — Add weight_goal_lbs to User Model

**Files:**
- Modify: `app/models/user.py`

- [ ] **Step 1: Add weight_goal_lbs column to User model**

Open `app/models/user.py`. Add a new nullable Float column: `weight_goal_lbs = db.Column(db.Float, nullable=True)`. Place it after the existing columns.

- [ ] **Step 2: Run backend tests**

```bash
./venv/bin/python -m pytest tests/ --tb=short -q
```

Expected: All existing tests still pass (24 passed, 21 skipped).

- [ ] **Step 3: Commit**

```bash
git add app/models/user.py && git commit -m "feat: add weight_goal_lbs field to User model"
```

---

## Task 2: Backend — Update Auth Profile API for Weight Goal

**Files:**
- Modify: `app/routes/auth.py`
- Test: `tests/test_routes.py`

- [ ] **Step 1: Add weight_goal_lbs to GET /auth/profile response**

In `app/routes/auth.py`, find the `profile()` route's GET handler (~line 163-174). Add `'weight_goal_lbs': current_user.weight_goal_lbs` to the user dict.

- [ ] **Step 2: Add weight_goal_lbs to PUT /auth/profile update logic**

In the same route's PUT handler (~line 176-204), add `if 'weight_goal_lbs' in data: current_user.weight_goal_lbs = data['weight_goal_lbs']` before the commit. Also add it to the response dict.

- [ ] **Step 3: Add test for weight goal update**

In `tests/test_routes.py`, add a test that creates a user, logs in, PUTs `weight_goal_lbs: 180.0` to `/api/auth/profile`, and verifies it persists via GET.

- [ ] **Step 4: Run tests**

```bash
./venv/bin/python -m pytest tests/test_routes.py -v
```

- [ ] **Step 5: Commit**

```bash
git add app/routes/auth.py tests/test_routes.py && git commit -m "feat: add weight goal update to auth profile API"
```

---

## Task 3: Frontend — Add weight_goal_lbs to UserProfile Type

**Files:**
- Modify: `frontend/src/api/types.ts`

- [ ] **Step 1: Add weight_goal_lbs to UserProfile interface**

In `frontend/src/api/types.ts`, add `weight_goal_lbs?: number` to the `UserProfile` interface.

- [ ] **Step 2: Verify frontend builds**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/types.ts && git commit -m "feat: add weight_goal_lbs to UserProfile type"
```

---

## Task 4: Frontend — Replace DaisyUI Theme with MFP Light Theme

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/tailwind.config.js` (or `.ts`)

- [ ] **Step 1: Update Tailwind config**

Read `frontend/tailwind.config.*`. Remove the DaisyUI plugin. Add `mfp` color palette to `theme.extend.colors`: blue `#185ADB`, bg `#f2f2f2`, text `#212121`, textSecondary `#757575`, border `#e0e0e0`, success `#4CAF50`, error `#E53935`. Add `fontFamily.sans` with system font stack.

- [ ] **Step 2: Update index.css**

Replace `frontend/src/index.css` with: Tailwind directives, `:root` with system font and `color: #212121`, `body` with `background-color: #f2f2f2`, `#root` with `min-height: 100vh`.

- [ ] **Step 3: Verify frontend builds**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/index.css frontend/tailwind.config.* && git commit -m "style: replace DaisyUI dark theme with MyFitnessPal light theme"
```

---

## Task 5: Frontend — Redesign Bottom Navigation (4 Tabs + FAB)

**Files:**
- Modify: `frontend/src/components/layout/BottomNav.tsx`
- Modify: `frontend/src/components/layout/Layout.tsx`
- Create: `frontend/src/components/layout/FABModal.tsx`

- [ ] **Step 1: Rewrite BottomNav.tsx**

Replace BottomNav with 4 tabs: Home (`/dashboard`), Diary (`/food/daily`), Progress (`/weight/history`), More (`/profile`). Use MFP-style icons (house, book, chart, three dots). Active tab: blue. Inactive: gray. Remove props — tabs are hardcoded. Add a centered FAB button (blue circle, white plus) positioned above the nav bar.

- [ ] **Step 2: Create FABModal.tsx**

Create a modal component that appears when FAB is tapped. Shows 3 options: Log Food, Log Weight, Log Exercise — each with an icon and label. Modal slides up from bottom on mobile, centered on desktop. Backdrop overlay closes it.

- [ ] **Step 3: Update Layout.tsx**

Remove the `items` prop from BottomNav. Change Layout background to `bg-mfp-bg`. Add `pb-20` to main content for mobile nav clearance.

- [ ] **Step 4: Verify frontend builds**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/BottomNav.tsx frontend/src/components/layout/FABModal.tsx frontend/src/components/layout/Layout.tsx && git commit -m "feat: redesign bottom nav with 4 MFP-style tabs and central FAB"
```

---

## Task 6: Frontend — Redesign Header for MFP Style

**Files:**
- Modify: `frontend/src/components/layout/Header.tsx`

- [ ] **Step 1: Rewrite Header**

Replace Header with: blue background (`bg-mfp-blue`), white text, centered title. Add optional `showDateNav` prop that renders `< Today >` date navigation below the title bar with left/right arrow buttons. Keep avatar dropdown on the right. Keep `showBack` back button. Remove DaisyUI classes — use plain Tailwind.

- [ ] **Step 2: Verify frontend builds**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/Header.tsx && git commit -m "feat: redesign header with MFP-style blue bar and date navigation"
```

---

## Task 7: Frontend — Redesign Home Page (Dashboard)

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`
- Create: `frontend/src/components/dashboard/CalorieSummaryBar.tsx`

- [ ] **Step 1: Create CalorieSummaryBar.tsx**

New component: horizontal bar showing Goal - Food + Exercise = Remaining. Each value centered with label below. Remaining turns red if negative, green if under goal. White background.

- [ ] **Step 2: Rewrite Dashboard.tsx**

Replace Dashboard layout: blue Header with title "Home", CalorieSummaryBar at top, Today's Meals overview section (collapsible meal rows that navigate to Diary), Weight snapshot card (current weight + change), Weight trend chart. Remove DaisyUI components. Use MFP colors and flat design.

- [ ] **Step 3: Verify frontend builds**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/dashboard/CalorieSummaryBar.tsx frontend/src/pages/Dashboard.tsx && git commit -m "feat: redesign home page with MFP-style calorie summary and meal overview"
```

---

## Task 8: Frontend — Redesign Diary Page (Food Daily)

**Files:**
- Modify: `frontend/src/pages/Food/DailyFood.tsx`

- [ ] **Step 1: Rewrite DailyFood.tsx**

Replace with MFP-style diary layout: blue Header with "Diary" title and `showDateNav`, CalorieSummaryBar below (Goal - Food + Exercise = Remaining), then meal sections. Each meal section: blue header bar with meal name and total calories, collapsible content with food items listed (name, calories, macros), "+ Add Food" button at bottom. Empty state shows meal rows with "0 calories". Delete button on each food item. Use MFP colors, flat white cards, blue headers.

- [ ] **Step 2: Verify frontend builds**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Food/DailyFood.tsx && git commit -m "feat: redesign diary page with MFP-style meal sections and calorie bar"
```

---

## Task 9: Frontend — Redesign Progress Page (Weight History)

**Files:**
- Modify: `frontend/src/pages/Weight/WeightHistory.tsx`
- Create: `frontend/src/components/charts/WeightChartWithGoal.tsx`

- [ ] **Step 1: Create WeightChartWithGoal.tsx**

New chart component based on existing WeightTrendChart. Blue line chart with white background. Accepts optional `goal` prop — when set, renders a dashed horizontal ReferenceLine at the goal value with "Goal" label on the right. Tooltip shows weight in lbs. Uses `#185ADB` for line and goal, `#e0e0e0` for grid, `#757575` for ticks.

- [ ] **Step 2: Rewrite WeightHistory.tsx**

Replace with Progress page: blue Header with "Progress", weight goal display card (current weight, distance to goal, goal weight), WeightChartWithGoal (passing `user.weight_goal_lbs`), Recent Entries list (blue header, white rows with date/notes on left, weight + delete on right). Import `useAuthStore` for weight goal. Use MFP colors, flat design.

- [ ] **Step 3: Verify frontend builds**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/charts/WeightChartWithGoal.tsx frontend/src/pages/Weight/WeightHistory.tsx && git commit -m "feat: redesign progress page with weight goal line on chart"
```

---

## Task 10: Frontend — Redesign More Page (Profile)

**Files:**
- Modify: `frontend/src/pages/Profile.tsx`

- [ ] **Step 1: Rewrite Profile.tsx as "More" page**

Replace with MFP-style More page: blue header section with avatar circle and email, Goals section (white card with blue header, Weight Goal row showing current goal or "Not set"), tap opens modal with goal input, Settings section (Account, Help rows with chevron icons, Sign Out button in red). Import Modal component for goal input. Use MFP colors throughout.

- [ ] **Step 2: Verify frontend builds**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Profile.tsx && git commit -m "feat: redesign profile as More page with weight goal settings"
```

---

## Task 11: Frontend — Redesign Log Weight Form

**Files:**
- Modify: `frontend/src/pages/Weight/LogWeight.tsx`

- [ ] **Step 1: Rewrite LogWeight.tsx**

Replace with MFP-style form: blue Header with "Log Weight" and back button. White background cards for each field: Date (date input), Weight (number input, large), Notes (textarea). Blue full-width "Log Weight" submit button. Remove DaisyUI Input/Select/TextArea — use plain HTML inputs with Tailwind classes (`border border-gray-300 rounded-lg`). Keep existing validation and store integration.

- [ ] **Step 2: Verify frontend builds**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Weight/LogWeight.tsx && git commit -m "feat: redesign log weight form with MFP-style inputs"
```

---

## Task 12: Frontend — Redesign Log Food Form

**Files:**
- Modify: `frontend/src/pages/Food/LogFood.tsx`

- [ ] **Step 1: Rewrite LogFood.tsx**

Replace with MFP-style form: blue Header with "Add Food" and back button. Meal type selector as horizontal blue tabs (Breakfast/Lunch/Dinner/Snacks). Food dropdown select (plain HTML `<select>`). Food info card showing name, macros, calories per serving. Quantity input. Blue "Add Food" submit button. Use `useFoodStore` for data. Remove DaisyUI components, use plain inputs with Tailwind.

- [ ] **Step 2: Verify frontend builds**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Food/LogFood.tsx && git commit -m "feat: redesign log food form with MFP-style meal tabs and search"
```

---

## Task 13: Frontend — Redesign Log Exercise Form

**Files:**
- Modify: `frontend/src/pages/Exercise/LogExercise.tsx`

- [ ] **Step 1: Rewrite LogExercise.tsx**

Replace with MFP-style form: blue Header with back button. Exercise dropdown select. Duration input (minutes). Intensity selector. Optional sets/reps/weight fields. Notes textarea. Blue "Log Exercise" submit button. Use `useExerciseStore`. Remove DaisyUI components, use plain inputs with Tailwind.

- [ ] **Step 2: Verify frontend builds**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Exercise/LogExercise.tsx && git commit -m "feat: redesign log exercise form with MFP-style inputs"
```

---

## Task 14: Frontend — Update Exercise History

**Files:**
- Modify: `frontend/src/pages/Exercise/ExerciseHistory.tsx`

- [ ] **Step 1: Rewrite ExerciseHistory**

Replace with MFP-style list: blue header "Recent Exercise", each exercise as a white card row with name + date on left, duration + calories on right, delete button. Remove shadow cards, use flat white rows with gray dividers.

- [ ] **Step 2: Verify frontend builds**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Exercise/ExerciseHistory.tsx && git commit -m "feat: redesign exercise history with MFP-style list"
```

---

## Task 15: Frontend — Update Common Components

**Files:**
- Modify: `frontend/src/components/common/Button.tsx`
- Modify: `frontend/src/components/common/Card.tsx`
- Modify: `frontend/src/components/common/Modal.tsx`
- Modify: `frontend/src/components/common/EmptyState.tsx`

- [ ] **Step 1: Update Button.tsx**

Primary: `bg-mfp-blue text-white hover:bg-blue-700 rounded-lg`. Secondary: `border border-mfp-blue text-mfp-blue rounded-lg`. Ghost: `text-mfp-textSecondary hover:text-mfp-text`. Remove all DaisyUI class references (`btn-primary`, `btn-ghost`, etc.). Replace `rounded-box` with `rounded-lg`.

- [ ] **Step 2: Update Card.tsx**

Remove shadow variants. Default: `bg-white rounded-lg`. Add optional `border` prop for divider lines. Remove DaisyUI card classes.

- [ ] **Step 3: Update Modal.tsx**

Submit button: `bg-mfp-blue text-white rounded-lg`. Cancel: `text-mfp-textSecondary`. Remove DaisyUI modal classes. Use plain Tailwind.

- [ ] **Step 4: Update EmptyState.tsx**

Action button: `bg-mfp-blue text-white rounded-lg`. Text colors: `text-mfp-text`, `text-mfp-textSecondary`.

- [ ] **Step 5: Verify frontend builds**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/common/Button.tsx frontend/src/components/common/Card.tsx frontend/src/components/common/Modal.tsx frontend/src/components/common/EmptyState.tsx && git commit -m "style: update common components for MFP light theme"
```

---

## Task 16: Frontend — Clean Up Sub-Pages

**Files:**
- Modify: `frontend/src/pages/Weight/Weight.tsx`
- Modify: `frontend/src/pages/Weight/EditWeight.tsx`
- Modify: `frontend/src/pages/Exercise/Exercise.tsx`
- Modify: `frontend/src/pages/Exercise/ExerciseLibrary.tsx`
- Modify: `frontend/src/pages/Food/Food.tsx`
- Modify: `frontend/src/pages/Food/CustomFoods.tsx`

- [ ] **Step 1: Audit sub-pages**

Run `grep -rl "import Header" frontend/src/pages/` to find pages still using Header. Sub-pages that are reached via Diary/Progress/More tabs don't need their own headers.

- [ ] **Step 2: Update each sub-page**

Remove Header import/usage from sub-pages that don't need it. Add proper padding (`pt-4` for no-header pages, `pt-14` for pages with header). Update any remaining DaisyUI classes to MFP colors. Ensure consistent flat white card design.

- [ ] **Step 3: Verify frontend builds**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Weight/Weight.tsx frontend/src/pages/Weight/EditWeight.tsx frontend/src/pages/Exercise/Exercise.tsx frontend/src/pages/Exercise/ExerciseLibrary.tsx frontend/src/pages/Food/Food.tsx frontend/src/pages/Food/CustomFoods.tsx && git commit -m "style: remove unnecessary headers from sub-pages"
```

---

## Task 17: Frontend — Add FAB Modal Animation

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Add slide-up animation**

Append to `frontend/src/index.css`: `@keyframes slide-up` that translates Y from 100% to 0% with opacity 0 to 1, 0.2s ease-out. Add `.animate-slide-up` utility class.

- [ ] **Step 2: Verify frontend builds**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css && git commit -m "style: add FAB modal slide-up animation"
```

---

## Task 18: End-to-End Testing

**Files:**
- Playwright browser testing

- [ ] **Step 1: Restart frontend dev server**

```bash
systemctl restart fitness-frontend.service
```

- [ ] **Step 2: Test navigation**

Login as `testuser@fitness.com` / `Password1`. Verify: 4 tabs (Home, Diary, Progress, More), blue FAB button centered above nav, blue header on Diary and Progress pages.

- [ ] **Step 3: Test Home page**

Navigate to `/dashboard`. Verify: CalorieSummaryBar with Goal/Food/Exercise/Remaining, Today's Meals overview, Weight snapshot, Weight trend chart.

- [ ] **Step 4: Test Diary page**

Navigate to `/food/daily`. Verify: Date navigation with "< Today >", CalorieSummaryBar, blue meal section headers (Breakfast/Lunch/Dinner/Snacks), "+ Add Food" buttons, collapsible sections.

- [ ] **Step 5: Test FAB modal**

Click FAB button. Verify: modal slides up, 3 options (Log Food/Weight/Exercise), tapping navigates correctly, backdrop closes modal.

- [ ] **Step 6: Test Progress page**

Navigate to `/weight/history`. Verify: weight goal display, chart with goal line (if goal set), recent entries list.

- [ ] **Step 7: Test More page**

Navigate to `/profile`. Verify: avatar, email, Goals section with Weight Goal, Settings section, Sign Out button.

- [ ] **Step 8: Test weight goal setting**

On More page, tap Weight Goal. Verify: modal opens, setting a goal saves it, goal shows on Progress page chart.

- [ ] **Step 9: Fix any issues**

If tests reveal problems, fix and commit:

```bash
git add frontend/src/ && git commit -m "fix: address E2E test findings from MFP redesign"
```

---

## Execution Summary

**Total tasks:** 18
**Dependencies:**
- Task 2 (backend weight goal API) before Task 9 (Progress page chart) and Task 10 (More page)
- Task 4 (theme) before all frontend tasks
- Task 5 (BottomNav) before Task 6 (Header) and Task 7 (Dashboard)
- Task 14 (common components) can be done in parallel with page tasks

**Verification commands:**
```bash
# Frontend build
cd frontend && npm run build 2>&1 | tail -5

# Backend tests
./venv/bin/python -m pytest tests/ --tb=short -q

# Playwright setup
source ~/.nvm/nvm.sh && nvm use 22.22.2 2>&1 | head -1 && playwright-cli <command>
```

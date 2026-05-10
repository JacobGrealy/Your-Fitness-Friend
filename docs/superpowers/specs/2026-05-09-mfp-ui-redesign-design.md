# MyFitnessPal UI Redesign

**Date:** 2026-05-09
**Scope:** Complete frontend UI redesign to mimic MyFitnessPal's light theme, navigation, and feature layout

---

## 1. Theme & Colors

### Palette
- **Primary blue:** `#185ADB` — MFP signature blue for headers, buttons, active states
- **Background:** `#ffffff` — clean white
- **Page background:** `#f2f2f2` — light gray for content areas
- **Text primary:** `#212121` — dark gray for body text
- **Text secondary:** `#757575` — medium gray for labels, dates, descriptions
- **Success:** `#4CAF50` — green for under-goal, positive changes
- **Error/over:** `#E53935` — red for over-limit, errors
- **Border:** `#e0e0e0` — light gray for dividers
- **Section header bg:** `#185ADB` — blue with white text
- **Section header text:** `#ffffff`

### Typography
- Font family: system font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)
- Bold for weights, calories, meal names
- Medium for section headers
- Regular for body text
- Smaller sizes for secondary info (dates, macros)

---

## 2. Navigation Structure

### 4-Tab Bottom Nav
Tabs replace the current 5-tab layout:

| Tab | Icon | Route | Replaces |
|-----|------|-------|----------|
| Home | house | `/dashboard` | Dashboard |
| Diary | book | `/food/daily` | Food daily view |
| Progress | chart | `/weight/history` | Weight history |
| More | three dots | `/profile` | Profile |

### Central FAB Button
- Blue circle (`#185ADB`), white plus icon, centered above bottom nav
- Accessible from every screen
- Opens a modal with 3 options:
  - **Log Food** → `/food/log`
  - **Log Weight** → `/weight/log`
  - **Log Exercise** → `/exercise/log`

### Header
- MFP-style blue header bar (`#185ADB`) on Diary and Progress pages
- White text, centered title
- Date navigation on Diary: `< Today >` style
- On Home/More: simple app title in white

---

## 3. Page Designs

### Home Page (`/dashboard`)
**Top section — Calorie summary bar:**
```
[Goal: 2,000] - [Food: 1,500] + [Exercise: 300] = [Remaining: 800]
```
- Horizontal layout, each value clearly labeled
- Remaining turns red if negative
- Green if under goal

**Middle section — Today's meals overview:**
- Collapsible meal sections with blue headers
- Each section shows food count and calories
- Tapping a section navigates to Diary page

**Bottom section — Weight snapshot:**
- Current weight with trend arrow
- Small weight trend chart

### Diary Page (`/food/daily`)
**Top bar:**
- Blue header with "Diary" title
- Date navigation: `< Today >` with arrow buttons
- Calendar icon for date picker

**Calorie summary bar** (below date nav):
- Same format as Home: Goal - Food + Exercise = Remaining
- Progress bar showing percentage of goal

**Meal sections:**
- Each meal has a blue header bar: "Breakfast", "Lunch", "Dinner", "Snacks"
- Header shows meal total calories on the right
- Collapsible: tap header to expand/collapse
- Inside each section:
  - Food items listed with name, calories, macros
  - "+ Add Food" button (blue text, plus icon)
  - "..." menu on right for edit/delete options
- Empty state: "Add Breakfast, 0 calories" with swipe hint

### Progress Page (`/weight/history`)
**Weight section:**
- Current weight prominently displayed
- "Since [date]" with change amount
- Weight trend chart (recharts line chart, blue line)
- Time range selector: 1W, 1M, 3M, 1Y

**Exercise section:**
- "Recent Exercise" header
- List of recent exercise logs (collapsible cards)
- Each card: exercise name, duration, calories burned, date
- Tapping navigates to exercise history detail

### More Page (`/profile`)
- User avatar (circle, blue background, white initial)
- User email/name below avatar
- Settings list (list-style with chevrons):
  - **Goals** → set calorie/macros/weight goals
  - **Preferences** → units, etc.
  - **Account** → edit profile
  - **Help** → FAQ/support
  - **Sign Out** → logout button (red text)

---

## 4. Form Pages

### Log Weight (`/weight/log`)
- White background card
- Date picker at top (MFP-style)
- Weight input field (large, prominent)
- Optional notes field
- Blue "Log Weight" button (full width)

### Log Food (`/food/log`)
- Meal type selector (Breakfast/Lunch/Dinner/Snack) as blue tabs
- Food search input
- Food results list with name, calories, serving size
- Quantity input
- Blue "Add" button

### Log Exercise (`/exercise/log`)
- Exercise search input
- Exercise results list
- Duration and intensity inputs
- Blue "Log Exercise" button

### Edit Weight (`/weight/history/:id/edit`)
- Same style as Log Weight
- Blue "Save Changes" button
- "Cancel" button in gray

---

## 5. Component Changes

### BottomNav (`BottomNav.tsx`)
- Replace 5 tabs with 4 tabs
- Add central FAB button (blue circle, + icon)
- FAB opens modal with 3 logging options
- Active tab: blue icon, blue label
- Inactive tab: gray icon, gray label

### Header (`Header.tsx`)
- Blue background (`#185ADB`) on Diary and Progress
- White text, centered title
- Date navigation on Diary
- Remove top header on Home and More (show only bottom nav)

### Card (`Card.tsx`)
- Remove shadow on most cards (MFP uses flat design)
- Add top border for meal sections
- White background, gray divider lines

### Button (`Button.tsx`)
- Primary: blue background, white text
- Secondary: transparent, blue border, blue text
- Ghost: transparent, gray text
- FAB button: blue circle, white plus

### Modal (`Modal.tsx`)
- FAB modal: 3 options in a grid (Log Food, Log Weight, Log Exercise)
- Each option: icon + label, blue accent
- Standard modals: white background, blue submit button

---

## 6. Data Flow

No backend changes required. All existing API endpoints and data shapes remain the same:
- `GET /api/dashboard/summary` → Home calorie summary
- `GET /api/food/logs` → Diary food items
- `GET /api/weight/logs` → Progress weight data
- `POST /api/food/log` → Log food
- `POST /api/weight` → Log weight
- `POST /api/exercise/log` → Log exercise

The only change is how data is displayed — reorganized into MFP-style sections.

---

## 7. Error Handling

- Network errors: show MFP-style alert banner (red background, white text)
- Empty states: centered text with action button (e.g., "No food logged today" + "Add Food" button)
- Loading states: centered spinner with gray text
- Form validation: inline error messages in red below input fields

---

## 8. Mobile-First Design

- All layouts optimized for mobile (375px width)
- Bottom nav always visible
- FAB always accessible
- Swipe gestures not implemented (tap to expand/collapse)
- Touch targets minimum 44px
- Font sizes: 16px body, 18px headers, 14px secondary, 12px labels

---

## 9. Files to Modify

| File | Change |
|------|--------|
| `frontend/src/index.css` | Custom theme colors, system font stack |
| `frontend/src/components/layout/Layout.tsx` | 4 tabs + FAB, blue header |
| `frontend/src/components/layout/BottomNav.tsx` | 4 tabs, central FAB with modal |
| `frontend/src/components/layout/Header.tsx` | Blue header, date nav on Diary |
| `frontend/src/pages/Dashboard.tsx` | Calorie summary bar, meal overview |
| `frontend/src/pages/Food/DailyFood.tsx` | MFP-style diary layout |
| `frontend/src/pages/Weight/WeightHistory.tsx` | Progress page layout |
| `frontend/src/pages/Profile.tsx` | More page with settings list |
| `frontend/src/pages/Weight/LogWeight.tsx` | MFP-style form |
| `frontend/src/pages/Food/LogFood.tsx` | MFP-style form |
| `frontend/src/pages/Exercise/LogExercise.tsx` | MFP-style form |
| `frontend/src/pages/Exercise/ExerciseHistory.tsx` | Progress exercise section |
| `frontend/src/components/common/Button.tsx` | Blue primary button style |
| `frontend/src/components/common/Card.tsx` | Flat design, no shadow |
| `frontend/src/components/common/Modal.tsx` | FAB modal + standard modal updates |
| `frontend/src/router.tsx` | Route structure stays same, nav refs updated |

---

## 10. YAGNI — Out of Scope

- Dark mode toggle (light theme only)
- Swipe gestures for meal sections
- Weight goal tracking (UI only, no backend)
- Macro breakdown pie charts
- Water intake tracking
- Recipe management
- Social features
- Export data
- Settings pages (Goals, Preferences, Account) — UI only, no functionality

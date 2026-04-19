# Plan: Create Dashboard Page

## Overview
Build the main dashboard with daily summary and quick actions.

## Tasks

### 1. Create src/pages/Dashboard.tsx
- Fetch daily summary data on mount
- Fetch weight trend data on mount
- Responsive grid layout (1 col mobile, 2-3 cols desktop)

**Daily Summary Card:**
- Calories consumed vs goal
- Progress bar with remaining calories
- Macro bars: protein, carbs, fat (with goal comparison)
- Use Card component

**Weight Trend Mini-Chart:**
- 7-day weight trend line chart
- Current weight + 24h change
- Trend indicator (up/down arrow)
- Use WeightChart component

**Quick Actions:**
- 3 action buttons or row:
  - Log weight (navigate to LogWeight page)
  - Log exercise (navigate to LogExercise page)
  - Log food (navigate to LogFood page)
- Use Button component
- Icon + label

**Weekly Progress:**
- Bar chart showing daily calorie compliance
- Streak counter
- Weekly summary stats
- Use CaloriesChart component

### 2. Add Loading States
- Skeleton loaders while data is fetching
- Show loading spinner

### 3. Add Error Handling
- Display error message if data fetch fails
- Retry button

## Expected Outcome
- Dashboard displays daily summary
- Weight trend mini-chart visible
- Quick action buttons present
- Weekly progress shown
- Loading and error states handled

## Notes
- Use useApi hook for data fetching
- Display current date at top
- Update data when returning to dashboard
- Use responsive Tailwind classes
- Ensure touch targets are 44px minimum
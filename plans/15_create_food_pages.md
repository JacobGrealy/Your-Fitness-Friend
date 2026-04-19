# Plan: Create Food Tracking Pages

## Overview
Build daily food log, food search, and custom food pages.

## Tasks

### 1. Create src/pages/Food/DailyFood.tsx
- Fetch daily food totals on mount
- 4 sections: Breakfast, Lunch, Dinner, Snack
- Each section: list of logged foods with calories
- Section totals
- Daily summary: total calories, macros, remaining
- Edit/delete each entry
- Empty state if no foods logged
- Use Card component for sections

### 2. Create src/pages/Food/LogFood.tsx
- Food search input with debounce
- Search results list (20 max)
- Each result: name, calories per serving
- Quantity selector (default 1)
- Meal type selector (breakfast/lunch/dinner/snack)
- Submit button with loading state
- Recent foods quick-add
- Navigate back to daily after success
- Use Input component

### 3. Create src/pages/Food/CustomFoods.tsx
- Fetch custom foods on mount
- List of user's custom foods
- Add custom food button
- Food card: name, calories, macros
- Edit/delete actions
- Add/Edit form: name, calories, protein, carbs, fat, serving size
- Use customFoodSchema for validation
- Use Card component

### 4. Create src/pages/Food/index.ts
- Export all food pages
- Create unified import

## Expected Outcome
- Daily food log with meal sections
- Food search and logging
- Custom food management
- Daily totals display

## Notes
- Use useApi hook for data fetching
- Debounce food search (300ms)
- Show loading states
- Handle API errors gracefully
- Quantity can be decimal (0.5, 1.5)
- Sort custom foods alphabetically
- Test search functionality
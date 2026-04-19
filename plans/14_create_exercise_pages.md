# Plan: Create Exercise Tracking Pages

## Overview
Build exercise library, logging, and history pages.

## Tasks

### 1. Create src/pages/Exercise/ExerciseLibrary.tsx
- Fetch saved exercises on mount
- List of saved exercises
- Add new exercise button
- Exercise card: name, muscle group, type
- Edit/delete actions on each card
- Search/filter by muscle group
- Empty state if no exercises
- Use Card component

### 2. Create src/pages/Exercise/LogExercise.tsx
- Use React Hook Form with logExerciseSchema
- Exercise selector (dropdown or search)
- Duration input (minutes)
- Intensity selector (low/medium/high)
- Submit button with loading state
- Success feedback on submit
- Navigate back to history after success
- Use Input component with select

### 3. Create src/pages/Exercise/ExerciseHistory.tsx
- Fetch exercise logs on mount
- Scrollable list of exercise entries
- Each entry shows: date, exercise name, duration, calories
- Filter by date range
- Total stats at top (weekly totals)
- Empty state if no logs
- Use Card component for each entry
- Format dates and durations

### 4. Create src/pages/Exercise/index.ts
- Export all exercise pages
- Create unified import

## Expected Outcome
- Exercise library with CRUD
- Exercise logging form
- Exercise history list with stats
- Search and filter functionality

## Notes
- Use useApi hook for data fetching
- Show loading states
- Handle API errors gracefully
- Exercise selector should show all saved exercises
- Consider auto-calculating calories based on exercise
- Test on mobile for dropdown interactions
# Plan: Create Weight Tracking Pages

## Overview
Build weight logging, history, and trend visualization pages.

## Tasks

### 1. Create src/pages/Weight/LogWeight.tsx
- Use React Hook Form with logWeightSchema
- Fields: weight (required), body_fat_percentage (optional), notes (optional)
- Submit button with loading state
- Success feedback on submit
- Navigate back to history after success
- Use Input component
- Center form on page

### 2. Create src/pages/Weight/WeightHistory.tsx
- Fetch weight logs on mount
- Scrollable list of weight entries
- Each entry shows: date, weight, body fat %, notes
- Swipe-to-delete option (mobile) or delete button
- Date filter (optional)
- Empty state if no logs
- Use Card component for each entry
- Format dates using formatters

### 3. Create src/pages/Weight/WeightTrend.tsx
- Fetch weight trend data on mount
- Full-screen weight chart
- Date range picker (7d, 30d, 90d, custom)
- Statistics panel: current, average, min, max
- Export button (optional)
- Use WeightChart component
- Range selector buttons

### 4. Create src/pages/Weight/index.ts
- Export all weight pages
- Create unified import

## Expected Outcome
- Weight logging form with validation
- Weight history list view
- Weight trend chart with range selector
- Statistics display
- Delete functionality

## Notes
- Use useApi hook for data fetching
- Show loading states
- Handle API errors gracefully
- Weight should be float with 1 decimal
- Sort history by date (newest first)
- Test on mobile for swipe gestures
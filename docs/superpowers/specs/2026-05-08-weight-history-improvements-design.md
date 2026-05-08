# Weight History Improvements — Design

## Overview

Three improvements to the weight history page:
1. Edit existing weight logs via a dedicated page
2. Fix history list items overflowing and poor text contrast
3. Fix chart visibility in dark mode

## 1. Edit Weight Page

### Route
- Path: `/weight/history/:id/edit`
- Located in: `frontend/src/pages/Weight/EditWeight.tsx`

### Behavior
- Fetches the weight log via `GET /weight/logs/:id` (backend exists)
- Pre-populates form with: date, weight, notes, photo URL
- Form uses React Hook Form + Zod validation (same schema as `LogWeight`)
- **Save Changes** (primary) and **Cancel** (outline) buttons
- On success: calls `PUT /weight/logs/:id` (backend exists), refreshes logs + statistics, navigates back

### Components
- Reuses: `Input`, `TextArea`, `Card`, `Button`
- Photo handling: same as `LogWeight.tsx` — preview, upload, remove
- No `forwardRef` issues — all components already have it

### Store
- New action: `updateLog(id, data)` in `weightStore.ts`
  - Calls `weightApi.updateLog(id, payload)`
  - Refreshes logs and statistics
  - Shows toast on success/error

### API
- New helper: `updateLog(id, data)` in `weight.ts`
  - `api.put(`/weight/logs/${id}`, payload)`
  - Maps response to `WeightLog` type

### Navigation
- History card items become clickable (`cursor-pointer`)
- Click → `navigate('/weight/history/${id}/edit')`
- Header gets a back button or "Edit" title with Cancel returning to history

## 2. History List Fix

### Overflow Prevention
- Card items: ensure `overflow-hidden` on the notes container
- Notes: apply `truncate` class (already exists in Tailwind)
- Flex layout: `flex-1 min-w-0` on the text container (already present)
- Add `overflow-hidden` wrapper around card content

### Color Contrast
- Date text: `text-base-content/60` → `text-base-content/70`
- Notes text: `text-base-content/70` → `text-base-content/80`
- Cards: add subtle border `border-base-300/50` for definition

## 3. Chart Visibility Fix

### Root Cause
- Chart uses DaisyUI CSS variables (`var(--bc)`, `var(--ac)`, `stroke-base-300`)
- These resolve to colors with insufficient contrast in dark mode

### Fix
- Replace CSS variables with explicit hex colors in `WeightChart.tsx`:
  - Grid lines: `stroke="#3b3b52"` (was `stroke-base-300`)
  - X-axis labels: `fill="#cdd6f4"` (was `var(--bc)`)
  - Y-axis labels: `fill="#cdd6f4"` (was `var(--bc)`)
  - Chart line: `stroke="#85baf8"` (was `var(--ac)`)
  - Data point dots: `fill="#85baf8"`
- Add dots on data points for clarity

## 4. Delete Modal Fix (bonus)

### Issue
- Modal uses `items-end` on mobile, positioning at bottom of screen
- Content overflows the modal box on small screens

### Fix
- Ensure modal box has responsive padding
- The `items-end` positioning is intentional for mobile (bottom sheet)
- Fix: add `max-h-[90vh]` and `overflow-y-auto` to modal content

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/pages/Weight/EditWeight.tsx` | **New** — edit page |
| `frontend/src/pages/Weight/WeightHistory.tsx` | Click handler, card styling, text contrast |
| `frontend/src/components/charts/WeightChart.tsx` | Explicit colors for dark mode |
| `frontend/src/api/weight.ts` | `updateLog()` helper |
| `frontend/src/store/weightStore.ts` | `updateLog()` action |
| `frontend/src/App.tsx` or router | New route `/weight/history/:id/edit` |

## Backend Status
- `GET /weight/logs/:id` — already exists
- `PUT /weight/logs/:id` — already exists
- No backend changes needed

## Testing
- Playwright test: navigate to history, click item, verify edit page loads with pre-filled data
- Playwright test: modify fields, save, verify history updates
- Playwright test: cancel edit, verify no changes made
- Visual: chart clearly visible in dark mode
- Visual: history items fit within screen width

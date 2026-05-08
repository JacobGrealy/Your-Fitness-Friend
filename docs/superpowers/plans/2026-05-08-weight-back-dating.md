# Weight Back-Dating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to log weight entries for past dates with duplicate detection and a Replace/Keep choice.

**Architecture:** Add a date picker to the Log Weight form that defaults to today. On submit, check if an entry already exists for that date and show a warning banner with Replace/Keep buttons. Backend already supports the `date` field — no backend changes needed.

**Tech Stack:** React, TypeScript, React Hook Form, Zod, Zustand, Tailwind CSS, DaisyUI

---

## File Structure

**Files to modify:**
- `frontend/src/utils/schemas.ts` — Add optional `date` field to `logWeightSchema`
- `frontend/src/types/weight.ts` — Add `date?: string` to `WeightLogCreate`
- `frontend/src/api/weight.ts` — Add `getLogsByDate()` helper, include `date` in POST payload
- `frontend/src/store/weightStore.ts` — Add `checkDuplicate()`, modify `logWeight()` to check before submitting
- `frontend/src/pages/Weight/LogWeight.tsx` — Add date input, warning banner, Replace/Keep buttons

**No backend changes needed.**

---

## Task 1: Add `date` field to schema and types

**Files:**
- Modify: `frontend/src/utils/schemas.ts:22-27`
- Modify: `frontend/src/types/weight.ts:46-51`

- [ ] **Step 1: Add `date` to `logWeightSchema`**

In `frontend/src/utils/schemas.ts`, update the `logWeightSchema` to include an optional `date` field:

```typescript
export const logWeightSchema = z.object({
  weight: z.coerce.number()
    .refine((val) => !Number.isNaN(val), { message: 'Expected number, received nan' })
    .pipe(z.number().positive('Weight must be a positive number')),
  date: z.string().optional(),
  notes: z.string().max(500, 'Notes must be at most 500 characters').optional(),
})
```

The `date` field is optional — if not provided, the backend defaults to today.

- [ ] **Step 2: Add `date` to `WeightLogCreate` type**

In `frontend/src/types/weight.ts`, update `WeightLogCreate`:

```typescript
export interface WeightLogCreate {
  weight: number
  date?: string
  photo?: File | null
  photo_url?: string | null
  notes?: string | null
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && npm run typecheck` (or equivalent TypeScript check)
Expected: No errors related to `date` field

---

## Task 2: Add `getLogsByDate()` API helper and include `date` in POST

**Files:**
- Modify: `frontend/src/api/weight.ts:5-34`

- [ ] **Step 1: Add `getLogsByDate()` helper**

In `frontend/src/api/weight.ts`, add a new method after `getLog`:

```typescript
getLogsByDate: (date: string) =>
  api.get<any[]>('/weight/logs', { params: { start_date: date, end_date: date } }).then(res =>
    res.data.map((log: any) => ({
      id: String(log.id),
      user_id: '',
      weight: log.weight_lbs,
      recorded_at: log.recorded_at,
      notes: log.notes,
      photo_url: log.photo_url,
    }))
  ),
```

This queries the backend for logs on a specific date by passing `start_date` and `end_date` as the same value.

- [ ] **Step 2: Include `date` in `logWeight` POST payload**

Update the `logWeight` method in `frontend/src/api/weight.ts`:

```typescript
logWeight: (data: Omit<WeightLogCreate, 'photo'>) =>
  api.post<WeightLog>('/weight/logs', {
    weight_lbs: data.weight,
    date: data.date,
    notes: data.notes,
    photo_url: data.photo_url,
  }).then(res => res.data),
```

The `date` field is optional — if not provided, the backend defaults to today.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && npm run typecheck`
Expected: No errors

---

## Task 3: Add `checkDuplicate()` to weight store and modify `logWeight()`

**Files:**
- Modify: `frontend/src/store/weightStore.ts:6-128`

- [ ] **Step 1: Add `checkDuplicate` to interface**

In the `WeightState` interface (line 6-20), add:

```typescript
interface WeightState {
  logs: WeightLog[]
  statistics: WeightStatistics | null
  trend: WeightTrend | null
  isLoading: boolean
  error: string | null
  uploadedPhotoUrl: string | null
  duplicateEntry: WeightLog | null
  fetchLogs: (filters?: WeightFilter) => Promise<void>
  fetchStatistics: () => Promise<void>
  fetchTrend: () => Promise<void>
  logWeight: (data: WeightLogCreate) => Promise<void>
  deleteLog: (id: string) => Promise<void>
  uploadPhoto: (file: File) => Promise<string>
  clearError: () => void
  checkDuplicate: (date: string) => Promise<WeightLog | null>
  clearDuplicate: () => void
}
```

- [ ] **Step 2: Add initial state for `duplicateEntry`**

In the initial state (line 28-34), add:

```typescript
duplicateEntry: null,
```

- [ ] **Step 3: Add `checkDuplicate` method**

Add after `clearError`:

```typescript
checkDuplicate: async (date: string) => {
  if (!date) {
    set({ duplicateEntry: null })
    return null
  }
  const logs = await weightApi.getLogsByDate(date)
  const duplicate = logs.length > 0 ? logs[0] : null
  set({ duplicateEntry: duplicate })
  return duplicate
},
clearDuplicate: () => {
  set({ duplicateEntry: null })
},
```

- [ ] **Step 4: Modify `logWeight` to check for duplicates**

Update the `logWeight` method (line 75-91) to check for duplicates before submitting:

```typescript
logWeight: async (data: WeightLogCreate) => {
  set({ isLoading: true, error: null })
  try {
    // Check for duplicate date
    const dateStr = data.date || new Date().toISOString().split('T')[0]
    const duplicate = await get().checkDuplicate(dateStr)
    
    if (duplicate) {
      // Duplicate found — set state for UI to show warning
      set({ isLoading: false })
      return
    }
    
    // No duplicate — proceed with submission
    const payload = { weight: data.weight, date: data.date, notes: data.notes, photo_url: data.photo_url }
    await weightApi.logWeight(payload)
    get().fetchLogs()
    get().fetchStatistics()
    set({ uploadedPhotoUrl: null, duplicateEntry: null })
    useUIStore.getState().showToast('Weight logged successfully', 'success')
    set({ isLoading: false })
  } catch (error: any) {
    set({
      error: error.response?.data?.message || 'Failed to log weight',
      isLoading: false,
    })
    useUIStore.getState().showToast(error.response?.data?.message || 'Failed to log weight', 'error')
  }
},
```

- [ ] **Step 5: Add `replaceEntry` method**

Add after `deleteLog`:

```typescript
replaceEntry: async (oldLogId: string, newEntry: WeightLogCreate) => {
  set({ isLoading: true, error: null })
  try {
    // Delete old entry
    await weightApi.deleteLog(oldLogId)
    
    // Submit new entry
    const payload = { weight: newEntry.weight, date: newEntry.date, notes: newEntry.notes, photo_url: newEntry.photo_url }
    await weightApi.logWeight(payload)
    get().fetchLogs()
    get().fetchStatistics()
    set({ uploadedPhotoUrl: null, duplicateEntry: null, isLoading: false })
    useUIStore.getState().showToast('Weight entry replaced successfully', 'success')
  } catch (error: any) {
    set({
      error: error.response?.data?.message || 'Failed to replace weight entry',
      isLoading: false,
    })
    useUIStore.getState().showToast(error.response?.data?.message || 'Failed to replace weight entry', 'error')
  }
},
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd frontend && npm run typecheck`
Expected: No errors

---

## Task 4: Add date picker, warning banner, and Replace/Keep buttons to LogWeight form

**Files:**
- Modify: `frontend/src/pages/Weight/LogWeight.tsx:1-227`

- [ ] **Step 1: Add imports and state**

Update imports at the top of `LogWeight.tsx`:

```typescript
import { useState, useRef, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { logWeightSchema } from '@/utils/schemas'
import type { WeightLogCreate, WeightLog } from '@/types'
import { useWeightStore } from '@/store/weightStore'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import TextArea from '@/components/common/TextArea'
import Card from '@/components/common/Card'
import { MAX_WEIGHT_LOG_NOTES } from '@/utils/constants'
```

Add state for the duplicate warning banner:

```typescript
const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)
const duplicateEntry = useWeightStore(state => state.duplicateEntry)
```

- [ ] **Step 2: Add date helper function**

Add a helper function to format today's date as YYYY-MM-DD:

```typescript
const getTodayDate = () => new Date().toISOString().split('T')[0]
```

- [ ] **Step 3: Update `useForm` with `date` default value**

Update the `useForm` call to include `date` in `defaultValues`:

```typescript
const {
  register,
  handleSubmit,
  reset,
  formState: { errors },
} = useForm<WeightLogCreate>({
  resolver: zodResolver(logWeightSchema),
  defaultValues: {
    weight: undefined,
    date: getTodayDate(),
    notes: '',
  },
})
```

- [ ] **Step 4: Update `onSubmit` to handle duplicate warning**

Replace the `onSubmit` function:

```typescript
const onSubmit = async (data: WeightLogCreate) => {
  if (selectedFile && !uploadedPhotoUrl) {
    await handleUploadPhoto()
  }
  await logWeight({
    weight: data.weight,
    date: data.date,
    notes: data.notes,
    photo_url: uploadedPhotoUrl || null,
  })
  // If duplicate was found, show warning banner
  if (duplicateEntry) {
    setShowDuplicateWarning(true)
  } else {
    reset({ weight: undefined, date: getTodayDate(), notes: '' })
    setSelectedFile(null)
    setPreviewUrl(null)
    navigate(-1)
  }
}
```

- [ ] **Step 5: Add `handleReplace` and `handleKeepExisting` handlers**

Add after `onSubmit`:

```typescript
const handleReplace = async () => {
  if (!duplicateEntry) return
  const formValues = getValues()
  await replaceEntry(duplicateEntry.id, {
    weight: formValues.weight,
    date: formValues.date,
    notes: formValues.notes || '',
    photo_url: uploadedPhotoUrl || null,
  })
  reset({ weight: undefined, date: getTodayDate(), notes: '' })
  setSelectedFile(null)
  setPreviewUrl(null)
  setShowDuplicateWarning(false)
}

const handleKeepExisting = () => {
  clearDuplicate()
  setShowDuplicateWarning(false)
}
```

Note: `getValues()` is available from `useForm` — you'll need to destructure it:

```typescript
const {
  register,
  handleSubmit,
  reset,
  getValues,
  formState: { errors },
} = useForm<WeightLogCreate>({ ...
```

- [ ] **Step 6: Add date input to form JSX**

Add the date input right after the `<form>` opening tag and before the weight input:

```tsx
<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
  {/* Date Picker */}
  <div>
    <label className="label-text text-base-content/80 mb-2 block">Date</label>
    <input
      type="date"
      {...register('date')}
      className="w-full p-3 border border-base-300 rounded-lg bg-base-100 text-base-content focus:border-primary outline-none"
    />
  </div>

  {/* Warning Banner for Duplicate */}
  {showDuplicateWarning && duplicateEntry && (
    <div className="alert alert-warning">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div>
        <h3 className="font-bold">Duplicate entry found</h3>
        <p className="text-xs">You already have a weight logged for {new Date(duplicateEntry.recorded_at).toLocaleDateString()} ({duplicateEntry.weight} lbs).</p>
        <div className="flex gap-2 mt-2">
          <Button size="sm" onClick={handleReplace}>Replace</Button>
          <Button size="sm" variant="outline" onClick={handleKeepExisting}>Keep existing</Button>
        </div>
      </div>
    </div>
  )}

  <Input ... />
  ...
</form>
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `cd frontend && npm run typecheck`
Expected: No errors

---

## Task 5: Test with Playwright

**Files:**
- Test: Manual testing via Playwright CLI

- [ ] **Step 1: Test default date = today, submit works**

```bash
source ~/.nvm/nvm.sh && nvm use 22.22.2 2>&1 | head -1 && playwright-cli goto http://localhost:5173/auth/login
```

Login, navigate to `/weight/log`, verify date field shows today's date, enter weight, submit. Verify weight appears in history.

- [ ] **Step 2: Test change date to past, submit works**

Change date to a past date (e.g., 3 days ago), enter weight, submit. Verify weight appears in history with the correct date.

- [ ] **Step 3: Test duplicate detection**

Log a weight for today (or a date that already has an entry). Click "Log Weight" again. Verify warning banner appears with "Replace" and "Keep existing" buttons.

- [ ] **Step 4: Test Replace flow**

Click "Replace". Verify old entry is deleted and new entry is saved. Verify new weight appears in history with the correct date.

- [ ] **Step 5: Test Keep existing flow**

Click "Keep existing". Verify warning banner clears. Verify no new entry is created. Verify the original entry remains.

- [ ] **Step 6: Test no warning when no duplicate**

Log a weight for a date that has no existing entry. Verify no warning appears and submission succeeds.

---

## Implementation Order Summary

1. **Task 1:** `schemas.ts` + `types/weight.ts` — add `date` field
2. **Task 2:** `weight.ts` (API) — add `getLogsByDate()` helper, include `date` in POST
3. **Task 3:** `weightStore.ts` — add `checkDuplicate()`, `replaceEntry()`, modify `logWeight()`
4. **Task 4:** `LogWeight.tsx` — add date input, warning banner, Replace/Keep buttons
5. **Task 5:** Test with Playwright

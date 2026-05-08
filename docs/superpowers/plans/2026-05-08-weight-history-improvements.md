# Weight History Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ability to edit historical weight logs, fix history list overflow/contrast issues, and fix chart visibility in dark mode.

**Architecture:** Add a new EditWeight page that reuses existing form components and the same Zod schema as LogWeight. The backend already supports GET/PUT for individual weight logs. Fix chart colors by replacing CSS variables with explicit hex values. Improve history card layout and text contrast.

**Tech Stack:** React, TypeScript, React Router v6, React Hook Form, Zod, Tailwind CSS, DaisyUI, Recharts, Zustand

---

## Task 1: Add `updateLog` to API

**Files:**
- Modify: `frontend/src/api/weight.ts`

- [ ] **Step 1: Add `updateLog` API helper**

Add this method to the `weightApi` object in `frontend/src/api/weight.ts`, after the `deleteLog` method (around line 37):

```typescript
  updateLog: (id: string, data: Omit<WeightLogCreate, 'photo'>) =>
    api.put<WeightLog>(`/weight/logs/${id}`, {
      weight_lbs: data.weight,
      date: data.date,
      notes: data.notes,
      photo_url: data.photo_url,
    }).then(res => res.data),
```

- [ ] **Step 2: Verify syntax**

Run: `cd frontend && /home/angrygiant/.nvm/versions/node/v22.22.2/bin/node -e "require('./src/api/weight.ts')" 2>&1 | head -5`
Expected: No syntax errors (TypeScript may complain about module type, which is fine — we just need no syntax errors)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/weight.ts
git commit -m "feat: add updateLog API helper for weight history edits"
```

---

## Task 2: Add `fetchLog` and `updateLog` to weight store

**Files:**
- Modify: `frontend/src/store/weightStore.ts`

- [ ] **Step 1: Add `fetchLog` to interface**

Add to the `WeightState` interface (around line 14, after `fetchLogs`):

```typescript
  fetchLog: (id: string) => Promise<WeightLog | null>
```

- [ ] **Step 2: Add `fetchLog` implementation**

Add implementation to the store object (around line 52, after `fetchLogs`):

```typescript
  fetchLog: async (id: string) => {
    try {
      const log = await weightApi.getLog(id)
      return log
    } catch {
      return null
    }
  },
```

- [ ] **Step 3: Add `updateLog` to interface**

Add to the `WeightState` interface (around line 15, after `fetchLog`):

```typescript
  updateLog: (id: string, data: WeightLogCreate) => Promise<void>
```

- [ ] **Step 4: Add `updateLog` implementation**

Add this method to the store object (around line 137, after `deleteLog`, before `clearError`):

```typescript
  updateLog: async (id: string, data: WeightLogCreate) => {
    set({ isLoading: true, error: null })
    try {
      await weightApi.updateLog(id, {
        weight: data.weight,
        date: data.date,
        notes: data.notes,
        photo_url: data.photo_url,
      })
      get().fetchLogs()
      get().fetchStatistics()
      set({ isLoading: false })
      useUIStore.getState().showToast('Weight log updated', 'success')
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update weight log',
        isLoading: false,
      })
      useUIStore.getState().showToast(error.response?.data?.message || 'Failed to update weight log', 'error')
    }
  },
```

- [ ] **Step 5: Verify syntax**

Run: `cd frontend && /home/angrygiant/.nvm/versions/node/v22.22.2/bin/node -e "require('./src/store/weightStore.ts')" 2>&1 | head -5`
Expected: No syntax errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/store/weightStore.ts
git commit -m "feat: add fetchLog and updateLog actions to weight store"
```

---

## Task 3: Create EditWeight page

**Files:**
- Create: `frontend/src/pages/Weight/EditWeight.tsx`
- Modify: `frontend/src/pages/Weight/index.ts`

- [ ] **Step 1: Create EditWeight.tsx**

Create the file `frontend/src/pages/Weight/EditWeight.tsx` with this content:

```typescript
import { useState, useRef, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from 'react-router-dom'
import { logWeightSchema } from '@/utils/schemas'
import type { WeightLogCreate } from '@/types'
import { useWeightStore } from '@/store/weightStore'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import TextArea from '@/components/common/TextArea'
import Card from '@/components/common/Card'
import { MAX_WEIGHT_LOG_NOTES } from '@/utils/constants'

export default function EditWeight() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { updateLog, uploadPhoto, error, isLoading, uploadedPhotoUrl } = useWeightStore()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [initialPhotoUrl, setInitialPhotoUrl] = useState<string | null>(null)
  const [formDataLoaded, setFormDataLoaded] = useState(false)

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  if (!id) {
    navigate(-1)
    return null
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WeightLogCreate>({
    resolver: zodResolver(logWeightSchema),
    defaultValues: {
      weight: undefined,
      date: '',
      notes: '',
    },
  })

  // Fetch log data on mount
  useEffect(() => {
    useWeightStore.getState().fetchLog(id).then((log) => {
      if (log) {
        const dateStr = new Date(log.recorded_at).toISOString().split('T')[0]
        setInitialPhotoUrl(log.photo_url)
        // Use setTimeout to ensure form is ready
        setTimeout(() => {
          register('date').onChange?.({ target: { value: dateStr } })
          register('weight').onChange?.({ target: { value: log.weight } })
          register('notes').onChange?.({ target: { value: log.notes || '' } })
          setFormDataLoaded(true)
        }, 0)
      }
    })
  }, [id, register])

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }, [])

  const handleRemovePhoto = useCallback(() => {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleUploadPhoto = useCallback(async () => {
    if (!selectedFile) return
    setPhotoUploading(true)
    try {
      await uploadPhoto(selectedFile)
    } finally {
      setPhotoUploading(false)
    }
  }, [selectedFile, uploadPhoto])

  const onSubmit = async (data: WeightLogCreate) => {
    if (!id) return
    if (selectedFile && !uploadedPhotoUrl) {
      await handleUploadPhoto()
    }
    await updateLog(id, {
      weight: data.weight,
      date: data.date,
      notes: data.notes || '',
      photo_url: uploadedPhotoUrl || null,
    })
    navigate(-1)
  }

  if (!formDataLoaded) {
    return (
      <div className="p-4 flex justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          ← Back
        </Button>
        <h1 className="text-2xl font-bold">Edit Weight Log</h1>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

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

        <Input
          label="Weight (lbs)"
          type="number"
          step="0.1"
          placeholder="e.g. 180.5"
          error={errors.weight?.message}
          {...register('weight')}
        />

        <div>
          <label className="label-text text-base-content/80 mb-2 block">Photo (optional)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
            }}
            className="hidden"
          />

          {!selectedFile ? (
            <Card shadow>
              <div
                className="card-body items-center justify-center min-h-[160px] border-2 border-dashed border-base-300 rounded-lg cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    fileInputRef.current?.click()
                  }
                }}
              >
                {initialPhotoUrl && !uploadedPhotoUrl ? (
                  <div className="relative w-full">
                    <img
                      src={initialPhotoUrl}
                      alt="Current photo"
                      className="w-full max-h-[200px] object-contain rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
                      <p className="text-sm text-white font-medium">Tap to change photo</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-10 w-10 text-base-content/30"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <p className="text-sm text-base-content/50">
                      Tap to take a photo
                    </p>
                  </>
                )}
              </div>
            </Card>
          ) : (
            <Card shadow>
              <div className="card-body items-center p-2">
                <div className="relative w-full">
                  <img
                    src={previewUrl!}
                    alt="Preview"
                    className="w-full max-h-[200px] object-contain rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute top-2 right-2 btn btn-circle btn-sm btn-ghost bg-base-100/80"
                  >
                    ✕
                  </button>
                </div>
                {!uploadedPhotoUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    fullWidth
                    loading={photoUploading}
                    onClick={handleUploadPhoto}
                  >
                    Upload Photo
                  </Button>
                )}
                {uploadedPhotoUrl && (
                  <p className="text-sm text-success mt-2">Photo uploaded</p>
                )}
              </div>
            </Card>
          )}
        </div>

        <TextArea
          label="Notes (optional)"
          placeholder="How are you feeling today?"
          maxLength={MAX_WEIGHT_LOG_NOTES}
          error={errors.notes?.message}
          {...register('notes')}
        />

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={isLoading}
          >
            Save Changes
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={() => navigate(-1)}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Export from index.ts**

Modify `frontend/src/pages/Weight/index.ts` to add:

```typescript
export { default as EditWeight } from './EditWeight'
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Weight/EditWeight.tsx frontend/src/pages/Weight/index.ts
git commit -m "feat: add EditWeight page for editing historical weight logs"
```

---

## Task 4: Add route and click navigation

**Files:**
- Modify: `frontend/src/router.tsx`
- Modify: `frontend/src/pages/Weight/WeightHistory.tsx`

- [ ] **Step 1: Add route to router.tsx**

Add this route entry to `frontend/src/router.tsx`, after the `weight/history` route (around line 57):

```typescript
      {
        path: 'weight/history/:id/edit',
        element: (
          <AuthGuard>
            <EditWeight />
          </AuthGuard>
        ),
      },
```

Also update the import at the top of the file (line 6) to include `EditWeight`:

```typescript
import { Weight, LogWeight, WeightHistory, EditWeight } from './pages/Weight'
```

- [ ] **Step 2: Add click handler to WeightHistory.tsx**

Modify `frontend/src/pages/Weight/WeightHistory.tsx`:

1. Add `useNavigate` import from `react-router-dom`
2. Add `const navigate = useNavigate()` in the component
3. Wrap the card content (the `<Card>` element) to be clickable:
   - Change the `<Card>` to wrap a clickable div, OR
   - Add an `onClick` handler to the Card that navigates to `/weight/history/${log.id}/edit`
   - Keep the delete button as a separate button that stops propagation

The key change is in the list item rendering (around line 63-86):

```tsx
<div className="space-y-3">
  {sortedLogs.map(log => (
    <div
      key={log.id}
      onClick={() => navigate(`/weight/history/${log.id}/edit`)}
      className="cursor-pointer"
    >
      <Card shadow className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold">{formatWeight(log.weight)}</span>
            <span className="text-sm text-base-content/70">{formatDate(log.recorded_at)}</span>
          </div>
          {log.notes && (
            <p className="text-sm text-base-content/80 mt-1 truncate">
              {log.notes}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            setDeleteId(log.id)
          }}
          className="text-error hover:text-error shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </Button>
      </Card>
    </div>
  ))}
</div>
```

Key changes:
- Wrap Card in a clickable div with `onClick` navigation
- Add `overflow-hidden` to the text container
- Change date text from `text-base-content/60` to `text-base-content/70`
- Change notes text from `text-base-content/70` to `text-base-content/80`
- Add `e.stopPropagation()` to the delete button so it doesn't trigger navigation
- Add `cursor-pointer` to the wrapper

- [ ] **Step 3: Commit**

```bash
git add frontend/src/router.tsx frontend/src/pages/Weight/WeightHistory.tsx
git commit -m "feat: add edit route and clickable history items"
```

---

## Task 5: Fix chart visibility in dark mode

**Files:**
- Modify: `frontend/src/components/charts/WeightChart.tsx`

- [ ] **Step 1: Replace CSS variables with explicit colors**

In `frontend/src/components/charts/WeightChart.tsx`, make these changes:

1. Change the CartesianGrid stroke (line 60):
   ```tsx
   // Before:
   <CartesianGrid strokeDasharray="3 3" className="stroke-base-300" />
   // After:
   <CartesianGrid strokeDasharray="3 3" stroke="#3b3b52" />
   ```

2. Change the XAxis tick fill (line 65):
   ```tsx
   // Before:
   tick={{ fill: 'var(--bc)', fontSize: 11 }}
   // After:
   tick={{ fill: '#cdd6f4', fontSize: 11 }}
   ```

3. Change the YAxis tick fill (line 70):
   ```tsx
   // Before:
   tick={{ fill: 'var(--bc)', fontSize: 11 }}
   // After:
   tick={{ fill: '#cdd6f4', fontSize: 11 }}
   ```

4. Change the Line stroke (line 77):
   ```tsx
   // Before:
   stroke="var(--ac)"
   // After:
   stroke="#85baf8"
   ```

5. Change the activeDot stroke (line 80):
   ```tsx
   // Before:
   activeDot={{ r: 5, stroke: 'var(--ac)', strokeWidth: 2 }}
   // After:
   activeDot={{ r: 5, stroke: '#85baf8', strokeWidth: 2 }}
   ```

6. Add dots on data points by adding `dot` prop to the Line component (line 79):
   ```tsx
   // Before:
   dot={false}
   // After:
   dot={{ fill: '#85baf8', r: 4 }}
   ```

- [ ] **Step 2: Verify syntax**

Run: `cd frontend && /home/angrygiant/.nvm/versions/node/v22.22.2/bin/node -e "require('./src/components/charts/WeightChart.tsx')" 2>&1 | head -5`
Expected: No syntax errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/charts/WeightChart.tsx
git commit -m "fix: improve chart visibility in dark mode with explicit colors"
```

---

## Task 6: Fix delete modal overflow on mobile

**Files:**
- Modify: `frontend/src/components/common/Modal.tsx`

- [ ] **Step 1: Fix modal box for mobile overflow**

In `frontend/src/components/common/Modal.tsx`, change the modal-box div (line 53):

```tsx
// Before:
<div
  className="modal-box relative w-full max-w-lg sm:max-w-xl"
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
>

// After:
<div
  className="modal-box relative w-full max-w-lg sm:max-w-xl max-h-[90vh] overflow-y-auto"
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/common/Modal.tsx
git commit -m "fix: prevent modal content overflow on mobile screens"
```

---

## Task 7: Run backend tests

**Files:**
- Test: `tests/` (if weight tests exist)

- [ ] **Step 1: Run backend tests**

Run: `./venv/bin/python -m pytest tests/ -v`
Expected: All tests pass (no new backend changes, so existing tests should still pass)

- [ ] **Step 2: Commit (if any test fixes needed)**

If tests pass, no commit needed. If test fixes are required:

```bash
git add tests/
git commit -m "fix: update tests for weight history changes"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `frontend/src/api/weight.ts` | Add `updateLog()` API helper |
| `frontend/src/store/weightStore.ts` | Add `fetchLog()` and `updateLog()` actions |
| `frontend/src/pages/Weight/EditWeight.tsx` | **New** — edit page component |
| `frontend/src/pages/Weight/index.ts` | Export `EditWeight` |
| `frontend/src/router.tsx` | Add `/weight/history/:id/edit` route, import `EditWeight` |
| `frontend/src/pages/Weight/WeightHistory.tsx` | Click handler, card styling, text contrast, delete button stopPropagation |
| `frontend/src/components/charts/WeightChart.tsx` | Explicit colors for dark mode visibility |
| `frontend/src/components/common/Modal.tsx` | Add `max-h-[90vh]` and `overflow-y-auto` |

## Testing Checklist
- [ ] Navigate to weight history, click a log item → edit page loads with pre-filled data
- [ ] Modify weight/date/notes, save → history updates, navigate back
- [ ] Cancel edit → no changes made, navigate back to history
- [ ] History items fit within screen width, text is readable
- [ ] Chart lines, grid, and labels are visible in dark mode
- [ ] Delete modal no longer overflows on mobile

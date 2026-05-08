# Weight History Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ability to edit historical weight logs, fix history list overflow/contrast issues, and fix chart visibility in dark mode.

**Architecture:** Add a new EditWeight page that reuses existing form components and the same Zod schema as LogWeight. The backend already supports GET/PUT for individual weight logs. Fix chart colors by replacing CSS variables with explicit hex values. Improve history card layout and text contrast.

**Tech Stack:** React, TypeScript, React Router v6, React Hook Form, Zod, Tailwind CSS, DaisyUI, Recharts, Zustand

---

## Task 1: Add `updateLog` to API

**Files:**
- Modify: `frontend/src/api/weight.ts:44-46`

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

## Task 2: Add `updateLog` to weight store

**Files:**
- Modify: `frontend/src/store/weightStore.ts`

- [ ] **Step 1: Add `updateLog` to interface**

Add to the `WeightState` interface (around line 18, after `deleteLog`):

```typescript
  updateLog: (id: string, data: WeightLogCreate) => Promise<void>
```

- [ ] **Step 2: Add `updateLog` implementation**

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

- [ ] **Step 3: Verify syntax**

Run: `cd frontend && /home/angrygiant/.nvm/versions/node/v22.22.2/bin/node -e "require('./src/store/weightStore.ts')" 2>&1 | head -5`
Expected: No syntax errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/store/weightStore.ts
git commit -m "feat: add updateLog action to weight store"
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
import Loading from '@/components/common/Loading'
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
        // Set form values via reset (called after form is ready)
        // We use a small timeout to ensure form is mounted
        setTimeout(() => {
          register('date').onChange?.({ target: { value: dateStr } })
          register('weight').onChange?.({ target: { value: log.weight } })
          register('notes').onChange?.({ target: { value: log.notes || '' } })
        }, 0)
        setInitialPhotoUrl(log.photo_url)
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

Wait — I need to check if `fetchLog` exists in the store. Let me verify.

<tool_call>
<function=grep>
<parameter=pattern>
fetchLog[^s]
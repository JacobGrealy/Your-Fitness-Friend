import { useState, useRef, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from 'react-router-dom'
import { logWeightSchema } from '@/utils/schemas'
import type { WeightLogCreate } from '@/types'
import { useWeightStore } from '@/store/weightStore'
import Button from '@/components/common/Button'
import Card from '@/components/common/Card'
import { MAX_WEIGHT_LOG_NOTES } from '@/utils/constants'
import Spinner from '@/components/common/Spinner'
import { localDateOf } from '@/utils/localDate'
import { weightPhotoUrl } from '@/utils/photoUrl'

export default function EditWeight() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { updateLog, uploadPhoto, error, isLoading } = useWeightStore()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [initialPhotoUrl, setInitialPhotoUrl] = useState<string | null>(null)
  const [formDataLoaded, setFormDataLoaded] = useState(false)
  // True once the user explicitly removed the stored photo; decides `photo_url: null`.
  const [photoRemoved, setPhotoRemoved] = useState(false)

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
    setValue,
    watch,
    formState: { errors },
  } = useForm<WeightLogCreate>({
    resolver: zodResolver(logWeightSchema),
    defaultValues: {
      weight: undefined,
      date: '',
      notes: '',
    },
  })

  // The store's uploadedPhotoUrl is cross-page state that updateLog never cleared, so
  // a photo uploaded on an earlier screen leaked into this one (FF-0073). This page now
  // owns its photo decision locally; clearing the slot stops it infecting other pages.
  useEffect(() => {
    useWeightStore.setState({ uploadedPhotoUrl: null })
  }, [])

  // Fetch log data on mount
  useEffect(() => {
    useWeightStore.getState().fetchLog(id).then((log) => {
      if (log) {
        const dateStr = localDateOf(log.recorded_at)
        setInitialPhotoUrl(log.photo_url ? weightPhotoUrl(log.photo_url) : null)
        setValue('date', dateStr)
        setValue('weight', log.weight)
        setFormDataLoaded(true)
      }
    })
  }, [id, setValue])

  // Previewing a picked file, else the photo already on the entry. The old guard
  // included the store's cross-page upload slot, which hid a real photo (FF-0073).
  const shownPhotoUrl = previewUrl ?? (photoRemoved ? null : initialPhotoUrl)

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setPhotoRemoved(false)
  }, [])

  const handleRemovePhoto = useCallback(() => {
    setSelectedFile(null)
    setPreviewUrl(null)
    // Explicit intent, so the save can send photo_url: null. Without this, removing
    // the photo and saving changed nothing (FF-0073).
    setPhotoRemoved((prev) => prev || Boolean(initialPhotoUrl))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [initialPhotoUrl])

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

    /**
     * Three outcomes, stated explicitly (FF-0073):
     *   new file   -> upload now, save the URL that came back
     *   removed    -> save null, so the backend clears the column
     *   untouched  -> omit the key entirely, so the backend keeps what is there
     *
     * The old code sent `uploadedPhotoUrl || null` for all three: it erased photos the
     * user never touched, and when a file had just been picked it saved null anyway
     * because the closure still held the pre-upload value.
     */
    let photoUrl: string | null | undefined
    if (selectedFile) {
      setPhotoUploading(true)
      try {
        photoUrl = await uploadPhoto(selectedFile)
      } catch {
        // The store has already shown the reason. Abandon the save rather than writing
        // a weight entry with no photo, and do not reject: that surfaced as an unhandled
        // rejection on the phone (FF-0073).
        return
      } finally {
        setPhotoUploading(false)
      }
    } else if (photoRemoved) {
      photoUrl = null
    }

    await updateLog(id, {
      weight: data.weight,
      date: data.date,
      notes: data.notes,
      photo_url: photoUrl,
    })
    navigate(-1)
  }

  if (!formDataLoaded) {
    return (
      <div className="p-4 flex justify-center">
        <Spinner />
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
        <div className="mb-4 bg-mfp-error/10 border border-mfp-error/20 text-mfp-error rounded-lg p-3">
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Date Picker */}
        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium text-mfp-text mb-2">Date</label>
          <input
            type="date"
            {...register('date')}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-white"
          />
          {errors.date && (
            <p className="mt-1 text-xs text-mfp-error">{errors.date.message}</p>
          )}
        </div>

        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium text-mfp-text mb-2">Weight (lbs)</label>
          <input
            type="number"
            step="0.1"
            placeholder="e.g. 180.5"
            {...register('weight')}
            className="w-full px-3 py-3 text-2xl border border-gray-300 rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-white"
          />
          {errors.weight && (
            <p className="mt-1 text-xs text-mfp-error">{errors.weight.message}</p>
          )}
        </div>

        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium text-mfp-text mb-2">Photo (optional)</label>
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
            <Card>
              <div
                className="items-center justify-center min-h-[160px] border-2 border-dashed border-gray-300 rounded-lg cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    fileInputRef.current?.click()
                  }
                }}
              >
                {shownPhotoUrl ? (
                  <div className="relative w-full">
                    <img
                      src={shownPhotoUrl}
                      alt="Current photo"
                      className="w-full max-h-[200px] object-contain rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
                      <p className="text-sm text-white font-medium">Tap to change photo</p>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        // The card itself opens the picker; removing must not do that.
                        event.stopPropagation()
                        handleRemovePhoto()
                      }}
                      aria-label="Remove photo"
                      className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-white/80 rounded-full text-mfp-textSecondary hover:text-mfp-text shadow-sm"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-10 w-10 text-mfp-textSecondary mx-auto"
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
                    <p className="text-sm text-mfp-textSecondary mt-2">
                      Tap to take a photo
                    </p>
                  </>
                )}
              </div>
            </Card>
          ) : (
            <Card>
              <div className="items-center p-2">
                <div className="relative w-full">
                  <img
                    src={previewUrl!}
                    alt="Preview"
                    className="w-full max-h-[200px] object-contain rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    aria-label="Remove photo"
                    className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-white/80 rounded-full text-mfp-textSecondary hover:text-mfp-text shadow-sm"
                  >
                    ✕
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  loading={photoUploading}
                  onClick={handleUploadPhoto}
                >
                  Upload now
                </Button>
                <p className="text-xs text-mfp-textSecondary mt-2">
                  Saving will attach the photo for you.
                </p>
              </div>
            </Card>
          )}
        </div>

        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium text-mfp-text mb-2">
            Notes (optional)
            <span className="font-normal text-mfp-textSecondary ml-1">
              ({MAX_WEIGHT_LOG_NOTES - (watch('notes') || '').length} left)
            </span>
          </label>
          <textarea
            {...register('notes')}
            placeholder="How are you feeling today?"
            maxLength={MAX_WEIGHT_LOG_NOTES}
            rows={3}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-white resize-none"
          />
        </div>

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

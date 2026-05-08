import { useState, useRef, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { logWeightSchema } from '@/utils/schemas'
import type { WeightLogCreate } from '@/types'
import { useWeightStore } from '@/store/weightStore'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import TextArea from '@/components/common/TextArea'
import Card from '@/components/common/Card'
import { MAX_WEIGHT_LOG_NOTES } from '@/utils/constants'

export default function LogWeight() {
  const navigate = useNavigate()
  const { logWeight, uploadPhoto, error, isLoading, uploadedPhotoUrl } = useWeightStore()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const duplicateEntry = useWeightStore(state => state.duplicateEntry)
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const getTodayDate = () => new Date().toISOString().split('T')[0]

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<WeightLogCreate>({
    resolver: zodResolver(logWeightSchema),
    defaultValues: {
      weight: undefined,
      date: getTodayDate(),
      notes: '',
    },
  })

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

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
    if (selectedFile && !uploadedPhotoUrl) {
      await handleUploadPhoto()
    }
    await logWeight({
      weight: data.weight,
      date: data.date,
      notes: data.notes,
      photo_url: uploadedPhotoUrl || null,
    })
    if (duplicateEntry) {
      setShowDuplicateWarning(true)
    } else {
      reset({ weight: undefined, date: getTodayDate(), notes: '' })
      setSelectedFile(null)
      setPreviewUrl(null)
      navigate(-1)
    }
  }

  const replaceEntry = useWeightStore(state => state.replaceEntry)

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

  const clearDuplicate = useWeightStore(state => state.clearDuplicate)

  const handleKeepExisting = () => {
    clearDuplicate()
    setShowDuplicateWarning(false)
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Log Weight</h1>

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
            onChange={handleInputChange}
            className="hidden"
          />

          {!selectedFile ? (
            <Card shadow>
              <div
                className="card-body items-center justify-center min-h-[160px] border-2 border-dashed border-base-300 rounded-lg cursor-pointer"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    fileInputRef.current?.click()
                  }
                }}
              >
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
                  Tap to take a photo or drag & drop
                </p>
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

        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={isLoading}
        >
          Log Weight
        </Button>
      </form>
    </div>
  )
}

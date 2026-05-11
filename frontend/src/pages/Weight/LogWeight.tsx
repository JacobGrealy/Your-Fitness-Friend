import { useState, useRef, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { logWeightSchema } from '@/utils/schemas'
import type { WeightLogCreate } from '@/types'
import { useWeightStore } from '@/store/weightStore'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import { MAX_WEIGHT_LOG_NOTES } from '@/utils/constants'

export default function LogWeight() {
  const { setTitle } = usePageTitle()
  const navigate = useNavigate()

  useEffect(() => { setTitle('Log Weight') }, [setTitle])
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
    const currentDuplicate = useWeightStore.getState().duplicateEntry
    if (currentDuplicate) {
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
    <div className="bg-[#f2f2f2] min-h-full">
        {error && (
          <div className="mx-4 mt-4 bg-[#E53935]/10 border border-[#E53935] rounded-lg p-3">
            <p className="text-[#E53935] text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 px-4 pt-4 pb-8">
          {/* Duplicate Warning */}
          {showDuplicateWarning && duplicateEntry && (
            <div className="bg-[#FFF3CD] border border-[#FFC107] rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#FFC107] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#212121] text-sm">Duplicate entry found</h3>
                  <p className="text-xs text-[#757575] mt-0.5">
                    You already have a weight logged for {new Date(duplicateEntry.recorded_at).toLocaleDateString()} ({duplicateEntry.weight} lbs).
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={handleReplace}
                      disabled={isLoading}
                      className="flex-1 px-4 py-2 text-sm font-medium bg-[#185ADB] text-white rounded-lg hover:bg-[#1550C0] disabled:opacity-50 transition-colors"
                    >
                      {isLoading ? 'Replacing...' : 'Replace'}
                    </button>
                    <button
                      type="button"
                      onClick={handleKeepExisting}
                      className="flex-1 px-4 py-2 text-sm font-medium bg-white text-[#212121] border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Keep existing
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Date Field */}
          <div className="bg-white rounded-lg p-4">
            <label className="block text-sm font-medium text-[#212121] mb-2">Date</label>
            <input
              type="date"
              {...register('date')}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-[#212121] focus:border-[#185ADB] focus:ring-1 focus:ring-[#185ADB] outline-none bg-white"
            />
            {errors.date && (
              <p className="mt-1 text-xs text-[#E53935]">{errors.date.message}</p>
            )}
          </div>

          {/* Weight Field */}
          <div className="bg-white rounded-lg p-4">
            <label className="block text-sm font-medium text-[#212121] mb-2">Weight (lbs)</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 180.5"
              {...register('weight')}
              className="w-full px-3 py-3 text-2xl border border-gray-300 rounded-lg text-[#212121] focus:border-[#185ADB] focus:ring-1 focus:ring-[#185ADB] outline-none bg-white"
            />
            {errors.weight && (
              <p className="mt-1 text-xs text-[#E53935]">{errors.weight.message}</p>
            )}
          </div>

          {/* Photo Upload */}
          <div className="bg-white rounded-lg p-4">
            <label className="block text-sm font-medium text-[#212121] mb-2">Photo</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleInputChange}
              className="hidden"
            />

            {!selectedFile ? (
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg cursor-pointer py-10 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#757575]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm text-[#757575]">Tap to take a photo or drag & drop</p>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={previewUrl!}
                  alt="Preview"
                  className="w-full max-h-[200px] object-contain rounded-lg border border-gray-300"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-white/80 rounded-full text-[#757575] hover:text-[#212121] shadow-sm"
                >
                  ✕
                </button>
                {!uploadedPhotoUrl && (
                  <button
                    type="button"
                    onClick={handleUploadPhoto}
                    disabled={photoUploading}
                    className="mt-2 w-full px-4 py-2 text-sm font-medium text-[#185ADB] border border-[#185ADB] rounded-lg hover:bg-[#185ADB]/5 disabled:opacity-50 transition-colors"
                  >
                    {photoUploading ? 'Uploading...' : 'Upload Photo'}
                  </button>
                )}
                {uploadedPhotoUrl && (
                  <p className="mt-2 text-sm text-green-600">Photo uploaded</p>
                )}
              </div>
            )}
          </div>

          {/* Notes Field */}
          <div className="bg-white rounded-lg p-4">
            <label className="block text-sm font-medium text-[#212121] mb-2">
              Notes
              <span className="font-normal text-[#757575] ml-1">
                ({MAX_WEIGHT_LOG_NOTES - (getValues('notes') || '').length} left)
              </span>
            </label>
            <textarea
              placeholder="How are you feeling today?"
              maxLength={MAX_WEIGHT_LOG_NOTES}
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-[#212121] focus:border-[#185ADB] focus:ring-1 focus:ring-[#185ADB] outline-none bg-white resize-none"
            />
            {errors.notes && (
              <p className="mt-1 text-xs text-[#E53935]">{errors.notes.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 text-base font-semibold bg-[#185ADB] text-white rounded-lg hover:bg-[#1550C0] disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Logging...' : 'Log Weight'}
          </button>
        </form>
      </div>
  )
}

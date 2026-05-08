import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMealsStore } from '@/store/mealsStore'
import Button from '@/components/common/Button'
import Card from '@/components/common/Card'
import Loading from '@/components/common/Loading'
import { formatCalories } from '@/utils/formatters'

export default function UploadPhoto() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadPhoto, isLoading, photos } = useMealsStore()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadComplete, setUploadComplete] = useState(false)

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setUploadComplete(false)
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

  const handleUpload = async () => {
    if (!selectedFile) return

    const formData = new FormData()
    formData.append('photo', selectedFile)

    await uploadPhoto(formData)
    setUploadComplete(true)
  }

  const handleReset = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setUploadComplete(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const latestPhoto = photos.length > 0
    ? [...photos].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]
    : null

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Upload Photo</h1>
        <Button variant="ghost" size="sm" onClick={() => navigate('/meals')}>
          Back
        </Button>
      </div>

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
            className="card-body items-center justify-center min-h-[300px] border-2 border-dashed border-base-300 rounded-lg cursor-pointer"
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
              className="h-16 w-16 text-base-content/30"
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
            <p className="text-lg font-semibold text-base-content/70">
              Tap to take a photo
            </p>
            <p className="text-sm text-base-content/50">
              or drag & drop an image here
            </p>
          </div>
        </Card>
      ) : (
        <>
          <Card shadow>
            <div className="card-body items-center">
              <img
                src={previewUrl!}
                alt="Meal preview"
                className="w-full max-h-[300px] object-contain rounded-lg"
              />
            </div>
          </Card>

          {uploadComplete && latestPhoto && latestPhoto.estimated_calories !== null && (
            <Card shadow>
              <div className="card-body">
                <h3 className="card-title text-success">Analysis Complete</h3>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="text-center">
                    <p className="text-sm text-base-content/60">Calories</p>
                    <p className="text-xl font-bold">{formatCalories(latestPhoto.estimated_calories)} cal</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-base-content/60">Protein</p>
                    <p className="text-xl font-bold">{latestPhoto.estimated_protein ?? 0}g</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-base-content/60">Carbs</p>
                    <p className="text-xl font-bold">{latestPhoto.estimated_carbs ?? 0}g</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-base-content/60">Fat</p>
                    <p className="text-xl font-bold">{latestPhoto.estimated_fat ?? 0}g</p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="primary"
              fullWidth
              loading={isLoading}
              disabled={uploadComplete}
              onClick={handleUpload}
            >
              {uploadComplete ? 'Uploaded' : 'Upload'}
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={uploadComplete ? () => navigate('/meals') : handleReset}
            >
              {uploadComplete ? 'Done' : 'Retake'}
            </Button>
          </div>
        </>
      )}

      {isLoading && (
        <div className="flex justify-center py-4">
          <Loading text="Analyzing your meal..." />
        </div>
      )}
    </div>
  )
}

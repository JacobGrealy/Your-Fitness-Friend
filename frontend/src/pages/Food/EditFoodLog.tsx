import { useState, useRef, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from 'react-router-dom'
import { editFoodLogSchema } from '@/utils/schemas'
import type { FoodLogCreate, MealType } from '@/types'
import { useFoodStore } from '@/store/foodStore'
import Button from '@/components/common/Button'
import Spinner from '@/components/common/Spinner'
import { MEAL_TYPES } from '@/utils/constants'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

export default function EditFoodLog() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { getFoodLogById, updateFoodLog, uploadFoodLogPhoto, deleteFoodLogPhoto, error, isLoading, uploadedPhotoUrl } = useFoodStore()

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
    navigate('/food/daily')
    return null
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FoodLogCreate & { meal_type: MealType }>({
    resolver: zodResolver(editFoodLogSchema),
    defaultValues: {
      food_name: '',
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      number_of_servings: 1,
      serving_size: '',
      brand: '',
      barcode_id: '',
      date: '',
      meal_type: 'lunch',
    },
  })

  useEffect(() => {
    getFoodLogById(id).then((log) => {
      if (log) {
        let photoUrl: string | null = null
        if (log.photo_url) {
          // photo_url is stored relative to the uploads root, e.g.
          // "food_log_photos/<file>.jpg"
          const backendUrl = `${window.location.origin}/api`
          photoUrl = `${backendUrl}/food/uploads/${log.photo_url}`
        }
        setInitialPhotoUrl(photoUrl)
        setValue('food_name', log.food_name)
        setValue('calories', log.calories)
        setValue('protein_g', log.protein_g ?? 0)
        setValue('carbs_g', log.carbs_g ?? 0)
        setValue('fat_g', log.fat_g ?? 0)
        setValue('number_of_servings', log.number_of_servings ?? 1)
        setValue('serving_size', log.serving_size ?? '')
        setValue('brand', log.brand ?? '')
        setValue('barcode_id', log.barcode_id ?? '')
        setValue('date', log.date)
        setValue('meal_type', log.meal_type)
        setFormDataLoaded(true)
      }
    })
  }, [id, getFoodLogById, setValue])

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
    if (!selectedFile || !id) return
    setPhotoUploading(true)
    try {
      await uploadFoodLogPhoto(id, selectedFile)
    } finally {
      setPhotoUploading(false)
    }
  }, [selectedFile, id, uploadFoodLogPhoto])

  const handleDeletePhoto = useCallback(async () => {
    if (!id) return
    await deleteFoodLogPhoto(id)
    setInitialPhotoUrl(null)
  }, [id, deleteFoodLogPhoto])

  const onSubmit = async (data: FoodLogCreate & { meal_type: MealType }) => {
    if (!id) return
    if (selectedFile && !uploadedPhotoUrl) {
      await handleUploadPhoto()
    }
    await updateFoodLog(id, {
      food_name: data.food_name,
      calories: data.calories,
      protein_g: data.protein_g,
      carbs_g: data.carbs_g,
      fat_g: data.fat_g,
      number_of_servings: data.number_of_servings,
      serving_size: data.serving_size,
      brand: data.brand,
      barcode_id: data.barcode_id,
      date: data.date,
      meal_type: data.meal_type,
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
    <div className="p-4 pb-8">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          ← Back
        </Button>
        <h1 className="text-2xl font-bold">Edit Food Log</h1>
      </div>

      {error && (
        <div className="mb-4 bg-mfp-error/10 border border-mfp-error/20 text-mfp-error rounded-lg p-3">
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Meal Type */}
        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium text-mfp-text mb-2">
            Meal Type
          </label>
          <div className="flex gap-1">
            {MEAL_TYPES.map(meal => (
              <button
                key={meal}
                type="button"
                onClick={() => setValue('meal_type', meal)}
                className={`flex-1 py-2 px-2 text-xs font-medium rounded-md transition-colors ${
                  watch('meal_type') === meal
                    ? 'bg-[#185ADB] text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {MEAL_LABELS[meal]}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs font-semibold uppercase tracking-wider text-[#757575] mt-2">Food Info</div>

        {/* Food Name */}
        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium text-mfp-text mb-2">Food Name</label>
          <input
            type="text"
            {...register('food_name')}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-[#fafafa]"
          />
          {errors.food_name && (
            <p className="mt-1 text-xs text-mfp-error">{errors.food_name.message}</p>
          )}
        </div>

        {/* Brand */}
        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium text-mfp-text mb-2">Brand (optional)</label>
          <input
            type="text"
            {...register('brand')}
            placeholder="e.g. Perdue"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-[#fafafa]"
          />
          {errors.brand && (
            <p className="mt-1 text-xs text-mfp-error">{errors.brand.message}</p>
          )}
        </div>

        <div className="text-xs font-semibold uppercase tracking-wider text-[#757575] mt-2">Nutrition</div>

        {/* Calories */}
        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium text-mfp-text mb-2">Calories</label>
          <input
            type="number"
            {...register('calories')}
            className="w-full px-3 py-3 text-3xl font-bold text-center border border-gray-300 rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-[#fafafa]"
          />
          <div className="text-center text-xs text-[#757575] mt-1">kcal</div>
          {errors.calories && (
            <p className="mt-1 text-xs text-mfp-error">{errors.calories.message}</p>
          )}
        </div>

        {/* Macros */}
        <div className="bg-white rounded-lg p-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <label className="block text-xs text-[#757575] mb-1.5 uppercase tracking-wider">Protein</label>
              <input
                type="number"
                step="0.1"
                {...register('protein_g')}
                className="w-full px-2 py-2.5 border border-gray-300 rounded-lg text-mfp-text text-center focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-[#fafafa]"
              />
            </div>
            <div className="text-center">
              <label className="block text-xs text-[#757575] mb-1.5 uppercase tracking-wider">Carbs</label>
              <input
                type="number"
                step="0.1"
                {...register('carbs_g')}
                className="w-full px-2 py-2.5 border border-gray-300 rounded-lg text-mfp-text text-center focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-[#fafafa]"
              />
            </div>
            <div className="text-center">
              <label className="block text-xs text-[#757575] mb-1.5 uppercase tracking-wider">Fat</label>
              <input
                type="number"
                step="0.1"
                {...register('fat_g')}
                className="w-full px-2 py-2.5 border border-gray-300 rounded-lg text-mfp-text text-center focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-[#fafafa]"
              />
            </div>
          </div>
          <div className="text-center text-xs text-[#757575] mt-1.5">grams</div>
          {errors.protein_g && <p className="mt-1 text-xs text-mfp-error">{errors.protein_g.message}</p>}
          {errors.carbs_g && <p className="mt-1 text-xs text-mfp-error">{errors.carbs_g.message}</p>}
          {errors.fat_g && <p className="mt-1 text-xs text-mfp-error">{errors.fat_g.message}</p>}
        </div>

        {/* Serving Size */}
        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium text-mfp-text mb-2">Serving Size (optional)</label>
          <input
            type="text"
            {...register('serving_size')}
            placeholder="e.g. 1 cup, 2 tbsp"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-[#fafafa]"
          />
        </div>

        {/* Number of Servings */}
        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium text-mfp-text mb-2">Number of Servings</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              min="0.1"
              {...register('number_of_servings')}
              className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-[#fafafa]"
            />
            <span className="text-sm text-[#757575]">servings</span>
          </div>
          {errors.number_of_servings && (
            <p className="mt-1 text-xs text-mfp-error">{errors.number_of_servings.message}</p>
          )}
        </div>

        <div className="text-xs font-semibold uppercase tracking-wider text-[#757575] mt-2">Photo</div>

        {/* Photo */}
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
            <div
              className="items-center justify-center min-h-[160px] border-2 border-dashed border-gray-300 rounded-lg cursor-pointer relative"
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
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeletePhoto()
                    }}
                    className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-white/80 rounded-full text-mfp-textSecondary hover:text-mfp-text shadow-sm"
                    aria-label="Delete photo"
                  >
                    ✕
                  </button>
                </div>
              ) : uploadedPhotoUrl ? (
                <p className="text-sm text-mfp-success">Photo uploaded</p>
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
                    Tap to add a photo
                  </p>
                </>
              )}
            </div>
          ) : (
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
                  className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-white/80 rounded-full text-mfp-textSecondary hover:text-mfp-text shadow-sm"
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
                  className="mt-2"
                >
                  Upload Photo
                </Button>
              )}
              {uploadedPhotoUrl && (
                <p className="text-sm text-mfp-success mt-2">Photo uploaded</p>
              )}
            </div>
          )}
        </div>

        <div className="text-xs font-semibold uppercase tracking-wider text-[#757575] mt-2">Date</div>

        {/* Date */}
        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium text-mfp-text mb-2">Date</label>
          <input
            type="date"
            {...register('date')}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-[#fafafa]"
          />
          {errors.date && (
            <p className="mt-1 text-xs text-mfp-error">{errors.date.message}</p>
          )}
        </div>

        {/* Barcode */}
        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium text-mfp-text mb-2">Barcode ID (optional)</label>
          <input
            type="text"
            {...register('barcode_id')}
            placeholder="e.g. 012345678901"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-[#fafafa]"
          />
          {errors.barcode_id && (
            <p className="mt-1 text-xs text-mfp-error">{errors.barcode_id.message}</p>
          )}
        </div>

        {/* Buttons */}
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

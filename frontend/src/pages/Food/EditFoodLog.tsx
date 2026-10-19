import { useState, useCallback, useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from 'react-router-dom'
import { editFoodLogSchema } from '@/utils/schemas'
import type { FoodLogCreate, MealType } from '@/types'
import { useFoodStore } from '@/store/foodStore'
import Modal from '@/components/common/Modal'
import PhotoSourceChooser from '@/components/common/PhotoSourceChooser'
import Button from '@/components/common/Button'
import Spinner from '@/components/common/Spinner'
import { MEAL_LABELS, MEAL_TYPES } from '@/utils/constants'
import {
  QUICK_SERVINGS,
  formatNumber,
  formatPerServing,
  perServingOf,
  scalePerServing,
  type PerServing,
} from '@/utils/serving'

export default function EditFoodLog() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { getFoodLogById, updateFoodLog, uploadFoodLogPhoto, deleteFoodLogPhoto, deleteFoodLog, error, isLoading } = useFoodStore()

  // Camera or gallery, chosen explicitly (FF-0078).
  const [showPhotoSources, setShowPhotoSources] = useState(false)
  // The log's own nutrition base: per-serving values loaded with the entry, used to
  // derive the totals shown as the serving count changes (FF-0086).
  const [perServing, setPerServing] = useState<PerServing>({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })
  const [brand, setBrand] = useState('')
  const [servingSize, setServingSize] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [initialPhotoUrl, setInitialPhotoUrl] = useState<string | null>(null)
  // Which photo this screen is showing, and whether THIS visit already uploaded the
  // picked file. Local on purpose: the store's uploadedPhotoUrl belongs to whichever
  // screen wrote it last (FF-0075).
  const [uploadedThisVisit, setUploadedThisVisit] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
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
    control,
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
        setPerServing(perServingOf(log))
        setBrand(log.brand ?? '')
        setServingSize(log.serving_size ?? '')
        setValue('serving_size', log.serving_size ?? '')
        setValue('brand', log.brand ?? '')
        setValue('barcode_id', log.barcode_id ?? '')
        setValue('date', log.date)
        setValue('meal_type', log.meal_type)
        setFormDataLoaded(true)
      }
    })
  }, [id, getFoodLogById, setValue])

  // useWatch rather than watch(): the typed entry has to re-render the totals as you type,
  // and watch() alone does not re-subscribe for a registered number input.
  const watchedServings = useWatch({ control, name: 'number_of_servings' })
  const currentServings = Number(watchedServings) > 0 ? Number(watchedServings) : 1
  const totals = useMemo(
    () => scalePerServing(perServing, currentServings),
    [perServing, currentServings]
  )
  const setServings = useCallback(
    (value: number) => setValue('number_of_servings', value, { shouldDirty: true, shouldValidate: true }),
    [setValue]
  )

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }, [])

  const handleRemovePhoto = useCallback(() => {
    setSelectedFile(null)
    setPreviewUrl(null)
  }, [])

  useEffect(() => {
    // Clear the cross-page slot so it cannot steer this screen or the next one.
    useFoodStore.setState({ uploadedPhotoUrl: null })
  }, [])

  const handleUploadPhoto = useCallback(async () => {
    if (!selectedFile || !id) return
    setPhotoUploading(true)
    try {
      const url = await uploadFoodLogPhoto(id, selectedFile)
      setUploadedThisVisit(url)
      return url
    } finally {
      setPhotoUploading(false)
    }
  }, [selectedFile, id, uploadFoodLogPhoto])

  // Newly uploaded photo, else the entry's own photo. A picked file previews first.
  const shownPhotoUrl = previewUrl ?? uploadedThisVisit ?? initialPhotoUrl

  const handleDeleteEntry = useCallback(async () => {
    if (!id) return
    await deleteFoodLog(id)
    setConfirmDelete(false)
    navigate('/food/daily')
  }, [id, deleteFoodLog, navigate])

  const handleDeletePhoto = useCallback(async () => {
    if (!id) return
    await deleteFoodLogPhoto(id)
    setInitialPhotoUrl(null)
  }, [id, deleteFoodLogPhoto])

  const onSubmit = async (data: FoodLogCreate & { meal_type: MealType }) => {
    if (!id) return
    // The guard reads this page's own state, not the store field another screen writes:
    // a stale uploadedPhotoUrl from a previous log silently cancelled the upload here
    // and the picked file was lost (FF-0075).
    if (selectedFile && !uploadedThisVisit) {
      try {
        await handleUploadPhoto()
      } catch {
        return      // stay put: the store has already explained the failure
      }
    }
    const basePayload = {
      food_name: data.food_name,
      number_of_servings: data.number_of_servings,
      // Per-serving, not totals: the log's macros follow the count on the server, which is
      // the bug this screen exists to fix (FF-0083/FF-0086).
      calories_per_serving: perServing.calories,
      protein_per_serving: perServing.protein_g,
      carbs_per_serving: perServing.carbs_g,
      fat_per_serving: perServing.fat_g,
      serving_size: data.serving_size,
      date: data.date,
      meal_type: data.meal_type,
    }

    await updateFoodLog(id, basePayload)
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

        <div className="text-xs font-semibold uppercase tracking-wider text-[#757575] mt-2">Food</div>

        {/* What was eaten. The editable details live on their own screen: macros per
            serving belong to the food, the serving count belongs to this log (FF-0086). */}
        <div className="bg-white rounded-lg p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-semibold truncate" style={{ color: '#212121' }}>
                {watch('food_name') || 'Untitled food'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#757575' }}>
                {[brand, servingSize].filter(Boolean).join(' · ') || 'No brand or serving size'}
              </p>
              <p className="text-xs mt-2" style={{ color: '#757575' }}>
                {formatPerServing(perServing)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/food/log/${id}/food`)}
              className="flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-lg border"
              style={{ borderColor: '#185ADB', color: '#185ADB' }}
            >
              Edit food details
            </button>
          </div>
        </div>

        {/* Servings - the only nutrition control that belongs to the log itself. */}
        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium text-mfp-text mb-2">Number of Servings</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              {...register('number_of_servings')}
              aria-label="Number of servings"
              className="flex-1 min-w-0 px-3 py-2.5 border border-gray-300 rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-[#fafafa]"
            />
            <span className="text-sm text-[#757575]">servings</span>
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {QUICK_SERVINGS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setServings(value)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                style={{
                  borderColor: currentServings === value ? '#185ADB' : '#e0e0e0',
                  background: currentServings === value ? '#185ADB' : '#fff',
                  color: currentServings === value ? '#fff' : '#212121',
                }}
              >
                {value === 0.25 ? '¼' : value === 0.5 ? '½' : value === 1.5 ? '1½' : value}
              </button>
            ))}
          </div>

          {/* Totals are derived, so they move the moment the count does. */}
          <div className="mt-3 rounded-lg px-3 py-2" style={{ background: '#f2f2f2' }}>
            <p className="text-lg font-bold" style={{ color: '#212121' }}>
              {Math.round(totals.calories).toLocaleString()} kcal
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#757575' }}>
              P {formatNumber(totals.protein_g)} · C {formatNumber(totals.carbs_g)} · F {formatNumber(totals.fat_g)}
            </p>
          </div>
          {errors.number_of_servings && (
            <p className="mt-1 text-xs text-mfp-error">{errors.number_of_servings.message}</p>
          )}
        </div>

        <div className="text-xs font-semibold uppercase tracking-wider text-[#757575] mt-2">Photo</div>

        {/* Photo */}
        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium text-mfp-text mb-2">Photo (optional)</label>
          <PhotoSourceChooser
            open={showPhotoSources}
            onClose={() => setShowPhotoSources(false)}
            onSelect={handleFileSelect}
          />

          {!selectedFile ? (
            <div
              className="items-center justify-center min-h-[160px] border-2 border-dashed border-gray-300 rounded-lg cursor-pointer relative"
              onClick={() => setShowPhotoSources(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setShowPhotoSources(true)
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
              <Button
                type="button"
                variant="outline"
                fullWidth
                loading={photoUploading}
                onClick={handleUploadPhoto}
                className="mt-2"
              >
                {uploadedThisVisit ? 'Upload again' : 'Upload now'}
              </Button>
              <p className="text-xs text-mfp-textSecondary mt-1">
                {uploadedThisVisit
                  ? 'Photo attached. Saving will keep it.'
                  : 'Saving will attach the photo for you.'}
              </p>
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
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="w-full py-2.5 text-sm font-medium"
          style={{ color: '#c62828' }}
        >
          Delete this entry
        </button>

        <Modal
          isOpen={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          title="Delete Entry"
          submitLabel="Delete"
          onSubmit={handleDeleteEntry}
          submitLoading={isLoading}
        >
          <p style={{ color: '#757575' }}>
            Delete this entry from the diary? The food itself stays in your list.
          </p>
        </Modal>
      </form>
    </div>
  )
}

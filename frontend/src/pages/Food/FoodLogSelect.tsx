import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFoodStore } from '@/store/foodStore'
import { foodApi } from '@/api/food'
import PhotoSourceChooser from '@/components/common/PhotoSourceChooser'
import { foodLogPhotoUrl } from '@/utils/photoUrl'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import type { Food, FoodLogCreate, MealType, ExternalFood } from '@/types'
import { MEAL_LABELS, MEAL_TYPES } from '@/utils/constants'
import { quickAddFoodSchema } from '@/utils/schemas'
import { isMealType } from '@/utils/meal'
import Loading from '@/components/common/Loading'
import { resolveReturnTo } from '@/utils/returnTo'
import { todayLocal } from '@/utils/localDate'
import QuantityFields from '@/components/food/QuantityFields'
import { servingCount } from '@/utils/quantities'
import { scalePerServing, formatNumber } from '@/utils/serving'

export default function FoodLogSelect() {
  const { setTitle } = usePageTitle()
  const navigate = useNavigate()
  const location = useLocation()
  const externalFood = (location.state as { externalFood?: ExternalFood } | null)?.externalFood
  const [searchParams] = useSearchParams()
  const { foodId } = useParams<{ foodId?: string }>()
  const { foods, isLoading, logFood, uploadFoodLogPhoto, createFood, fetchFoods, error, clearError } = useFoodStore()

  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const [referenceAmount, setReferenceAmount] = useState('1')
  const [referenceUnit, setReferenceUnit] = useState('serving')
  const [amount, setAmount] = useState('1')
  const [unit, setUnit] = useState('serving')
  const [structured, setStructured] = useState(true)
  const [quantityError, setQuantityError] = useState<string | null>(null)
  const reference = { serving_amount: Number(referenceAmount), serving_unit: referenceUnit }
  const loadReference = (food: Food) => {
    setStructured(!!food.serving_amount)
    setReferenceAmount(food.serving_amount ? String(food.serving_amount) : '')
    setReferenceUnit(food.serving_unit || 'serving')
    setAmount(searchParams.get('amount') || String(food.serving_amount || 1))
    setUnit(searchParams.get('unit') || food.serving_unit || 'serving')
  }
  const [isQuickAdd, setIsQuickAdd] = useState(false)
  // ?meal= comes from whichever meal section opened the flow; anything else
  // (or nothing) falls back to breakfast as before (FF-0038).
  const mealFromUrl = searchParams.get('meal')
  const initialMealType: MealType = isMealType(mealFromUrl) ? mealFromUrl : 'breakfast'
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Photo at creation time (FF-0087): either a freshly picked file, or the picture from the
  // last time this food was logged, which the server will copy.
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [carriedPhoto, setCarriedPhoto] = useState<string | null>(null)
  const [showPhotoSources, setShowPhotoSources] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors: formErrors },
    watch,
  } = useForm({
    resolver: zodResolver(quickAddFoodSchema),
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
      date: todayLocal(),
      meal_type: initialMealType,
    },
  })

  const food_name = watch('food_name')
  const foodName = food_name
  const calories = watch('calories')
  const meal_type = watch('meal_type')

  useEffect(() => {
    setTitle('Add Food')
    clearError()
    fetchFoods()
  }, [fetchFoods, clearError])

  useEffect(() => {
    if (!externalFood) return
    const draft = { ...externalFood, id: `off:${externalFood.barcode_id}`, user_id: '', created_at: '' }
    setSelectedFood(draft)
    setIsQuickAdd(false)
    loadReference(draft)
    setValue('food_name', draft.name)
    setValue('calories', draft.calories)
    setValue('protein_g', draft.protein_g)
    setValue('carbs_g', draft.carbs_g)
    setValue('fat_g', draft.fat_g)
    setValue('serving_size', draft.serving_size || '')
    setValue('brand', draft.brand || '')
    setValue('barcode_id', draft.barcode_id || '')
  }, [externalFood, setValue])

  useEffect(() => {
    if (externalFood) return
    const historyName = searchParams.get('name')
    const historyCalories = searchParams.get('calories')

    if (historyName && historyCalories) {
      setIsQuickAdd(true)
      setValue('food_name', historyName)
      setValue('calories', parseInt(historyCalories, 10) || 0)
      setValue('protein_g', parseFloat(searchParams.get('protein') || '0'))
      setValue('carbs_g', parseFloat(searchParams.get('carbs') || '0'))
      setValue('fat_g', parseFloat(searchParams.get('fat') || '0'))
      setValue('serving_size', searchParams.get('serving_size') || '')
      setValue('brand', searchParams.get('brand') || '')
      setValue('barcode_id', searchParams.get('barcode_id') || '')
    } else if (!foodId) {
      setIsQuickAdd(true)
    }
  }, [searchParams, setValue, foodId])

  useEffect(() => {
    if (!foods.length) return

    const historyFoodId = searchParams.get('foodId')
    if (historyFoodId) {
      const food = foods.find(f => String(f.id) === historyFoodId)
      if (food) {
        setSelectedFood(food)
        loadReference(food)
        setValue('food_name', food.name)
        setValue('calories', food.calories)
        setValue('protein_g', food.protein_g)
        setValue('carbs_g', food.carbs_g)
        setValue('fat_g', food.fat_g)
        setValue('serving_size', food.serving_size || '')
        setValue('brand', food.brand || '')
        return
      }
    }

    if (foodId) {
      const food = foods.find(f => String(f.id) === foodId)
      if (food) {
        setSelectedFood(food)
        loadReference(food)
        setValue('food_name', food.name)
        setValue('calories', food.calories)
        setValue('protein_g', food.protein_g)
        setValue('carbs_g', food.carbs_g)
        setValue('fat_g', food.fat_g)
        setValue('serving_size', food.serving_size || '')
        setValue('brand', food.brand || '')
        return
      }
    }
  }, [foods, foodId, searchParams, setValue])

  // Offer the photo from the previous log the moment we know which food this is.
  useEffect(() => {
    const foodId = selectedFood && !externalFood ? String(selectedFood.id) : undefined
    const name = (foodName || '').trim()
    if (!foodId && !name) {
      setCarriedPhoto(null)
      return
    }
    void latestFoodPhoto(foodId, name)
  }, [selectedFood, foodName])

  const latestFoodPhoto = useCallback(
    async (foodId: string | undefined, name: string) => {
      try {
        const result = await foodApi.getLatestPhoto({
          food_id: foodId,
          food_name: foodId ? undefined : name,
        })
        setCarriedPhoto(result.photo_url ?? null)
      } catch {
        setCarriedPhoto(null)
      }
    },
    []
  )

  const handlePickPhoto = useCallback((file: File) => {
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }, [])

  const onSubmit = async (data: any) => {
    setIsSubmitting(true)
    try {
      const quantityNum = structured ? servingCount(Number(amount), unit, reference) : parseFloat(data.number_of_servings) || 1
      if (quantityNum <= 0 || !Number.isFinite(quantityNum) ||
          (structured && (!Number.isFinite(Number(referenceAmount)) || Number(referenceAmount) <= 0))) {
        setQuantityError('Enter a positive serving size and amount eaten.')
        return
      }
      setQuantityError(null)
      const servingFields = structured ? {
        ...reference, serving_size: `${referenceAmount} ${referenceUnit}`,
      } : { serving_size: data.serving_size || '' }
      let createdFoodId: string | undefined

      if (data.food_name && !externalFood) {
        const foodCreate: any = {
          name: data.food_name,
          calories: data.calories,
          protein_g: data.protein_g || 0,
          carbs_g: data.carbs_g || 0,
          fat_g: data.fat_g || 0,
          ...servingFields,
          brand: data.brand || undefined,
          barcode_id: data.barcode_id || undefined,
        }
        if (selectedFood?.user_id) {
          foodCreate.food_id = String(selectedFood.id)
        }
        const response = await createFood(foodCreate)
        if (response && response.id) {
          createdFoodId = String(response.id)
          setSelectedFood({ ...response } as Food)
        }
      }

      const logData: FoodLogCreate = {
        food_id: externalFood ? undefined : createdFoodId || (selectedFood ? String(selectedFood.id) : undefined),
        external_food_token: externalFood?.token,
        quantity: quantityNum,
        food_name: data.food_name || 'Quick Add',
        calories: Math.round(data.calories * quantityNum),
        protein_g: (data.protein_g || 0) * quantityNum,
        carbs_g: (data.carbs_g || 0) * quantityNum,
        fat_g: (data.fat_g || 0) * quantityNum,
        meal_type: meal_type as FoodLogCreate['meal_type'],
        number_of_servings: quantityNum,
        ...servingFields,
        ...(structured ? {
          amount: Number(amount), unit,
          calories_per_serving: Number(data.calories), protein_per_serving: Number(data.protein_g || 0),
          carbs_per_serving: Number(data.carbs_g || 0), fat_per_serving: Number(data.fat_g || 0),
        } : {}),
        brand: data.brand || undefined,
        barcode_id: data.barcode_id || undefined,
        date: data.date || todayLocal(),
        // A carried photo is copied server-side so each log owns its own file.
        photo_url: !photoFile && carriedPhoto ? carriedPhoto : undefined,
      }

      const created = await logFood(logData)

      // A freshly picked photo needs the new log's id, so it is uploaded straight after
      // creation - one action for the user, two requests, and a failure is reported rather
      // than swallowed (FF-0073).
      if (photoFile && created && 'id' in created && created.id) {
        await uploadFoodLogPhoto(String(created.id), photoFile)
      }

      // Back to wherever the flow was entered from (the diary, usually), never
      // back into the add flow itself (FF-0021).
      navigate(resolveReturnTo(location.state), { replace: true })
    } catch {
      // Error handled by store
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading && !selectedFood && !isQuickAdd) {
    return (
      <div className="bg-[#f2f2f2] flex justify-center py-12">
        <Loading text="Loading food..." />
      </div>
    )
  }

  const displayName = selectedFood?.name || food_name || 'Unnamed Food'

  return (
    <div className="bg-[#f2f2f2]">
      {/* Header */}
      <div className="bg-white border-b border-[#e0e0e0] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="text-[#185ADB] text-sm font-medium"
        >
          ← Back
        </button>
        <h1 className="font-bold text-[#212121]">{isQuickAdd ? 'Quick Add' : displayName}</h1>
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting || !calories}
          className="text-[#185ADB] disabled:opacity-30"
          aria-label="Submit"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-4 bg-mfp-error/10 border border-mfp-error/20 text-mfp-error rounded-lg p-3">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
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
          <label className="block text-sm font-medium text-mfp-text mb-2">Food Name (optional)</label>
          <input
            type="text"
            {...register('food_name')}
            placeholder="e.g. Banana"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-[#fafafa]"
          />
          {formErrors.food_name && (
            <p className="mt-1 text-xs text-mfp-error">{formErrors.food_name.message}</p>
          )}
        </div>

        {/* Brand */}
        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium text-mfp-text mb-2">Brand (optional)</label>
          <input
            type="text"
            {...register('brand')}
            placeholder="e.g. USDA"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-[#fafafa]"
          />
        </div>

        <div className="text-xs font-semibold uppercase tracking-wider text-[#757575] mt-2">Nutrition</div>

        {/* Calories */}
        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium text-mfp-text mb-2">Calories</label>
          <input
            type="number"
            min="1"
            {...register('calories')}
            className="w-full px-3 py-3 text-3xl font-bold text-center border border-gray-300 rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-[#fafafa]"
          />
          <div className="text-center text-xs text-[#757575] mt-1">kcal</div>
          {formErrors.calories && (
            <p className="mt-1 text-xs text-mfp-error">{formErrors.calories.message}</p>
          )}
        </div>

        {/* Macros */}
        <div className="bg-white rounded-lg p-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <label className="block text-xs text-[#757575] mb-1.5 uppercase tracking-wider">Protein</label>
              <input
                type="number"
                min="0"
                step="0.1"
                {...register('protein_g')}
                className="w-full px-2 py-2.5 border border-gray-300 rounded-lg text-mfp-text text-center focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-[#fafafa]"
              />
            </div>
            <div className="text-center">
              <label className="block text-xs text-[#757575] mb-1.5 uppercase tracking-wider">Carbs</label>
              <input
                type="number"
                min="0"
                step="0.1"
                {...register('carbs_g')}
                className="w-full px-2 py-2.5 border border-gray-300 rounded-lg text-mfp-text text-center focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-[#fafafa]"
              />
            </div>
            <div className="text-center">
              <label className="block text-xs text-[#757575] mb-1.5 uppercase tracking-wider">Fat</label>
              <input
                type="number"
                min="0"
                step="0.1"
                {...register('fat_g')}
                className="w-full px-2 py-2.5 border border-gray-300 rounded-lg text-mfp-text text-center focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-[#fafafa]"
              />
            </div>
          </div>
          <div className="text-center text-xs text-[#757575] mt-1.5">grams</div>
          {formErrors.protein_g && <p className="mt-1 text-xs text-mfp-error">{formErrors.protein_g.message}</p>}
          {formErrors.carbs_g && <p className="mt-1 text-xs text-mfp-error">{formErrors.carbs_g.message}</p>}
          {formErrors.fat_g && <p className="mt-1 text-xs text-mfp-error">{formErrors.fat_g.message}</p>}
        </div>

        {/* Serving Size */}
        <div className="bg-white rounded-lg p-4">
          {structured ? <>
            <QuantityFields label="Serving Size" amount={referenceAmount} unit={referenceUnit}
              onAmount={setReferenceAmount} onUnit={value => { setReferenceUnit(value); setUnit(value) }} />
            <p className="text-xs text-[#757575] mt-2">The nutrition above is for this amount.</p>
          </> : <>
            <label className="block text-sm font-medium text-mfp-text mb-2">Serving Size (optional)</label>
            <input type="text" {...register('serving_size')} className="w-full px-3 py-2.5 border rounded-lg" />
            <button type="button" className="text-sm text-[#185ADB] mt-2" onClick={() => { setStructured(true); setReferenceAmount('1') }}>Set numeric serving size and unit</button>
          </>}
        </div>

        {/* Photo - attach it here rather than logging first and editing after (FF-0087). */}
        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium text-mfp-text mb-2">Photo (optional)</label>

          <PhotoSourceChooser
            open={showPhotoSources}
            onClose={() => setShowPhotoSources(false)}
            onSelect={handlePickPhoto}
            title="Add a photo"
          />

          {(photoPreview || carriedPhoto) && (
            <div className="relative">
              <img
                src={photoPreview ?? foodLogPhotoUrl(carriedPhoto as string)}
                alt={photoPreview ? 'Selected photo' : 'Photo from your last log'}
                className="w-full max-h-[200px] object-contain rounded-lg"
              />
              {!photoPreview && (
                <p className="text-[11px] mt-1" style={{ color: '#757575' }}>
                  From your last log — saving copies it onto this entry.
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => setShowPhotoSources(true)}
              className="flex-1 py-2 text-sm font-medium rounded-lg border"
              style={{ borderColor: '#185ADB', color: '#185ADB' }}
            >
              {photoPreview || carriedPhoto ? 'Change photo' : 'Add photo'}
            </button>
            {(photoPreview || carriedPhoto) && (
              <button
                type="button"
                onClick={() => {
                  setPhotoFile(null)
                  setPhotoPreview(null)
                  setCarriedPhoto(null)
                }}
                className="px-3 py-2 text-sm rounded-lg border"
                style={{ borderColor: '#e0e0e0', color: '#757575' }}
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {quantityError && <p role="alert" className="text-sm text-red-700">{quantityError}</p>}
        {structured && <div className="bg-white rounded-lg p-4">
          <QuantityFields label="Amount eaten" amount={amount} unit={unit} referenceUnit={referenceUnit}
            onAmount={setAmount} onUnit={setUnit} />
          <div aria-live="polite" className="mt-3 pt-3 border-t text-sm text-[#757575]">
            {(() => {
              const preview = scalePerServing({ calories: Number(calories), protein_g: Number(watch('protein_g')),
                carbs_g: Number(watch('carbs_g')), fat_g: Number(watch('fat_g')) }, servingCount(Number(amount), unit, reference))
              return `${formatNumber(preview.calories)} cal · P ${formatNumber(preview.protein_g)} · C ${formatNumber(preview.carbs_g)} · F ${formatNumber(preview.fat_g)}`
            })()}
          </div>
        </div>}
        {/* Legacy servings remain usable without guessing a reference. */}
        {!structured && <div className="bg-white rounded-lg p-4">
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
          {formErrors.number_of_servings && (
            <p className="mt-1 text-xs text-mfp-error">{formErrors.number_of_servings.message}</p>
          )}
        </div>}


        <div className="text-xs font-semibold uppercase tracking-wider text-[#757575] mt-2">Date</div>

        {/* Date */}
        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium text-mfp-text mb-2">Date</label>
          <input
            type="date"
            {...register('date')}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-[#fafafa]"
          />
          {formErrors.date && (
            <p className="mt-1 text-xs text-mfp-error">{formErrors.date.message}</p>
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
        </div>

        {externalFood && <p className="text-xs text-[#757575]">
          {externalFood.source === 'usda' ? 'USDA FoodData Central' : 'Open Food Facts'} · This food is saved to your database when you log it.
        </p>}
        {selectedFood && selectedFood.id && !externalFood && (
          <div className="bg-white rounded-lg p-4">
            <label className="block text-sm font-medium text-[#757575] mb-2">
              Food ID
            </label>
            <p className="text-sm text-[#212121]">{selectedFood.id}</p>
          </div>
        )}
      </form>
    </div>
  )
}

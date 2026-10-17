import { useState, useEffect } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFoodStore } from '@/store/foodStore'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import type { Food, FoodLogCreate, MealType } from '@/types'
import { MEAL_TYPES } from '@/utils/constants'
import { quickAddFoodSchema } from '@/utils/schemas'
import { isMealType } from '@/utils/meal'
import Loading from '@/components/common/Loading'
import { resolveReturnTo } from '@/utils/returnTo'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

export default function FoodLogSelect() {
  const { setTitle } = usePageTitle()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { foodId } = useParams<{ foodId?: string }>()
  const { foods, isLoading, logFood, createFood, fetchFoods, error, clearError } = useFoodStore()

  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const [isQuickAdd, setIsQuickAdd] = useState(false)
  // ?meal= comes from whichever meal section opened the flow; anything else
  // (or nothing) falls back to breakfast as before (FF-0038).
  const mealFromUrl = searchParams.get('meal')
  const initialMealType: MealType = isMealType(mealFromUrl) ? mealFromUrl : 'breakfast'
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      date: new Date().toISOString().split('T')[0],
      meal_type: initialMealType,
    },
  })

  const food_name = watch('food_name')
  const calories = watch('calories')
  const meal_type = watch('meal_type')

  useEffect(() => {
    setTitle('Add Food')
    clearError()
    fetchFoods()
  }, [fetchFoods, clearError])

  useEffect(() => {
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

  const onSubmit = async (data: any) => {
    setIsSubmitting(true)
    try {
      const quantityNum = parseFloat(data.number_of_servings) || 1
      let createdFoodId: string | undefined

      if (data.food_name) {
        const foodCreate: any = {
          name: data.food_name,
          calories: data.calories,
          protein_g: data.protein_g || 0,
          carbs_g: data.carbs_g || 0,
          fat_g: data.fat_g || 0,
          serving_size: data.serving_size || '',
          brand: data.brand || undefined,
          barcode_id: data.barcode_id || undefined,
        }
        if (selectedFood) {
          foodCreate.food_id = String(selectedFood.id)
        }
        const response = await createFood(foodCreate)
        if (response && response.id) {
          createdFoodId = String(response.id)
          setSelectedFood({ ...response } as Food)
        }
      }

      const logData: FoodLogCreate = {
        food_id: createdFoodId || (selectedFood ? String(selectedFood.id) : undefined),
        quantity: quantityNum,
        food_name: data.food_name || 'Quick Add',
        calories: Math.round(data.calories * quantityNum),
        protein_g: (data.protein_g || 0) * quantityNum,
        carbs_g: (data.carbs_g || 0) * quantityNum,
        fat_g: (data.fat_g || 0) * quantityNum,
        meal_type: meal_type as FoodLogCreate['meal_type'],
        number_of_servings: quantityNum,
        serving_size: data.serving_size || '',
        brand: data.brand || undefined,
        barcode_id: data.barcode_id || undefined,
        date: data.date || new Date().toISOString().split('T')[0],
      }

      await logFood(logData)

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
      <div className="min-h-screen bg-[#f2f2f2] flex justify-center py-12">
        <Loading text="Loading food..." />
      </div>
    )
  }

  const displayName = selectedFood?.name || food_name || 'Unnamed Food'

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
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
          {formErrors.number_of_servings && (
            <p className="mt-1 text-xs text-mfp-error">{formErrors.number_of_servings.message}</p>
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

        {selectedFood && selectedFood.id && (
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

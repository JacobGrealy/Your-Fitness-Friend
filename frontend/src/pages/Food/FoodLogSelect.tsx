import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFoodStore } from '@/store/foodStore'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import type { Food, FoodLogCreate } from '@/types'
import { MEAL_TYPES } from '@/utils/constants'
import { quickAddFoodSchema } from '@/utils/schemas'
import Loading from '@/components/common/Loading'

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
}

export default function FoodLogSelect() {
  const { setTitle } = usePageTitle()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { foodId } = useParams<{ foodId?: string }>()
  const { foods, isLoading, logFood, createFood, fetchFoods, error, clearError } = useFoodStore()

  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const [isQuickAdd, setIsQuickAdd] = useState(false)
  const [cameFromHistory, setCameFromHistory] = useState(false)
  const [mealType, setMealType] = useState('breakfast')
  const [servingSize, setServingSize] = useState('')
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
      name: '',
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      brand: '',
      barcode_id: '',
      serving_size: '',
      meal_type: 'breakfast',
    },
  })

  const name = watch('name')
  const calories = watch('calories')
  const protein_g = watch('protein_g') || 0
  const carbs_g = watch('carbs_g') || 0
  const fat_g = watch('fat_g') || 0
  const brand = watch('brand')
  const barcode_id = watch('barcode_id')
  const meal_type = watch('meal_type')

  useEffect(() => {
    setTitle('Add Food')
    clearError()

    // Check for history query params first
    const historyName = searchParams.get('name')
    const historyCalories = searchParams.get('calories')
    const historyFoodId = searchParams.get('foodId')

   if (historyName && historyCalories) {
      setIsQuickAdd(true)
      setCameFromHistory(true)
      setValue('name', historyName)
      setValue('calories', parseInt(historyCalories, 10) || 0)
      setValue('protein_g', parseFloat(searchParams.get('protein') || '0'))
      setValue('carbs_g', parseFloat(searchParams.get('carbs') || '0'))
      setValue('fat_g', parseFloat(searchParams.get('fat') || '0'))
      setValue('serving_size', searchParams.get('serving_size') || '')
      setValue('brand', searchParams.get('brand') || '')
      setValue('barcode_id', searchParams.get('barcode_id') || '')

      if (historyFoodId) {
        const food = foods.find(f => String(f.id) === historyFoodId)
        if (food) {
          setSelectedFood(food)
        }
      }
      return
    }

    if (foodId) {
      const food = foods.find(f => String(f.id) === foodId)
      if (food) {
        setSelectedFood(food)
        setValue('name', food.name)
        setValue('calories', food.calories)
        setValue('protein_g', food.protein_g)
        setValue('carbs_g', food.carbs_g)
        setValue('fat_g', food.fat_g)
        setValue('brand', food.brand || '')
      } else {
        fetchFoods()
      }
    } else {
      setIsQuickAdd(true)
      setServingSize('1')
    }
  }, [foodId, fetchFoods, clearError, setValue])

  const onSubmit = async (data: any) => {
    setIsSubmitting(true)
    try {
      const quantityNum = parseFloat(servingSize) || 1

      if (data.name) {
        const foodCreate: any = {
          name: data.name,
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
          setSelectedFood({ ...response } as Food)
        }
      }

      // Log the food
      const logData: FoodLogCreate = {
        food_id: selectedFood ? String(selectedFood.id) : undefined,
        quantity: quantityNum,
        food_name: data.name || 'Quick Add',
        calories: Math.round(data.calories * quantityNum),
        protein_g: (data.protein_g || 0) * quantityNum,
        carbs_g: (data.carbs_g || 0) * quantityNum,
        fat_g: (data.fat_g || 0) * quantityNum,
        meal_type: meal_type as FoodLogCreate['meal_type'],
        serving_size: data.serving_size || '',
        brand: data.brand || undefined,
        barcode_id: data.barcode_id || undefined,
      }

      await logFood(logData)
      navigate('/food/log')
    } catch {
      // Error handled by store
    } finally {
      setIsSubmitting(false)
    }
  }

  const calculateNutrition = () => {
    const qty = parseFloat(servingSize) || 1
    const cal = calories || 0
    return {
      calories: Math.round(cal * qty),
      protein: (protein_g * qty).toFixed(1),
      carbs: (carbs_g * qty).toFixed(1),
      fat: (fat_g * qty).toFixed(1),
    }
  }

  if (isLoading && !selectedFood && !isQuickAdd) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex justify-center py-12">
        <Loading text="Loading food..." />
      </div>
    )
  }

  const nutrition = calculateNutrition()
  const displayName = selectedFood?.name || name || 'Unnamed Food'
  const displayBrand = selectedFood?.brand || brand

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

      {/* Food Info */}
      <div className="bg-white px-4 py-3 border-b border-[#e0e0e0]">
        <h2 className="font-bold text-lg text-[#212121]">{displayName}</h2>
        <p className="text-sm text-[#757575] mt-1">
          {calories} cal{displayBrand ? ` · ${displayBrand}` : ''}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
        {/* Meal Type */}
        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium text-[#212121] mb-2">
            Meal Type
          </label>
          <div className="flex gap-1">
            {MEAL_TYPES.map(meal => (
              <button
                key={meal}
                type="button"
                onClick={() => setMealType(meal)}
                className={`flex-1 py-2 px-2 text-xs font-medium rounded-md transition-colors ${
                  mealType === meal
                    ? 'bg-[#185ADB] text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {MEAL_LABELS[meal]}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Add Fields */}
        {isQuickAdd && (
          <>
            {cameFromHistory ? (
              <>
                <div className="bg-white rounded-lg p-4">
                  <label className="block text-sm font-medium text-[#212121] mb-2">
                    Serving Size
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={servingSize}
                      onChange={(e) => setServingSize(e.target.value)}
                      placeholder="e.g. 1.5"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
                    />
                    <span className="text-sm text-[#757575]">servings</span>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4">
                  <label className="block text-sm font-medium text-[#212121] mb-2">
                    Calories *
                  </label>
                  <input
                    type="number"
                    min="1"
                    {...register('calories')}
                    placeholder="e.g. 105"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
                  />
                  {formErrors.calories && (
                    <p className="mt-1 text-xs text-[#E53935]">{formErrors.calories.message}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="bg-white rounded-lg p-4">
                  <label className="block text-sm font-medium text-[#212121] mb-2">
                    Calories *
                  </label>
                  <input
                    type="number"
                    min="1"
                    {...register('calories')}
                    placeholder="e.g. 105"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
                  />
                  {formErrors.calories && (
                    <p className="mt-1 text-xs text-[#E53935]">{formErrors.calories.message}</p>
                  )}
                </div>

                <div className="bg-white rounded-lg p-4">
                  <label className="block text-sm font-medium text-[#212121] mb-2">
                    Serving Size
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={servingSize}
                      onChange={(e) => setServingSize(e.target.value)}
                      placeholder="e.g. 1.5"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
                    />
                    <span className="text-sm text-[#757575]">servings</span>
                  </div>
                </div>
              </>
            )}

            <div className="bg-white rounded-lg p-4">
              <label className="block text-sm font-medium text-[#212121] mb-2">
                Food Name (optional)
              </label>
              <input
                {...register('name')}
                placeholder="e.g. Banana"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
              />
              {formErrors.name && (
                <p className="mt-1 text-xs text-[#E53935]">{formErrors.name.message}</p>
              )}
            </div>

            <div className="bg-white rounded-lg p-4">
              <label className="block text-sm font-medium text-[#212121] mb-2">
                Protein (g)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                {...register('protein_g')}
                placeholder="e.g. 1.3"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
              />
              {formErrors.protein_g && (
                <p className="mt-1 text-xs text-[#E53935]">{formErrors.protein_g.message}</p>
              )}
            </div>

            <div className="bg-white rounded-lg p-4">
              <label className="block text-sm font-medium text-[#212121] mb-2">
                Carbs (g)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                {...register('carbs_g')}
                placeholder="e.g. 27"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
              />
              {formErrors.carbs_g && (
                <p className="mt-1 text-xs text-[#E53935]">{formErrors.carbs_g.message}</p>
              )}
            </div>

            <div className="bg-white rounded-lg p-4">
              <label className="block text-sm font-medium text-[#212121] mb-2">
                Fat (g)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                {...register('fat_g')}
                placeholder="e.g. 0.4"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
              />
              {formErrors.fat_g && (
                <p className="mt-1 text-xs text-[#E53935]">{formErrors.fat_g.message}</p>
              )}
            </div>

            <div className="bg-white rounded-lg p-4">
              <label className="block text-sm font-medium text-[#212121] mb-2">
                Brand (optional)
              </label>
              <input
                {...register('brand')}
                placeholder="e.g. USDA"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
              />
            </div>

            <div className="bg-white rounded-lg p-4">
              <label className="block text-sm font-medium text-[#212121] mb-2">
                Barcode ID (optional)
              </label>
              <input
                {...register('barcode_id')}
                placeholder="e.g. 012345678901"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
              />
            </div>
          </>
        )}

        {selectedFood && selectedFood.id && (
          <div className="bg-white rounded-lg p-4">
            <label className="block text-sm font-medium text-[#757575] mb-2">
              Food ID
            </label>
            <p className="text-sm text-[#212121]">{selectedFood.id}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-[#E53935]">{error}</p>
          </div>
        )}
      </form>
    </div>
  )
}

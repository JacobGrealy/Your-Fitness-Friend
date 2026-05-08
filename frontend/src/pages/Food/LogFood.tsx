import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useFoodStore } from '@/store/foodStore'
import type { FoodLogCreate } from '@/types'
import { logFoodSchema } from '@/utils/schemas'
import { MEAL_TYPES } from '@/utils/constants'
import { formatMacros } from '@/utils/formatters'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import Select from '@/components/common/Select'

export default function LogFood() {
  const navigate = useNavigate()
  const { foods, isLoading, fetchFoods, logFood, error } = useFoodStore()

  useEffect(() => {
    fetchFoods()
  }, [fetchFoods])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FoodLogCreate>({
    resolver: zodResolver(logFoodSchema),
    defaultValues: {
      food_id: '',
      quantity: 1,
      meal_type: 'breakfast',
    },
  })

  const selectedFoodId = watch('food_id')
  const selectedFood = foods.find(f => f.id === selectedFoodId)

  const onSubmit = async (data: FoodLogCreate) => {
    await logFood(data)
    navigate(-1)
  }

  const foodOptions = foods.map(food => ({
    value: food.id,
    label: food.name,
  }))

  const mealOptions = MEAL_TYPES.map(meal => ({
    value: meal,
    label: meal.charAt(0).toUpperCase() + meal.slice(1),
  }))

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Log Food</h1>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select
          label="Food"
          options={foodOptions}
          error={errors.food_id?.message}
          {...register('food_id')}
        />

        {selectedFood && (
          <div className="bg-base-200 rounded-lg p-3">
            <p className="font-medium text-sm">{selectedFood.name}</p>
            <p className="text-sm text-base-content/60 mt-1">
              {formatMacros(selectedFood.protein_g, selectedFood.carbs_g, selectedFood.fat_g)}
            </p>
            <p className="text-sm text-base-content/60">
              {selectedFood.calories} cal per serving
            </p>
          </div>
        )}

        <Input
          label="Quantity"
          type="number"
          min="0.1"
          step="0.1"
          placeholder="e.g. 1"
          error={errors.quantity?.message}
          {...register('quantity')}
        />

        <Select
          label="Meal Type"
          options={mealOptions}
          error={errors.meal_type?.message}
          {...register('meal_type')}
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={isLoading}
        >
          Log Food
        </Button>
      </form>
    </div>
  )
}

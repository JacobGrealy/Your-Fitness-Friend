import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFoodStore } from '@/store/foodStore'
import type { FoodLogCreate } from '@/types'
import { MEAL_TYPES } from '@/utils/constants'
import { formatMacros } from '@/utils/formatters'
import Header from '@/components/layout/Header'

const MEAL_LABELS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']

export default function LogFood() {
  const navigate = useNavigate()
  const { foods, isLoading, logFood, error, fetchFoods } = useFoodStore()
  const [mealType, setMealType] = useState('breakfast')
  const [foodId, setFoodId] = useState('')
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    fetchFoods()
  }, [fetchFoods])

  const selectedFood = foods.find(f => String(f.id) === foodId) || null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!foodId) return

    const data: FoodLogCreate = {
      food_id: foodId,
      quantity: quantity,
      meal_type: mealType as FoodLogCreate['meal_type'],
    }
    await logFood(data)
    navigate(-1)
  }

  const handleFoodChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFoodId(e.target.value)
  }, [])

  const mealOptions = MEAL_TYPES.map((meal, index) => ({
    value: meal,
    label: MEAL_LABELS[index],
  }))

  const foodOptions = foods.map(food => ({
    value: food.id,
    label: food.name,
  }))

  return (
    <>
      <Header title="Add Food" showBack />
      <main className="bg-white min-h-screen pb-20 sm:pb-0 pt-14 sm:pt-0">
        {error && (
          <div className="px-4 pt-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-[#E53935]">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-4 pt-4 space-y-4">
          {/* Meal Type Tabs */}
          <div className="flex gap-1 bg-gray-200 rounded-lg p-1">
            {mealOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMealType(option.value)}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                  mealType === option.value
                    ? 'bg-[#185ADB] text-white'
                    : 'bg-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Food Select */}
          <div>
            <label className="block text-sm font-medium text-[#212121] mb-1">
              Food
            </label>
            <select
              value={foodId}
              onChange={handleFoodChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[#212121] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
            >
              <option value="">Select a food</option>
              {foodOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Food Info Card */}
          {selectedFood && (
            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
              <h3 className="font-semibold text-[#212121] text-sm">{selectedFood.name}</h3>
              <p className="text-[#757575] text-xs mt-1">
                {formatMacros(
                  selectedFood.protein_g,
                  selectedFood.carbs_g,
                  selectedFood.fat_g
                )}
              </p>
              <p className="text-[#757575] text-xs mt-0.5">
                {selectedFood.calories} cal per serving
              </p>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-[#212121] mb-1">
              Quantity
            </label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[#212121] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#185ADB] text-white font-medium py-3 rounded-lg hover:bg-[#1552B6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {isLoading ? 'Adding...' : 'Add Food'}
          </button>
        </form>
      </main>
    </>
  )
}

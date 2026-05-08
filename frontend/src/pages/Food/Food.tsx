import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFoodStore } from '@/store/foodStore'
import type { MealType, FoodLog } from '@/types'
import { formatCalories, formatMacros } from '@/utils/formatters'
import { MEAL_TYPES } from '@/utils/constants'
import { MacroChart } from '@/components/charts'
import Button from '@/components/common/Button'
import Card from '@/components/common/Card'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
}

export default function Food() {
  const navigate = useNavigate()
  const { dailyTotals, foodLogs, isLoading, fetchDailyTotals, fetchFoodLogs } = useFoodStore()

  useEffect(() => {
    fetchDailyTotals()
    fetchFoodLogs()
  }, [fetchDailyTotals, fetchFoodLogs])

  const groupedLogs = MEAL_TYPES.reduce((acc, meal) => {
    acc[meal] = foodLogs.filter(log => log.meal_type === meal)
    return acc
  }, {} as Record<MealType, FoodLog[]>)

  if (isLoading && !dailyTotals && foodLogs.length === 0) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Food Tracking</h1>
        <div className="flex justify-center py-12">
          <Loading text="Loading food data..." />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Food Tracking</h1>

      {dailyTotals && (
        <Card shadow>
          <div className="card-body py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-base-content/70">Today</span>
              <span className="font-bold text-lg">
                {formatCalories(dailyTotals.total_calories)} / {formatCalories(dailyTotals.calorie_goal)} cal
              </span>
            </div>
            <div className="w-full bg-base-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${dailyTotals.total_calories > dailyTotals.calorie_goal ? 'bg-error' : 'bg-primary'}`}
                style={{ width: `${Math.min((dailyTotals.total_calories / dailyTotals.calorie_goal) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-base-content/60">
                {formatMacros(dailyTotals.total_protein, dailyTotals.total_carbs, dailyTotals.total_fat)}
              </span>
              <span className={dailyTotals.calories_remaining >= 0 ? 'text-success' : 'text-error'}>
                {dailyTotals.calories_remaining >= 0
                  ? `${formatCalories(dailyTotals.calories_remaining)} remaining`
                  : `${formatCalories(Math.abs(dailyTotals.calories_remaining))} over`}
              </span>
            </div>
          </div>
        </Card>
      )}

      {dailyTotals && (
        <MacroChart
          protein={dailyTotals.total_protein}
          carbs={dailyTotals.total_carbs}
          fat={dailyTotals.total_fat}
          title="Macro Breakdown"
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="primary"
          fullWidth
          onClick={() => navigate('/food/log')}
        >
          Log Food
        </Button>
        <Button
          variant="outline"
          fullWidth
          onClick={() => navigate('/food/custom')}
        >
          Custom Foods
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Today by Meal</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/food/daily')}
        >
          View All
        </Button>
      </div>

      {foodLogs.length === 0 ? (
        <EmptyState
          title="No food logged today"
          description="Start tracking your meals to see your daily breakdown."
          actionLabel="Log Food"
          onAction={() => navigate('/food/log')}
        />
      ) : (
        <div className="space-y-2">
          {MEAL_TYPES.map(meal => {
            const logs = groupedLogs[meal]
            if (logs.length === 0) return null

            const mealCalories = logs.reduce((sum, log) => sum + log.calories, 0)
            const mealProtein = logs.reduce((sum, log) => sum + log.protein_g, 0)
            const mealCarbs = logs.reduce((sum, log) => sum + log.carbs_g, 0)
            const mealFat = logs.reduce((sum, log) => sum + log.fat_g, 0)

            return (
              <Card key={meal} shadow>
                <div className="card-body py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold">{MEAL_LABELS[meal]}</span>
                      <span className="text-sm text-base-content/60 ml-2">({logs.length} item{logs.length > 1 ? 's' : ''})</span>
                    </div>
                    <div className="text-right text-sm">
                      <span className="font-medium">{formatCalories(mealCalories)} cal</span>
                      <span className="text-base-content/60 ml-2">
                        P:{mealProtein}g C:{mealCarbs}g F:{mealFat}g
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

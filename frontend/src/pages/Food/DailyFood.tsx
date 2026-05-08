import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFoodStore } from '@/store/foodStore'
import type { MealType, FoodLog } from '@/types'
import { formatCalories, formatMacros } from '@/utils/formatters'
import { MEAL_TYPES } from '@/utils/constants'
import Button from '@/components/common/Button'
import Card from '@/components/common/Card'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'
import Modal from '@/components/common/Modal'

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '☀️',
  lunch: '🌤️',
  dinner: '🌙',
  snack: '🍎',
}

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
}

export default function DailyFood() {
  const navigate = useNavigate()
  const { foodLogs, dailyTotals, isLoading, fetchFoodLogs, fetchDailyTotals, deleteFoodLog, error } = useFoodStore()
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null)
  const [collapsedMeals, setCollapsedMeals] = useState<Set<MealType>>(new Set())

  useEffect(() => {
    fetchDailyTotals()
    fetchFoodLogs()
  }, [fetchDailyTotals, fetchFoodLogs])

  const groupedLogs = MEAL_TYPES.reduce((acc, meal) => {
    acc[meal] = foodLogs.filter(log => log.meal_type === meal)
    return acc
  }, {} as Record<MealType, FoodLog[]>)

  const toggleMeal = (meal: MealType) => {
    setCollapsedMeals(prev => {
      const next = new Set(prev)
      if (next.has(meal)) {
        next.delete(meal)
      } else {
        next.add(meal)
      }
      return next
    })
  }

  const handleDeleteLog = () => {
    if (deleteLogId) {
      deleteFoodLog(deleteLogId)
      setDeleteLogId(null)
    }
  }

  const getMealTotals = (logs: FoodLog[]) => {
    return logs.reduce(
      (acc, log) => ({
        calories: acc.calories + log.calories,
        protein: acc.protein + log.protein_g,
        carbs: acc.carbs + log.carbs_g,
        fat: acc.fat + log.fat_g,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
  }

  if (isLoading && foodLogs.length === 0 && !dailyTotals) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Today's Food</h1>
        <div className="flex justify-center py-12">
          <Loading text="Loading food data..." />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Today's Food</h1>
        <Button size="sm" variant="primary" onClick={() => navigate('/food/log')}>
          Log Food
        </Button>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {dailyTotals && (
        <Card shadow>
          <div className="card-body py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-base-content/70">Calories</span>
              <span className="font-bold text-lg">
                {formatCalories(dailyTotals.total_calories)} / {formatCalories(dailyTotals.calorie_goal)}
              </span>
            </div>
            <div className="w-full bg-base-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${dailyTotals.total_calories > dailyTotals.calorie_goal ? 'bg-error' : 'bg-primary'}`}
                style={{ width: `${Math.min((dailyTotals.total_calories / dailyTotals.calorie_goal) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-base-content/60">
                {formatMacros(dailyTotals.total_protein, dailyTotals.total_carbs, dailyTotals.total_fat)}
              </span>
              <span className={dailyTotals.calories_remaining >= 0 ? 'text-success' : 'text-error'}>
                {dailyTotals.calories_remaining >= 0 ? `${formatCalories(dailyTotals.calories_remaining)} remaining` : `${formatCalories(Math.abs(dailyTotals.calories_remaining))} over`}
              </span>
            </div>
          </div>
        </Card>
      )}

      {foodLogs.length === 0 ? (
        <EmptyState
          title="No food logged today"
          description="Start tracking your meals to see them here."
          actionLabel="Log Food"
          onAction={() => navigate('/food/log')}
        />
      ) : (
        <div className="space-y-3">
          {MEAL_TYPES.map(meal => {
            const logs = groupedLogs[meal]
            if (logs.length === 0) return null

            const totals = getMealTotals(logs)
            const isCollapsed = collapsedMeals.has(meal)

            return (
              <Card key={meal} shadow>
                <div className="card-body py-3">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleMeal(meal)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{MEAL_ICONS[meal]}</span>
                      <span className="font-bold">{MEAL_LABELS[meal]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-base-content/60">
                        {formatCalories(totals.calories)} cal
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="space-y-2 mt-3">
                      {logs.map(log => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between bg-base-200 rounded-lg px-3 py-2"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm">{log.food_name}</span>
                            <div className="text-xs text-base-content/60">
                              {formatCalories(log.calories)} cal · P:{log.protein_g}g C:{log.carbs_g}g F:{log.fat_g}g
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setDeleteLogId(log.id)}
                            className="text-error hover:text-error shrink-0"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={deleteLogId !== null}
        onClose={() => setDeleteLogId(null)}
        title="Delete Food Log"
        submitLabel="Delete"
        onSubmit={handleDeleteLog}
        submitDisabled={isLoading}
        submitLoading={isLoading}
      >
        <p className="text-base-content/70">
          Are you sure you want to delete this food log? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}

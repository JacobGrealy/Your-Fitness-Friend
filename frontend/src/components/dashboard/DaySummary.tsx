import { formatDuration } from '@/utils/formatters'
import type { DailyExerciseItem, DailyMealItem } from '@/types'

interface DaySummaryProps {
  exercises: DailyExerciseItem[]
  meals: DailyMealItem[]
}

function getMealTypeIcon(type: string): string {
  switch (type) {
    case 'breakfast':
      return '🌅'
    case 'lunch':
      return '☀️'
    case 'dinner':
      return '🌙'
    case 'snack':
      return '🍎'
    case 'photo':
      return '📸'
    default:
      return '🍽️'
  }
}

function DaySummary({ exercises, meals }: DaySummaryProps) {
  const totalExerciseCalories = exercises.reduce((sum, ex) => sum + (ex.calories || 0), 0)
  const totalExerciseDuration = exercises.reduce((sum, ex) => sum + (ex.duration_min || 0), 0)

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="card-title text-base">Today's Activity</h2>

        <div className="grid grid-cols-3 gap-2 mt-1">
          <div className="text-center">
            <p className="text-lg font-bold text-accent">{exercises.length}</p>
            <p className="text-xs text-base-content/60">Exercises</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-accent">{formatDuration(totalExerciseDuration)}</p>
            <p className="text-xs text-base-content/60">Duration</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-accent">{totalExerciseCalories}</p>
            <p className="text-xs text-base-content/60">Cal Burned</p>
          </div>
        </div>

        <div className="divider my-2"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Exercises */}
          <div>
            <h3 className="text-sm font-semibold text-base-content/70 mb-2">Exercises</h3>
            {exercises.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-base-content/40">No exercises logged</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {exercises.map((ex, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-base-200/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ex.name}</p>
                      <p className="text-xs text-base-content/50">{formatDuration(ex.duration_min)}</p>
                    </div>
                    <span className="text-xs font-medium text-accent ml-2">
                      {ex.calories} kcal
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Meals */}
          <div>
            <h3 className="text-sm font-semibold text-base-content/70 mb-2">Meals</h3>
            {meals.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-base-content/40">No meals logged</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {meals.map((meal, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-base-200/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">{getMealTypeIcon(meal.meal_type)}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{meal.food_name}</p>
                        <p className="text-xs text-base-content/50 capitalize">{meal.meal_type}</p>
                      </div>
                    </div>
                    <span className="text-xs text-base-content/60 ml-2">
                      {meal.calories} kcal
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DaySummary

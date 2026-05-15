import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { subDays, addDays, isToday, format } from 'date-fns'
import { useFoodStore } from '@/store/foodStore'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import type { MealType, FoodLog } from '@/types'
import { formatCalories } from '@/utils/formatters'
import { MEAL_TYPES } from '@/utils/constants'
import CalorieSummaryBar from '@/components/dashboard/CalorieSummaryBar'
import Loading from '@/components/common/Loading'
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

function MealSection({
  meal,
  logs,
  totals,
  isCollapsed,
  onToggle,
  onDelete,
  onAddFood,
}: {
  meal: MealType
  logs: FoodLog[]
  totals: { calories: number; protein: number; carbs: number; fat: number }
  isCollapsed: boolean
  onToggle: () => void
  onDelete: (id: string) => void
  onAddFood: (meal: MealType) => void
}) {
  return (
    <div className="bg-white rounded-lg">
      <button
        type="button"
        className="flex items-center justify-between w-full px-4 py-3 cursor-pointer bg-[#185ADB] rounded-t-lg text-left"
        onClick={onToggle}
        aria-expanded={!isCollapsed}
        aria-label={`${MEAL_LABELS[meal]} section`}
      >
        <div className="flex items-center gap-2">
          <span>{MEAL_ICONS[meal]}</span>
          <span className="font-bold text-white">{MEAL_LABELS[meal]}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white text-sm">
            {totals.calories > 0 ? `${totals.calories} cal` : '0 cal'}
          </span>
          <svg
            className={`w-4 h-4 text-white transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {!isCollapsed && (
        <div className="divide-y divide-[#e0e0e0]">
          {logs.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[#757575]">
              0 calories
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 min-w-0 mr-3">
                  <span className="font-medium text-sm" style={{ color: '#212121' }}>{log.food_name}</span>
                  {log.brand && (
                    <div className="text-xs text-[#757575] mt-0.5">{log.brand}</div>
                  )}
                  <div className="text-xs text-[#757575] mt-0.5">
                    {formatCalories(log.calories)} cal · P:{log.protein_g}g C:{log.carbs_g}g F:{log.fat_g}g
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(log.id)
                  }}
                  className="text-[#757575] hover:text-red-600 transition-colors shrink-0 p-1"
                  aria-label={`Delete ${log.food_name}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAddFood(meal)
            }}
            className="w-full py-3 mt-1 text-sm font-medium text-[#185ADB] border-t border-[#e0e0e0] hover:bg-[#f2f2f2] transition-colors rounded-b-lg"
          >
            + Add Food
          </button>
        </div>
      )}
    </div>
  )
}

export default function DailyFood() {
  const { setTitle, setCenterContent } = usePageTitle()
  const navigate = useNavigate()
  const { foodLogs, dailyTotals, isLoading, fetchFoodLogs, fetchDailyTotals, deleteFoodLog, error } = useFoodStore()
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null)
  const [collapsedMeals, setCollapsedMeals] = useState<Set<MealType>>(new Set())
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => { setTitle('Diary') }, [setTitle])

  const formatDateLabel = useCallback((date: Date) => {
    if (isToday(date)) return 'Today'
    return format(date, 'MMM d')
  }, [])

  const handlePrevDay = useCallback(() => {
    setCurrentDate((prev) => subDays(prev, 1))
  }, [])

  const handleNextDay = useCallback(() => {
    setCurrentDate((prev) => {
      if (isToday(prev)) return prev
      return addDays(prev, 1)
    })
  }, [])

  const handleToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  useEffect(() => {
    const dateStr = format(currentDate, 'yyyy-MM-dd')
    setIsNavigating(true)
    Promise.all([
      fetchDailyTotals(dateStr),
      fetchFoodLogs(dateStr),
    ]).finally(() => setIsNavigating(false))
  }, [currentDate, fetchDailyTotals, fetchFoodLogs])

  useEffect(() => {
    setCenterContent(
      <div className="flex items-center justify-center gap-4 text-white">
        <button onClick={handlePrevDay} className="p-0.5 text-white hover:bg-white/10 rounded-full transition-colors" aria-label="Previous day">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={handleToday} className="px-3 py-0.5 text-lg font-bold text-white hover:bg-white/10 rounded-full transition-colors">{formatDateLabel(currentDate)}</button>
        <button onClick={handleNextDay} className="p-0.5 text-white hover:bg-white/10 rounded-full transition-colors" aria-label="Next day">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    )
    return () => setCenterContent(null)
  }, [currentDate, setCenterContent, formatDateLabel])

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

  if ((isLoading || isNavigating) && foodLogs.length === 0 && !dailyTotals) {
    return (
      <div className="min-h-screen bg-[#f2f2f2]">
        <div className="flex justify-center py-12">
          <Loading text="Loading food data..." />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2] pb-4">
      {error && (
        <div className="px-4 pt-2">
          <div className="bg-white rounded-lg p-3 text-red-600 text-sm">
            {error}
          </div>
        </div>
      )}

      <div className="px-4 pt-4 space-y-4">
        {dailyTotals && (
          <CalorieSummaryBar
            calories={{
              consumed: dailyTotals.total_calories,
              goal: dailyTotals.calorie_goal,
              remaining: dailyTotals.calories_remaining,
              burned_exercise: 0,
            }}
          />
        )}

        <div className="space-y-4">
          {MEAL_TYPES.map(meal => {
            const logs = groupedLogs[meal]
            const totals = getMealTotals(logs)
            const isCollapsed = collapsedMeals.has(meal)

            return (
              <MealSection
                key={meal}
                meal={meal}
                logs={logs}
                totals={totals}
                isCollapsed={isCollapsed}
                onToggle={() => toggleMeal(meal)}
                onDelete={(id) => setDeleteLogId(id)}
                onAddFood={(m) => navigate(`/food/log?meal=${m}`)}
              />
            )
          })}
        </div>
      </div>

      <Modal
        isOpen={deleteLogId !== null}
        onClose={() => setDeleteLogId(null)}
        title="Delete Food Log"
        submitLabel="Delete"
        onSubmit={handleDeleteLog}
        submitDisabled={isLoading}
        submitLoading={isLoading}
      >
        <p className="text-sm" style={{ color: '#757575' }}>
          Are you sure you want to delete this food log? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}

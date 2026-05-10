import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDashboardStore } from '@/store/dashboardStore'
import { WeightTrendChart } from '@/components/charts'
import CalorieSummaryBar from '@/components/dashboard/CalorieSummaryBar'
import Header from '@/components/layout/Header'
import Loading from '@/components/common/Loading'
import type { DailyMealItem } from '@/types'

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
}

const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'dinner', 'snacks']

function groupMealsByType(meals: DailyMealItem[]): { type: string; label: string; calories: number; items: DailyMealItem[] }[] {
  const groups: Record<string, DailyMealItem[]> = {}
  for (const meal of meals) {
    const type = meal.meal_type.toLowerCase()
    if (!groups[type]) groups[type] = []
    groups[type].push(meal)
  }

  return MEAL_TYPE_ORDER
    .filter(type => groups[type])
    .map(type => ({
      type,
      label: MEAL_TYPE_LABELS[type] || type,
      calories: groups[type].reduce((sum, m) => sum + m.calories, 0),
      items: groups[type],
    }))
}

function Dashboard() {
  const navigate = useNavigate()
  const {
    dailySummary,
    weightTrend,
    isLoading,
    error,
    fetchDailySummary,
    fetchWeightTrend,
  } = useDashboardStore()

  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchDailySummary()
    fetchWeightTrend(7)
  }, [fetchDailySummary, fetchWeightTrend])

  const trendData = useMemo(() => {
    if (!Array.isArray(weightTrend)) return []
    return weightTrend
      .map(entry => ({ date: entry.date, weight: entry.weight_lbs }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [weightTrend])

  const getTrendDirection = () => {
    if (trendData.length < 2) return 'stable' as const
    const first = trendData[0].weight
    const last = trendData[trendData.length - 1].weight
    const diff = last - first
    if (Math.abs(diff) < 0.5) return 'stable'
    return diff > 0 ? 'up' as const : 'down' as const
  }

  const mealGroups = useMemo(() => {
    if (!dailySummary?.meals) return []
    return groupMealsByType(dailySummary.meals)
  }, [dailySummary?.meals])

  const totalMealsCalories = mealGroups.reduce((sum, g) => sum + g.calories, 0)

  const toggleMeals = (type: string) => {
    setExpandedMeals(prev => ({ ...prev, [type]: !prev[type] }))
  }

  const handleNavigateDiary = () => {
    navigate('/food/daily')
  }

  if (isLoading && !dailySummary) {
    return (
      <div className="min-h-screen pt-14" style={{ backgroundColor: '#f2f2f2' }}>
        <Header title="Home" />
        <div className="p-4 flex justify-center py-12">
          <Loading text="Loading dashboard..." />
        </div>
      </div>
    )
  }

  if (error && !dailySummary) {
    return (
      <div className="min-h-screen pt-14" style={{ backgroundColor: '#f2f2f2' }}>
        <Header title="Home" />
        <div className="p-4 flex justify-center py-12">
          <p style={{ color: '#E53935' }}>{error}</p>
        </div>
      </div>
    )
  }

  if (!dailySummary) {
    return (
      <div className="min-h-screen pt-14" style={{ backgroundColor: '#f2f2f2' }}>
        <Header title="Home" />
        <div className="p-4 flex justify-center py-12">
          <Loading text="No data available yet. Try logging food or exercise first." />
        </div>
      </div>
    )
  }

  const weightChangePercent = useMemo(() => {
    if (dailySummary.weight.change_from_yesterday == null || dailySummary.weight.current == null) return null
    const yesterdayWeight = dailySummary.weight.current - dailySummary.weight.change_from_yesterday
    if (yesterdayWeight === 0) return null
    return ((dailySummary.weight.change_from_yesterday / yesterdayWeight) * 100).toFixed(1)
  }, [dailySummary.weight.change_from_yesterday, dailySummary.weight.current])

  return (
    <div className="min-h-screen pt-14" style={{ backgroundColor: '#f2f2f2' }}>
      <Header title="Home" />

      <div className="p-4 space-y-4">
        {/* Calorie Summary */}
        <CalorieSummaryBar calories={dailySummary.calories} />

        {/* Today's Meals */}
        <div className="bg-white rounded-lg overflow-hidden">
          <button
            className="px-4 py-2 cursor-pointer flex items-center justify-between w-full"
            style={{ backgroundColor: '#185ADB', color: '#fff' }}
            onClick={handleNavigateDiary}
            aria-label="View full diary"
          >
            <span className="text-sm font-semibold">Today's Meals</span>
            <span className="text-sm">{totalMealsCalories} kcal</span>
          </button>

          {mealGroups.map(group => (
            <div key={group.type}>
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 border-b"
                style={{ borderColor: '#e0e0e0' }}
                onClick={() => toggleMeals(group.type)}
              >
                <span className="text-sm font-medium" style={{ color: '#212121' }}>{group.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: '#757575' }}>{group.calories} kcal</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${expandedMeals[group.type] ? 'rotate-180' : ''}`}
                    style={{ color: '#757575' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedMeals[group.type] && (
                <div className="pb-2 px-4">
                  {group.items.map((meal, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5">
                      <span className="text-sm" style={{ color: '#212121' }}>{meal.food_name}</span>
                      <span className="text-sm" style={{ color: '#757575' }}>{meal.calories} kcal</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Weight Snapshot */}
        {dailySummary.weight.current != null && (
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: '#757575' }}>Current Weight</p>
                <p className="text-2xl font-bold" style={{ color: '#212121' }}>
                  {dailySummary.weight.current.toFixed(1)} lbs
                </p>
              </div>
              {dailySummary.weight.change_from_yesterday != null && (
                <div className="text-right">
                  <p className="text-xs" style={{ color: '#757575' }}>vs. Yesterday</p>
                  <div className="flex items-center gap-1 justify-end">
                    <span
                      className="text-lg font-bold"
                      style={{
                        color: dailySummary.weight.change_from_yesterday > 0 ? '#E53935' : dailySummary.weight.change_from_yesterday < 0 ? '#4CAF50' : '#757575',
                      }}
                    >
                      {dailySummary.weight.change_from_yesterday > 0 ? '↑' : dailySummary.weight.change_from_yesterday < 0 ? '↓' : '→'}
                    </span>
                    <span
                      className="text-lg font-bold"
                      style={{
                        color: dailySummary.weight.change_from_yesterday > 0 ? '#E53935' : dailySummary.weight.change_from_yesterday < 0 ? '#4CAF50' : '#757575',
                      }}
                    >
                      {dailySummary.weight.change_from_yesterday > 0 ? '+' : ''}{dailySummary.weight.change_from_yesterday.toFixed(1)} lbs
                    </span>
                    {weightChangePercent != null && (
                      <span className="text-xs" style={{ color: '#757575' }}>({weightChangePercent}%)</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Weight Trend Chart */}
        {trendData.length > 0 && (
          <div className="bg-white rounded-lg overflow-hidden">
            <div className="px-4 py-2" style={{ backgroundColor: '#185ADB' }}>
              <p className="text-sm font-semibold" style={{ color: '#fff' }}>Weight Trend</p>
            </div>
            <div className="p-4">
              <WeightTrendChart
                data={trendData}
                trend={getTrendDirection()}
                title=""
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard

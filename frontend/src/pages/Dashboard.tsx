import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDashboardStore } from '@/store/dashboardStore'
import { WeightTrendChart } from '@/components/charts'
import CalorieSummaryBar from '@/components/dashboard/CalorieSummaryBar'
import StreakStrip from '@/components/food/StreakStrip'
import { diaryApi, type DiaryStreaks, type DiaryWeek } from '@/api/diary'
import { format } from 'date-fns'
import { todayLocal } from '@/utils/localDate'
import {
  TREND_WINDOW_DAYS,
  buildWeightSeries,
  trendDirection,
  weightYDomain,
} from '@/utils/weightTrend'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import Loading from '@/components/common/Loading'
import { MEAL_LABELS, MEAL_TYPES } from '@/utils/constants'
import type { DailyMealItem } from '@/types'

function groupMealsByType(meals: DailyMealItem[]): { type: string; label: string; calories: number; items: DailyMealItem[] }[] {
  const groups: Record<string, DailyMealItem[]> = {}
  for (const meal of meals) {
    const type = meal.meal_type.toLowerCase()
    if (!groups[type]) groups[type] = []
    groups[type].push(meal)
  }

  return MEAL_TYPES
    .filter(type => groups[type])
    .map(type => ({
      type,
      label: MEAL_LABELS[type],
      calories: groups[type].reduce((sum, m) => sum + m.calories, 0),
      items: groups[type],
    }))
}

function Dashboard() {
  const navigate = useNavigate()
  const { setTitle } = usePageTitle()
  const {
    dailySummary,
    weightTrend,
    isLoading,
    error,
    fetchDailySummary,
    fetchWeightTrend,
  } = useDashboardStore()

  useEffect(() => { setTitle('Home') }, [setTitle])

  // The week strip lives here as well as on the diary (FF-0072): the reward should
  // greet you on the screen you open first, not only where you close the day.
  const [streaks, setStreaks] = useState<DiaryStreaks | null>(null)
  const [week, setWeek] = useState<DiaryWeek | null>(null)

  useEffect(() => {
    let cancelled = false
    diaryApi.getCompletion(todayLocal())
      .then((state) => {
        if (cancelled) return
        setStreaks(state.streaks ?? null)
        setWeek(state.week ?? null)
      })
      .catch(() => {
        if (cancelled) return
        setStreaks(null)
        setWeek(null)
      })
    return () => { cancelled = true }
  }, [])

  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchDailySummary()
    fetchWeightTrend(7)
  }, [])

  // Same builder, same window and same verdict rule as Progress (FF-0084): the two screens
  // may present differently, but they can no longer disagree about the data.
  const trendData = useMemo(() => {
    if (!Array.isArray(weightTrend)) return []
    return buildWeightSeries(
      weightTrend.map((entry) => ({ weight: entry.weight_lbs, date: entry.date })),
      TREND_WINDOW_DAYS
    )
  }, [weightTrend])

  const getTrendDirection = () => trendDirection(trendData)
  const trendDomain = useMemo(() => weightYDomain(trendData), [trendData])

  const mealGroups = useMemo(() => {
    if (!dailySummary?.meals) return []
    return groupMealsByType(dailySummary.meals)
  }, [dailySummary?.meals])

  const totalMealsCalories = mealGroups.reduce((sum, g) => sum + g.calories, 0)

  // Progress since the starting weigh-in, which is the comparison the card leads with
  // (FF-0090). Measured against the baseline, so a 7 lb drop reads as a 7 lb drop.
  const weightChangePercent = useMemo(() => {
    const change = dailySummary?.weight?.change_from_start
    const start = dailySummary?.weight?.start
    if (!change || !start) return null
    return ((change / start) * 100).toFixed(1)
  }, [dailySummary?.weight?.change_from_start, dailySummary?.weight?.start])

  // The newest weigh-in may be days old, and the card must not imply it is today's.
  const weightIsToday = dailySummary?.weight?.current_date === todayLocal()
  const currentWeightLabel = useMemo(() => {
    const date = dailySummary?.weight?.current_date
    if (!date || weightIsToday) return 'Current Weight'
    return `Weight (${format(new Date(`${date}T00:00:00`), 'MMM d')})`
  }, [dailySummary?.weight?.current_date, weightIsToday])

  const startDateLabel = useMemo(() => {
    const date = dailySummary?.weight?.start_date
    if (!date) return ''
    return `since ${format(new Date(`${date}T00:00:00`), 'MMM d')}`
  }, [dailySummary?.weight?.start_date])

  const toggleMeals = (type: string) => {
    setExpandedMeals(prev => ({ ...prev, [type]: !prev[type] }))
  }

  const handleNavigateDiary = () => {
    navigate('/food/daily')
  }

     if (isLoading && !dailySummary) {
    return (
      <div className="" style={{ backgroundColor: '#f2f2f2' }}>
        <div className="p-4 flex justify-center py-12">
          <Loading text="Loading dashboard..." />
        </div>
      </div>
    )
  }

  if (error && !dailySummary) {
    return (
      <div className="" style={{ backgroundColor: '#f2f2f2' }}>
        <div className="p-4 flex justify-center py-12">
          <p style={{ color: '#E53935' }}>{error}</p>
        </div>
      </div>
    )
  }

  if (!dailySummary) {
    return (
      <div className="" style={{ backgroundColor: '#f2f2f2' }}>
        <div className="p-4 flex justify-center py-12">
          <Loading text="No data available yet. Try logging food or exercise first." />
        </div>
      </div>
    )
  }

  return (
    <div className="" style={{ backgroundColor: '#f2f2f2' }}>
      <div className="p-4 space-y-4">
        {/* Calorie Summary */}
        <CalorieSummaryBar calories={dailySummary.calories} />

        {streaks && week && <StreakStrip streaks={streaks} week={week} />}

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
                <p className="text-xs" style={{ color: '#757575' }}>{currentWeightLabel}</p>
                <p className="text-2xl font-bold" style={{ color: '#212121' }}>
                  {dailySummary.weight.current.toFixed(1)} lbs
                </p>
              </div>
              {dailySummary.weight.change_from_start != null && (
                <div className="text-right">
                  <p className="text-xs" style={{ color: '#757575' }}>vs. Starting Weight</p>
                  <div className="flex items-center gap-1 justify-end">
                    <span
                      className="text-lg font-bold"
                      style={{
                        color: dailySummary.weight.change_from_start > 0 ? '#E53935' : dailySummary.weight.change_from_start < 0 ? '#4CAF50' : '#757575',
                      }}
                    >
                      {dailySummary.weight.change_from_start > 0 ? '↑' : dailySummary.weight.change_from_start < 0 ? '↓' : '→'}
                    </span>
                    <span
                      className="text-lg font-bold"
                      style={{
                        color: dailySummary.weight.change_from_start > 0 ? '#E53935' : dailySummary.weight.change_from_start < 0 ? '#4CAF50' : '#757575',
                      }}
                    >
                      {dailySummary.weight.change_from_start > 0 ? '+' : ''}{dailySummary.weight.change_from_start.toFixed(1)} lbs
                    </span>
                    {weightChangePercent != null && (
                      <span className="text-xs" style={{ color: '#757575' }}>({weightChangePercent}%)</span>
                    )}
                  </div>
                  {startDateLabel && (
                    <p className="text-[10px] mt-0.5" style={{ color: '#757575' }}>{startDateLabel}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Weight Trend Chart */}
        {trendData.length > 0 && (
          <div className="bg-white rounded-lg overflow-hidden">
            <div className="px-4 py-2" style={{ backgroundColor: '#185ADB' }}>
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold" style={{ color: '#fff' }}>Weight Trend</p>
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  last {TREND_WINDOW_DAYS} days
                </p>
              </div>
            </div>
            <div className="p-4">
              <WeightTrendChart
                data={trendData}
                trend={getTrendDirection()}
                yDomain={trendDomain}
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

import { useEffect } from 'react'
import { useDashboardStore } from '@/store/dashboardStore'
import { WeightTrendChart } from '@/components/charts'
import CalorieRing from '@/components/dashboard/CalorieRing'
import MacroBars from '@/components/dashboard/MacroBars'
import WeightSnapshot from '@/components/dashboard/WeightSnapshot'
import DaySummary from '@/components/dashboard/DaySummary'
import Loading from '@/components/common/Loading'

function Dashboard() {
  const {
    dailySummary,
    weightTrend,
    isLoading,
    error,
    fetchDailySummary,
    fetchWeightTrend,
  } = useDashboardStore()

  useEffect(() => {
    fetchDailySummary()
    fetchWeightTrend(7)
  }, [fetchDailySummary, fetchWeightTrend])

  if (isLoading && !dailySummary) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <div className="flex justify-center py-12">
          <Loading text="Loading dashboard..." />
        </div>
      </div>
    )
  }

  if (error && !dailySummary) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <div className="flex justify-center py-12">
          <p className="text-error">{error}</p>
        </div>
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  }

  const trendData = Array.isArray(weightTrend)
    ? weightTrend.map(entry => ({
        date: entry.date,
        weight: entry.weight_lbs,
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : []

  const getTrendDirection = () => {
    if (trendData.length < 2) return 'stable'
    const first = trendData[0].weight
    const last = trendData[trendData.length - 1].weight
    const diff = last - first
    if (Math.abs(diff) < 0.5) return 'stable'
    return diff > 0 ? 'up' : 'down'
  }

  if (!dailySummary) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
        <div className="flex justify-center py-12">
          <Loading text="No data available yet. Try logging food or exercise first." />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-base-content/60">{formatDate(dailySummary.date)}</p>
      </div>

      {/* Top row: Calorie ring + Weight snapshot */}
      <div className="grid grid-cols-2 gap-3">
        <CalorieRing
          consumed={dailySummary.calories?.consumed ?? 0}
          goal={dailySummary.calories?.goal ?? 2000}
          remaining={dailySummary.calories?.remaining ?? 0}
          burned={dailySummary.calories?.burned_exercise ?? 0}
        />
        <WeightSnapshot
          current={dailySummary.weight?.current ?? null}
          changeYesterday={dailySummary.weight?.change_from_yesterday ?? null}
          changeWeekAgo={dailySummary.weight?.change_from_week_ago ?? null}
        />
      </div>

      {/* Macro bars */}
      {dailySummary.macros && (
        <MacroBars
          protein={dailySummary.macros.protein ?? { consumed: 0, goal: 0 }}
          carbs={dailySummary.macros.carbs ?? { consumed: 0, goal: 0 }}
          fat={dailySummary.macros.fat ?? { consumed: 0, goal: 0 }}
        />
      )}

      {/* Today's activity: exercises + meals */}
      <DaySummary
        exercises={dailySummary.exercises || []}
        meals={dailySummary.meals || []}
      />

      {/* Weight trend chart */}
      {trendData.length > 0 && (
        <WeightTrendChart
          data={trendData}
          trend={getTrendDirection()}
          title="Weight Trend"
        />
      )}
    </div>
  )
}

export default Dashboard

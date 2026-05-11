import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWeightStore } from '@/store/weightStore'
import { useAuthStore } from '@/store/authStore'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import { formatWeight } from '@/utils/formatters'
import Button from '@/components/common/Button'
import Card from '@/components/common/Card'
import Loading from '@/components/common/Loading'
import { WeightChart } from '@/components/charts'

export default function Weight() {
  const { setTitle } = usePageTitle()
  const navigate = useNavigate()
  const { logs, statistics, trend, isLoading } = useWeightStore()
  const user = useAuthStore((s) => s.user)

  useEffect(() => { setTitle('Progress') }, [setTitle])

  const chartData = [...logs]
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
    .map(log => ({
      date: log.recorded_at,
      weight: log.weight,
    }))

  if (isLoading && !statistics && !trend && logs.length === 0) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Weight Tracking</h1>
        <div className="flex justify-center py-12">
          <Loading text="Loading weight data..." />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Weight Tracking</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {statistics?.current_weight !== null && statistics?.current_weight !== undefined && (
          <Card className="text-center">
            <div className="items-center py-4">
              <p className="text-sm text-mfp-textSecondary">Current</p>
              <p className="text-2xl font-bold">{formatWeight(statistics.current_weight)}</p>
            </div>
          </Card>
        )}

        {statistics?.average_weight !== null && statistics?.average_weight !== undefined && (
          <Card className="text-center">
            <div className="items-center py-4">
              <p className="text-sm text-mfp-textSecondary">Average</p>
              <p className="text-2xl font-bold">{formatWeight(statistics.average_weight)}</p>
            </div>
          </Card>
        )}

        {statistics?.min_weight !== null && statistics?.min_weight !== undefined && (
          <Card className="text-center">
            <div className="items-center py-4">
              <p className="text-sm text-mfp-textSecondary">Min</p>
              <p className="text-2xl font-bold">{formatWeight(statistics.min_weight)}</p>
            </div>
          </Card>
        )}

        {statistics?.max_weight !== null && statistics?.max_weight !== undefined && (
          <Card className="text-center">
            <div className="items-center py-4">
              <p className="text-sm text-mfp-textSecondary">Max</p>
              <p className="text-2xl font-bold">{formatWeight(statistics.max_weight)}</p>
            </div>
          </Card>
        )}
      </div>

      {trend && trend.change_7d !== null && trend.change_7d !== undefined && (
        <Card>
          <div className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-mfp-textSecondary">7 Day Change</p>
                <p className={`text-lg font-bold ${trend.change_7d > 0 ? 'text-yellow-600' : trend.change_7d < 0 ? 'text-mfp-success' : ''}`}>
                  {trend.change_7d > 0 ? '+' : ''}{trend.change_7d.toFixed(1)} lbs
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-mfp-textSecondary">Trend</p>
                <p className="text-lg font-bold capitalize">{trend.trend || 'N/A'}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {chartData.length > 0 && (
        <WeightChart data={chartData} height={200} title="Weight Trend" goal={user?.weight_goal_lbs} />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="primary"
          fullWidth
          onClick={() => navigate('/weight/log')}
        >
          Log Weight
        </Button>
        <Button
          variant="outline"
          fullWidth
          onClick={() => navigate('/weight/history')}
        >
          View History
        </Button>
      </div>
    </div>
  )
}

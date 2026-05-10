import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWeightStore } from '@/store/weightStore'
import { useAuthStore } from '@/store/authStore'
import { formatDate, formatWeight } from '@/utils/formatters'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'
import Modal from '@/components/common/Modal'
import WeightChartWithGoal from '@/components/charts/WeightChartWithGoal'

export default function WeightHistory() {
  const { logs, isLoading, fetchLogs, deleteLog } = useWeightStore()
  const { user, checkAuth } = useAuthStore()
  const navigate = useNavigate()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
    fetchLogs()
  }, [checkAuth, fetchLogs])

  const sortedLogs = [...logs].sort((a, b) =>
    new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  )

  const chartData = sortedLogs.map(log => ({
    date: log.recorded_at,
    weight: log.weight,
  }))

  const currentWeight = sortedLogs.length > 0 ? sortedLogs[0].weight : null
  const goalWeight = user?.weight_goal_lbs

  const distanceToGoal = currentWeight !== null && goalWeight
    ? Math.abs(currentWeight - goalWeight)
    : null

  const isOverGoal = currentWeight !== null && goalWeight
    ? currentWeight > goalWeight
    : null

  const handleDelete = () => {
    if (deleteId) {
      deleteLog(deleteId)
      setDeleteId(null)
    }
  }

  return (
    <div className="p-4" style={{ backgroundColor: '#f2f2f2', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold" style={{ color: '#185ADB' }}>Progress</h1>
      </div>

      {/* Weight Goal Card */}
      {goalWeight && currentWeight !== null && (
        <div className="bg-white rounded-lg p-4 mb-4 border border-[#e0e0e0]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium" style={{ color: '#757575' }}>Weight Goal</span>
            <span className="text-sm font-medium" style={{ color: '#185ADB' }}>{formatWeight(goalWeight)}</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium" style={{ color: '#757575' }}>Current Weight</span>
            <span className="text-lg font-bold" style={{ color: '#212121' }}>{formatWeight(currentWeight)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: '#757575' }}>
              {isOverGoal ? 'Over Goal' : 'Under Goal'}
            </span>
            <span className="text-sm font-bold" style={{ color: isOverGoal ? '#185ADB' : '#185ADB' }}>
              {distanceToGoal?.toFixed(1)} lbs
            </span>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="mb-4">
          <WeightChartWithGoal data={chartData} height={180} goal={goalWeight} />
        </div>
      )}

      {/* Loading / Empty State */}
      {isLoading && logs.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loading text="Loading weight history..." />
        </div>
      ) : sortedLogs.length === 0 ? (
        <EmptyState
          title="No weight logs yet"
          description="Start tracking your weight to see your history here."
        />
      ) : (
        /* Recent Entries */
        <div className="bg-white rounded-lg border border-[#e0e0e0] overflow-hidden">
          <div className="px-4 py-3" style={{ backgroundColor: '#185ADB' }}>
            <h2 className="text-sm font-semibold text-white">Recent Entries</h2>
          </div>
          {sortedLogs.map((log, index) => (
            <div
              key={log.id}
              onClick={() => navigate(`/weight/history/${log.id}/edit`)}
              className="cursor-pointer px-4 py-3 flex items-center justify-between"
              style={{
                borderBottom: index < sortedLogs.length - 1 ? '1px solid #e0e0e0' : 'none',
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold" style={{ color: '#212121' }}>{formatWeight(log.weight)}</span>
                  <span className="text-xs" style={{ color: '#757575' }}>{formatDate(log.recorded_at)}</span>
                </div>
                {log.notes && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: '#757575' }}>
                    {log.notes}
                  </p>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteId(log.id)
                }}
                className="ml-3 p-1 rounded hover:bg-[#f2f2f2]"
                style={{ color: '#757575' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Weight Log"
        submitLabel="Delete"
        onSubmit={handleDelete}
        submitDisabled={isLoading}
        submitLoading={isLoading}
      >
        <p style={{ color: '#757575' }}>
          Are you sure you want to delete this weight log? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}

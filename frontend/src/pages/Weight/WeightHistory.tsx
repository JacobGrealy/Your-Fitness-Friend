import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWeightStore } from '@/store/weightStore'
import { formatDate, formatWeight } from '@/utils/formatters'
import Button from '@/components/common/Button'
import Card from '@/components/common/Card'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'
import Modal from '@/components/common/Modal'
import { WeightChart } from '@/components/charts'

export default function WeightHistory() {
  const { logs, isLoading, fetchLogs } = useWeightStore()
  const navigate = useNavigate()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const sortedLogs = [...logs].sort((a, b) =>
    new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  )

  const chartData = sortedLogs.map(log => ({
    date: log.recorded_at,
    weight: log.weight,
  }))

  const handleDelete = () => {
    if (deleteId) {
      useWeightStore.getState().deleteLog(deleteId)
      setDeleteId(null)
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Weight History</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchLogs()}
          loading={isLoading}
        >
          Refresh
        </Button>
      </div>

      {chartData.length > 0 && (
        <div className="mb-4">
          <WeightChart data={chartData} height={180} />
        </div>
      )}

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
        <div className="space-y-3">
          {sortedLogs.map(log => (
            <div
              key={log.id}
              onClick={() => navigate(`/weight/history/${log.id}/edit`)}
              className="cursor-pointer"
            >
              <Card shadow className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold">{formatWeight(log.weight)}</span>
                    <span className="text-sm text-base-content/70">{formatDate(log.recorded_at)}</span>
                  </div>
                  {log.notes && (
                    <p className="text-sm text-base-content/80 mt-1 truncate">
                      {log.notes}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteId(log.id)
                  }}
                  className="text-error hover:text-error shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </Card>
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
        <p className="text-base-content/70">
          Are you sure you want to delete this weight log? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}

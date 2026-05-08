import { useState, useEffect } from 'react'
import { useExerciseStore } from '@/store/exerciseStore'
import { formatDate, formatDuration, formatCalories } from '@/utils/formatters'
import Button from '@/components/common/Button'
import Card from '@/components/common/Card'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'
import Modal from '@/components/common/Modal'

const INTENSITY_BADGE: Record<string, string> = {
  low: 'badge-success',
  medium: 'badge-warning',
  high: 'badge-error',
}

export default function ExerciseHistory() {
  const { exerciseLogs, isLoading, fetchExerciseLogs, deleteExerciseLog } = useExerciseStore()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    fetchExerciseLogs()
  }, [fetchExerciseLogs])

  const sortedLogs = [...exerciseLogs].sort((a, b) =>
    new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
  )

  const handleDelete = () => {
    if (deleteId) {
      deleteExerciseLog(deleteId)
      setDeleteId(null)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exercise History</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchExerciseLogs()}
          loading={isLoading}
        >
          Refresh
        </Button>
      </div>

      {isLoading && exerciseLogs.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loading text="Loading exercise history..." />
        </div>
      ) : sortedLogs.length === 0 ? (
        <EmptyState
          title="No exercise logs yet"
          description="Start logging exercises to see your history here."
        />
      ) : (
        <div className="space-y-3">
          {sortedLogs.map(log => (
            <Card key={log.id} shadow className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold">{log.exercise_name}</span>
                  <span className={`badge badge-sm ${INTENSITY_BADGE[log.intensity] || 'badge-ghost'} capitalize`}>
                    {log.intensity}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-base-content/70">
                  <span>{formatDate(log.logged_at)}</span>
                  {log.duration !== null && log.duration !== undefined && (
                    <span>{formatDuration(log.duration)}</span>
                  )}
                  {log.calories_burned !== null && log.calories_burned !== undefined && (
                    <span>{formatCalories(log.calories_burned)} cal</span>
                  )}
                </div>
                {log.notes && (
                  <p className="text-sm text-base-content/60 mt-1 truncate">
                    {log.notes}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteId(log.id)}
                className="text-error hover:text-error shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Exercise Log"
        submitLabel="Delete"
        onSubmit={handleDelete}
        submitDisabled={isLoading}
        submitLoading={isLoading}
      >
        <p className="text-base-content/70">
          Are you sure you want to delete this exercise log? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}

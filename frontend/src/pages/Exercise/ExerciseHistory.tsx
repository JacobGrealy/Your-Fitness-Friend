import { useState, useEffect } from 'react'
import { useExerciseStore } from '@/store/exerciseStore'
import { formatDate, formatDuration, formatCalories } from '@/utils/formatters'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'
import Modal from '@/components/common/Modal'
import Header from '@/components/layout/Header'

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

  const handleRefresh = () => {
    fetchExerciseLogs()
  }

  return (
    <main className="pb-20 sm:pb-0 pt-14 sm:pt-0">
      <Header
        title="Recent Exercise"
        rightContent={
          <button
            onClick={handleRefresh}
            className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            aria-label="Refresh"
            disabled={isLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        }
      />

      <div className="bg-white">
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
          <div className="divide-y divide-mfp-border">
            {sortedLogs.map(log => (
              <div
                key={log.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-mfp-text truncate">{log.exercise_name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-sm text-mfp-textSecondary">
                    <span>{formatDate(log.logged_at)}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        log.intensity === 'low' ? 'bg-green-500' :
                        log.intensity === 'medium' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`} />
                      {log.intensity}
                    </span>
                  </div>
                  {log.notes && (
                    <span className="text-mfp-textSecondary text-sm truncate">{log.notes}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    {log.duration !== null && log.duration !== undefined && (
                      <div className="text-sm text-mfp-text">{formatDuration(log.duration)}</div>
                    )}
                    {log.calories_burned !== null && log.calories_burned !== undefined && (
                      <div className="text-sm text-mfp-textSecondary">{formatCalories(log.calories_burned)} cal</div>
                    )}
                  </div>
                  <button
                    onClick={() => setDeleteId(log.id)}
                    className="p-2 text-mfp-error hover:bg-mfp-error/10 rounded-full transition-colors shrink-0"
                    aria-label="Delete exercise log"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Exercise Log"
        submitLabel="Delete"
        onSubmit={handleDelete}
        submitDisabled={isLoading}
        submitLoading={isLoading}
      >
        <p className="text-mfp-textSecondary">
          Are you sure you want to delete this exercise log? This action cannot be undone.
        </p>
      </Modal>
    </main>
  )
}

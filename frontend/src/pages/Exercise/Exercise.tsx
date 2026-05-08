import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExerciseStore } from '@/store/exerciseStore'
import { formatDuration, formatCalories, formatDate } from '@/utils/formatters'
import Button from '@/components/common/Button'
import Card from '@/components/common/Card'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'
import { startOfWeek, addDays } from 'date-fns'

export default function Exercise() {
  const navigate = useNavigate()
  const { savedExercises, exerciseLogs, isLoading, fetchSavedExercises, fetchExerciseLogs } = useExerciseStore()

  useEffect(() => {
    fetchSavedExercises()
    fetchExerciseLogs()
  }, [fetchSavedExercises, fetchExerciseLogs])

  const weekStart = startOfWeek(new Date())
  const weekEnd = addDays(weekStart, 7)

  const weekLogs = exerciseLogs.filter(log => {
    const logDate = new Date(log.logged_at)
    return logDate >= weekStart && logDate < weekEnd
  })

  const totalExercises = weekLogs.length
  const totalCalories = weekLogs.reduce((sum, log) => sum + (log.calories_burned || 0), 0)
  const totalDuration = weekLogs.reduce((sum, log) => sum + (log.duration || 0), 0)

  const recentLogs = [...exerciseLogs]
    .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())
    .slice(0, 3)

  if (isLoading && exerciseLogs.length === 0 && savedExercises.length === 0) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Exercise Tracking</h1>
        <div className="flex justify-center py-12">
          <Loading text="Loading exercise data..." />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Exercise Tracking</h1>

      <div className="grid grid-cols-3 gap-3">
        <Card shadow className="text-center">
          <div className="card-body items-center py-4">
            <p className="text-sm text-base-content/60">This Week</p>
            <p className="text-2xl font-bold">{totalExercises}</p>
          </div>
        </Card>

        <Card shadow className="text-center">
          <div className="card-body items-center py-4">
            <p className="text-sm text-base-content/60">Calories</p>
            <p className="text-2xl font-bold">{formatCalories(totalCalories)}</p>
          </div>
        </Card>

        <Card shadow className="text-center">
          <div className="card-body items-center py-4">
            <p className="text-sm text-base-content/60">Duration</p>
            <p className="text-2xl font-bold">{formatDuration(totalDuration)}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <Button
          variant="primary"
          fullWidth
          onClick={() => navigate('/exercise/log')}
        >
          Log Exercise
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            fullWidth
            onClick={() => navigate('/exercise/library')}
          >
            View Library
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={() => navigate('/exercise/history')}
          >
            View History
          </Button>
        </div>
      </div>

      <h2 className="text-lg font-bold mt-4">Recent Activity</h2>

      {recentLogs.length === 0 ? (
        <EmptyState
          title="No recent activity"
          description="Log your first exercise to see it here."
          actionLabel="Log Exercise"
          onAction={() => navigate('/exercise/log')}
        />
      ) : (
        <div className="space-y-3">
          {recentLogs.map(log => (
            <Card key={log.id} shadow>
              <div className="card-body py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold">{log.exercise_name}</span>
                    <p className="text-sm text-base-content/60">{formatDate(log.logged_at)}</p>
                  </div>
                  <div className="text-right">
                    {log.duration !== null && log.duration !== undefined && (
                      <p className="text-sm">{formatDuration(log.duration)}</p>
                    )}
                    {log.calories_burned !== null && log.calories_burned !== undefined && (
                      <p className="text-sm text-base-content/60">{formatCalories(log.calories_burned)} cal</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { exerciseApi } from '@/api/exercise'
import { useAuthStore } from '@/store/authStore'
import type { ExerciseLog } from '@/types'

const number = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 })
export default function DiaryExerciseSection({ date, onTotal }: {
  date: string
  onTotal: (summary: { date: string; total: number }) => void
}) {
  const userId = useAuthStore(s => s.user?.id)
  const [result, setResult] = useState<{ date: string; userId: unknown; logs: ExerciseLog[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setResult(null); onTotal({ date, total: 0 })
    exerciseApi.getExerciseLogs({ start_date: date, end_date: date }).then(logs => {
      if (!active) return
      setResult({ date, userId, logs })
      onTotal({ date, total: Math.round(logs.reduce((sum, log) => sum + (log.calories_burned ?? 0), 0) * 100) / 100 })
    }).catch(e => {
      if (active) setError(e?.response?.data?.error || 'Unable to load exercise for this day.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [date, userId, attempt, onTotal])
  const logs = result?.date === date && result.userId === userId ? result.logs : []
  return <section aria-label="Diary exercise" className="bg-white rounded-lg border border-mfp-border overflow-hidden">
    <div className="flex justify-between items-center px-4 py-3 border-b border-mfp-border"><h2 className="font-bold">Exercise</h2><Link to="/exercise/log" className="text-mfp-blue text-sm">Log exercise</Link></div>
    {loading && <p role="status" className="p-4 text-sm">Loading exercise…</p>}
    {error && <div className="p-4 text-sm"><p role="alert">{error}</p><button className="text-mfp-blue underline mt-2" onClick={() => setAttempt(x => x + 1)}>Retry exercise</button></div>}
    {!loading && !error && logs.length === 0 && <p className="p-4 text-sm text-mfp-textSecondary">No exercise logged for this day.</p>}
    {logs.map(log => <article key={log.id} className="px-4 py-3 border-b border-mfp-border space-y-1">
      <div className="flex justify-between gap-3"><h3 className="font-medium">{log.exercise_name}</h3><span className="text-sm whitespace-nowrap">{log.calories_burned == null ? '—' : `${number(log.calories_burned)} kcal`}</span></div>
      <p className="text-sm text-mfp-textSecondary">{log.duration != null && `${number(log.duration)} min`}{log.details && <> · {number(log.details.speed_mph)} mph · {number(log.details.incline_percent)}% incline · {number(log.details.distance_miles)} mi</>}</p>
      <p className="text-xs text-mfp-textSecondary">{log.details ? 'Active calories · estimated' : 'Legacy calorie estimate'}</p>
      {log.activity_id === 'treadmill_walking' && <Link className="inline-block text-sm text-mfp-blue underline" to={`/exercise/log?activity=treadmill_walking&edit=${log.id}`}>View / edit session</Link>}
    </article>)}
    <div className="px-4 py-3 text-xs text-mfp-textSecondary">Exercise calories are tracked separately and do not increase your food allowance. <Link className="text-mfp-blue underline" to="/exercise/history">Exercise history</Link></div>
  </section>
}

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { exerciseApi } from '@/api/exercise'
import { useAuthStore } from '@/store/authStore'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import type { ExerciseLog } from '@/types'
import { todayLocal } from '@/utils/localDate'
import Modal from '@/components/common/Modal'
import { exerciseError } from './exercisePreferences'

const n = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 })

export default function ExerciseHistory() {
  const { setTitle } = usePageTitle()
  const userId = useAuthStore(s => String(s.user?.id ?? ''))
  useEffect(() => { setTitle('Exercise History') }, [setTitle])
  return <SessionHistory key={userId} />
}

function SessionHistory() {
  const [start, setStart] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return todayLocal(d) })
  const [end, setEnd] = useState(todayLocal())
  const [logs, setLogs] = useState<ExerciseLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  useEffect(() => {
    let active = true
    setLogs([]); setError('')
    if (!start || !end || start > end) { setError('Choose a valid date range.'); return }
    setLoading(true)
    exerciseApi.getExerciseLogs({ start_date: start, end_date: end }).then(items => { if (active) setLogs(items) })
      .catch(e => { if (active) setError(exerciseError(e)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [start, end, refresh])
  return <div className="p-4 space-y-4">
    <div className="flex items-center justify-between gap-3"><h1 className="text-2xl font-bold">Movement journal</h1><Link className="text-mfp-blue underline text-sm" to="/exercise/log">Log activity</Link></div>
    <div className="grid grid-cols-2 gap-3">
      <label className="text-sm min-w-0">From<input className="block w-full border border-mfp-border rounded-lg p-2 mt-1" type="date" value={start} onChange={e => setStart(e.target.value)} /></label>
      <label className="text-sm min-w-0">Through<input className="block w-full border border-mfp-border rounded-lg p-2 mt-1" type="date" value={end} onChange={e => setEnd(e.target.value)} /></label>
    </div>
    <button className="text-sm text-mfp-blue underline" onClick={() => setRefresh(x => x + 1)}>Refresh history</button>
    {error && <p role="alert" className="text-mfp-error">{error}</p>}
    {loading && <p role="status">Loading sessions…</p>}
    {!loading && !error && !logs.length && <p className="py-6 text-mfp-textSecondary">No sessions in this date range. Every journey starts with one.</p>}
    <div className="space-y-3">{logs.map(log => <article key={log.id} className="border border-mfp-border rounded-xl bg-white p-4 space-y-2">
      <div className="flex justify-between gap-3"><h2 className="font-semibold">{log.exercise_name}</h2><span className="text-xs text-mfp-textSecondary whitespace-nowrap">{log.date || log.logged_at.slice(0, 10)}</span></div>
      <p className="text-sm tabular-nums">{log.duration != null && `${n(log.duration)} min`}{log.details && <> · {n(log.details.speed_mph)} mph · {n(log.details.incline_percent)}% incline · {n(log.details.distance_miles)} mi</>}</p>
      <p className="text-mfp-blue font-semibold tabular-nums">{log.calories_burned == null ? 'Calories not estimated' : `${n(log.calories_burned)} ${log.details ? 'active kcal' : 'kcal · legacy estimate'}`}{log.details?.calorie_override != null && ' · manual'}</p>
      {log.notes && <p className="text-sm text-mfp-textSecondary whitespace-pre-wrap break-words">{log.notes}</p>}
      {log.details && <details className="text-xs text-mfp-textSecondary"><summary>Calculation details</summary><p className="mt-2">{log.details.method} · {n(log.details.weight_lbs)} lb · {log.details.weight_source === 'profile' ? 'profile fallback' : log.details.weight_date}</p><p>Total session: {log.details.gross_calories == null ? 'not estimated' : `${n(log.details.gross_calories)} kcal`}</p>{log.details.warnings.map(w => <p key={w}>{w}</p>)}</details>}
      <div className="flex flex-wrap gap-5 pt-2 text-sm">
        {log.activity_id === 'treadmill_walking' && <><Link className="text-mfp-blue underline" to={`/exercise/log?activity=treadmill_walking&edit=${log.id}`}>Edit session</Link><Link className="text-mfp-blue underline" to={`/exercise/log?activity=treadmill_walking&repeat=${log.id}`}>Repeat activity</Link></>}
        <button className="text-mfp-error underline" onClick={() => { setDeleteId(log.id); setDeleteError('') }}>Delete session</button>
      </div>
    </article>)}</div>
    <Modal isOpen={deleteId != null} onClose={() => { if (!deleting) setDeleteId(null) }} title="Delete exercise session" submitLabel="Delete session" submitDisabled={deleting} submitLoading={deleting} onSubmit={async () => {
      if (!deleteId || deleting) return
      setDeleting(true); setDeleteError('')
      try { await exerciseApi.deleteExerciseLog(deleteId); setLogs(items => items.filter(x => x.id !== deleteId)); setDeleteId(null) }
      catch (e) { setDeleteError(exerciseError(e)) }
      finally { setDeleting(false) }
    }}><p>This removes the session and its photo. Shared photos remain available to other logs.</p>{deleteError && <p role="alert" className="text-mfp-error">{deleteError}</p>}</Modal>
  </div>
}

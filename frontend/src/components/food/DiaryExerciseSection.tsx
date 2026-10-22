import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { exerciseApi } from '@/api/exercise'
import { useAuthStore } from '@/store/authStore'
import type { ExerciseLog } from '@/types'
import Modal from '@/components/common/Modal'
import { ExercisePhotoViewer } from '@/components/exercise/ExercisePhotoField'

const number = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 })
const totalOf = (logs: ExerciseLog[]) => Math.round(logs.reduce((sum, log) => sum + (log.calories_burned ?? 0), 0) * 100) / 100
export default function DiaryExerciseSection({ date, onTotal }: {
  date: string
  onTotal: (summary: { date: string; total: number }) => void
}) {
  const userId = useAuthStore(s => s.user?.id)
  const [result, setResult] = useState<{ date: string; userId: unknown; logs: ExerciseLog[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
  const [photoViewer, setPhotoViewer] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const generation = useRef(0)
  useEffect(() => {
    const token = ++generation.current
    setLoading(true); setError(''); setResult(null); onTotal({ date, total: 0 })
    setDeleteId(null); setDeleteError(''); setDeleting(false); setPhotoViewer(null)
    exerciseApi.getExerciseLogs({ start_date: date, end_date: date }).then(logs => {
      if (token !== generation.current) return
      setResult({ date, userId, logs })
      onTotal({ date, total: totalOf(logs) })
    }).catch(e => {
      if (token === generation.current) setError(e?.response?.data?.error || 'Unable to load exercise for this day.')
    }).finally(() => { if (token === generation.current) setLoading(false) })
    return () => { generation.current++ }
  }, [date, userId, attempt, onTotal])
  const logs = result?.date === date && result.userId === userId ? result.logs : []
  const remove = async () => {
    if (!deleteId || deleting) return
    const token = generation.current
    setDeleting(true); setDeleteError('')
    try {
      await exerciseApi.deleteExerciseLog(deleteId)
      if (token !== generation.current) return
      const remaining = logs.filter(log => String(log.id) !== String(deleteId))
      setResult({ date, userId, logs: remaining }); onTotal({ date, total: totalOf(remaining) }); setDeleteId(null)
    } catch (e: any) {
      if (token === generation.current) setDeleteError(e?.response?.data?.error || 'Unable to delete exercise. Please try again.')
    } finally { if (token === generation.current) setDeleting(false) }
  }
  return <section aria-label="Diary exercise" className="bg-white rounded-lg">
    <button type="button" onClick={() => setCollapsed(x => !x)} aria-expanded={!collapsed} aria-label="Exercise section" className="flex items-center justify-between w-full px-4 py-3 cursor-pointer bg-[#185ADB] rounded-t-lg text-left">
      <span className="font-bold text-white">Exercise</span>
      <span className="flex items-center gap-2 text-white text-sm">{number(totalOf(logs))} cal<svg className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></span>
    </button>
    {!collapsed && <div className="divide-y divide-[#e0e0e0]">
      {loading && <p role="status" className="px-4 py-3 text-sm text-[#757575]">Loading exercise…</p>}
      {error && <div className="px-4 py-3 text-sm"><p role="alert">{error}</p><button className="text-mfp-blue underline mt-2" onClick={() => setAttempt(x => x + 1)}>Retry exercise</button></div>}
      {!loading && !error && logs.length === 0 && <p className="px-4 py-3 text-sm text-[#757575]">No exercise logged for this day.</p>}
      {logs.map(log => {
        const content = <>
          <span className="font-medium text-sm text-[#212121]">{log.exercise_name}</span>
          <span className="block text-xs text-[#757575] mt-0.5">{log.duration != null && `${number(log.duration)} min`}{log.details && <> · {number(log.details.speed_mph)} mph · {number(log.details.incline_percent)}% incline · {number(log.details.distance_miles)} mi</>}</span>
          <span className="block text-xs text-[#757575] mt-0.5">{log.calories_burned == null ? 'Calories not estimated' : `${number(log.calories_burned)} cal`} · {log.details ? 'Active · estimated' : 'Legacy estimate'}{log.details?.arms_supported && ' · Arms supported'}</span>
        </>
        return <div key={log.id} className="flex items-center justify-between hover:bg-[#fafafa] transition-colors">
          {log.photo_endpoint && <button type="button" aria-label={`View photo for ${log.exercise_name}`} className="ml-4 shrink-0" onClick={() => setPhotoViewer(log.photo_endpoint!)}><img src={log.photo_endpoint} alt="" className="w-10 h-10 rounded object-cover" /></button>}
          {log.activity_id === 'treadmill_walking'
            ? <Link className="flex-1 min-w-0 px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#185ADB]" aria-label={`Edit ${log.exercise_name}`} to={`/exercise/log?activity=treadmill_walking&edit=${log.id}`}>{content}</Link>
            : <div className="flex-1 min-w-0 px-4 py-3">{content}</div>}
          <button type="button" className="text-[#757575] hover:text-red-600 transition-colors shrink-0 p-1 mr-4" aria-label={`Delete ${log.exercise_name}`} onClick={() => { setDeleteId(log.id); setDeleteError('') }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      })}
      <Link className="block w-full py-3 text-center text-sm font-medium text-[#185ADB] border-t border-[#e0e0e0] hover:bg-[#f2f2f2] transition-colors rounded-b-lg" to="/exercise/log">+ Add Exercise</Link>
    </div>}
    {photoViewer && <ExercisePhotoViewer src={photoViewer} onClose={() => setPhotoViewer(null)} />}
    <Modal isOpen={deleteId !== null} onClose={() => { if (!deleting) setDeleteId(null) }} title="Delete Exercise Log" submitLabel="Delete" onSubmit={remove} submitDisabled={deleting} submitLoading={deleting}>
      <p>Are you sure you want to delete this exercise log? This action cannot be undone.</p>
      {deleteError && <p role="alert" className="text-mfp-error mt-2">{deleteError}</p>}
    </Modal>
  </section>
}

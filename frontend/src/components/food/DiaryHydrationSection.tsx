import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { hydrationApi, hydrationError, type HydrationDay } from '@/api/hydration'
import { useAuthStore } from '@/store/authStore'
import Modal from '@/components/common/Modal'
const ounces = (amount: number) => amount.toLocaleString(undefined, { maximumFractionDigits: 2 })
export default function DiaryHydrationSection({ date }: { date: string }) {
  const userId = useAuthStore(state => state.user?.id)
  return <HydrationSection key={`${userId}:${date}`} date={date} />
}
function HydrationSection({ date }: { date: string }) {
  const [day, setDay] = useState<HydrationDay | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [closed, setClosed] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setDay(null)
    hydrationApi.list(date).then(value => { if (active) setDay(value) }).catch(e => { if (active) setError(hydrationError(e)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [date, attempt])
  return <section aria-label="Diary Hydration" className="bg-white rounded-lg">
    <button type="button" className="flex items-center justify-between w-full px-4 py-3 bg-[#185ADB] text-white rounded-t-lg text-left" aria-label="Hydration section" aria-expanded={!closed} onClick={() => setClosed(value => !value)}><span className="font-bold">Hydration</span><span className="text-sm">{day ? `${ounces(day.total_oz)} fl oz` : '—'} <span aria-hidden="true">{closed ? '›' : '⌄'}</span></span></button>
    {!closed && <div className="divide-y divide-[#e0e0e0]">
      {loading && <p role="status" className="px-4 py-3 text-sm text-[#757575]">Loading hydration…</p>}
      {error && <div className="px-4 py-3 text-sm"><p role="alert">{error}</p><button className="text-mfp-blue underline" onClick={() => setAttempt(value => value + 1)}>Retry hydration</button></div>}
      {day && !day.logs.length && <p className="px-4 py-3 text-sm text-[#757575]">No water logged for this day.</p>}
      {day?.logs.map(log => <div key={log.id} className="flex items-center justify-between hover:bg-[#fafafa]">
        <Link className="flex-1 min-w-0 px-4 py-3" to={`/hydration/log/${log.id}`} aria-label={`Edit hydration at ${log.logged_at.slice(11, 16)}`}><span className="font-medium text-sm">Water · {ounces(log.amount_oz)} fl oz</span><span className="block text-xs text-[#757575] mt-0.5">{log.logged_at.slice(11, 16)}</span>{log.notes && <span className="block text-xs text-[#757575] mt-0.5 whitespace-pre-wrap break-words">{log.notes}</span>}</Link>
        <button type="button" aria-label={`Delete hydration at ${log.logged_at.slice(11, 16)}`} className="text-[#757575] hover:text-red-600 p-1 mr-4 shrink-0" onClick={() => { setDeleteId(log.id); setDeleteError('') }}><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth={2} strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
      </div>)}
      <Link to={`/hydration/log?date=${date}`} className="block py-3 text-center text-sm font-medium text-[#185ADB] rounded-b-lg hover:bg-[#f2f2f2]">+ Log Hydration</Link>
    </div>}
    <Modal title="Delete Hydration" isOpen={deleteId != null} onClose={() => { if (!deleting) setDeleteId(null) }} submitLabel="Delete" submitDisabled={deleting} submitLoading={deleting} onSubmit={async () => {
      if (deleteId == null || deleting) return
      setDeleting(true); setDeleteError('')
      try {
        await hydrationApi.remove(deleteId)
        if (alive.current) { setDay(previous => { if (!previous) return previous; const logs = previous.logs.filter(log => log.id !== deleteId); return { ...previous, logs, total_oz: logs.reduce((sum, log) => sum + log.amount_oz, 0) } }); setDeleteId(null) }
      } catch (e) { if (alive.current) setDeleteError(hydrationError(e)) }
      finally { if (alive.current) setDeleting(false) }
    }}><p>Delete this water entry? This cannot be undone.</p>{deleteError && <p role="alert" className="text-mfp-error mt-2">{deleteError}</p>}</Modal>
  </section>
}

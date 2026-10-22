import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { healthApi, healthError, type HealthEntry, type HealthKind } from '@/api/health'
import { useAuthStore } from '@/store/authStore'
import Modal from '@/components/common/Modal'

export default function DiaryHealthSections({ date }: { date: string }) {
  const userId = useAuthStore(s => s.user?.id)
  return <HealthSections key={`${userId}:${date}`} date={date} />
}
function HealthSections({ date }: { date: string }) {
  const [logs, setLogs] = useState<HealthEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [collapsed, setCollapsed] = useState<HealthKind[]>([])
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    healthApi.list(date).then(items => { if (active) setLogs(items) })
      .catch(e => { if (active) setError(healthError(e)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [date, attempt])
  return <>
    {error && <div className="bg-white p-4 rounded-lg text-sm"><p role="alert">{error}</p><button className="text-mfp-blue underline mt-2" onClick={() => setAttempt(x => x + 1)}>Retry health logs</button></div>}
    {(['medication', 'bowel'] as HealthKind[]).map(kind => {
      const title = kind === 'medication' ? 'Medication' : 'Bowel Movements'
      const entries = logs.filter(log => log.kind === kind)
      const closed = collapsed.includes(kind)
      return <section key={kind} aria-label={`Diary ${title}`} className="bg-white rounded-lg">
        <button type="button" className="flex items-center justify-between w-full px-4 py-3 bg-[#185ADB] rounded-t-lg text-left text-white" aria-expanded={!closed} onClick={() => setCollapsed(items => closed ? items.filter(x => x !== kind) : [...items, kind])}>
          <span className="font-bold">{title}</span><span className="text-sm">{entries.length} {entries.length === 1 ? 'entry' : 'entries'} <span aria-hidden="true">{closed ? '›' : '⌄'}</span></span>
        </button>
        {!closed && <div className="divide-y divide-[#e0e0e0]">
          {loading && <p role="status" className="px-4 py-3 text-sm text-[#757575]">Loading {title.toLowerCase()}…</p>}
          {!loading && !error && !entries.length && <p className="px-4 py-3 text-sm text-[#757575]">No {kind === 'medication' ? 'medication' : 'bowel movements'} logged for this day.</p>}
          {entries.map(log => <div key={log.id} className="flex items-center justify-between hover:bg-[#fafafa] transition-colors">
            <Link className="flex-1 min-w-0 px-4 py-3" aria-label={`Edit ${kind === 'medication' ? 'medication' : 'bowel movement'} at ${log.logged_at.slice(11, 16)}`} to={`/health/log/${kind}/${log.id}`}>
              <span className="font-medium text-sm text-[#212121]">{kind === 'medication' ? `Wegovy pill · ${log.dose_mg} mg` : 'Bowel movement'}</span>
              <span className="block text-xs text-[#757575] mt-0.5">{log.logged_at.slice(11, 16)}</span>
              {log.notes && <span className="block text-xs text-[#757575] mt-0.5 whitespace-pre-wrap break-words">{log.notes}</span>}
            </Link>
            <button type="button" aria-label={`Delete ${kind === 'medication' ? 'medication' : 'bowel movement'} at ${log.logged_at.slice(11, 16)}`} className="text-[#757575] hover:text-red-600 shrink-0 p-1 mr-4" onClick={() => { setDeleteId(log.id); setDeleteError('') }}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>)}
          <Link className="block py-3 text-center text-sm font-medium text-[#185ADB] border-t border-[#e0e0e0] rounded-b-lg hover:bg-[#f2f2f2]" to={`/health/log/${kind}?date=${date}`}>+ {kind === 'medication' ? 'Log Medication' : 'Log Bowel Movement'}</Link>
        </div>}
      </section>
    })}
    <Modal isOpen={deleteId != null} onClose={() => { if (!deleting) setDeleteId(null) }} title="Delete Health Log" submitLabel="Delete" submitDisabled={deleting} submitLoading={deleting} onSubmit={async () => {
      if (deleteId == null || deleting) return
      setDeleting(true); setDeleteError('')
      try { await healthApi.remove(deleteId); if (alive.current) { setLogs(items => items.filter(x => x.id !== deleteId)); setDeleteId(null) } }
      catch (e) { if (alive.current) setDeleteError(healthError(e)) }
      finally { if (alive.current) setDeleting(false) }
    }}><p>Delete this entry? This cannot be undone.</p>{deleteError && <p role="alert" className="text-mfp-error mt-2">{deleteError}</p>}</Modal>
  </>
}

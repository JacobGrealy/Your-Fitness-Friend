import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { weightApi } from '@/api/weight'
import { useAuthStore } from '@/store/authStore'
import Modal from '@/components/common/Modal'
import ThumbnailImage from '@/components/common/ThumbnailImage'
import { formatWeight } from '@/utils/formatters'
import { weightPhotoUrl } from '@/utils/photoUrl'
import type { WeightLog } from '@/types'

/**
 * The day's weigh-ins, in the diary (FF-0137).
 *
 * Same shape as the Hydration section: a blue collapsible header, one row per entry with
 * its own edit link and delete button, and a bottom link that logs against the selected
 * day. Weight logs are stored at midnight, so a row shows no clock time — "00:00" on
 * every line would be noise — and the notes carry the detail instead.
 */
export default function DiaryWeightSection({ date }: { date: string }) {
  const userId = useAuthStore(state => state.user?.id)
  return <WeightSection key={`${userId}:${date}`} date={date} />
}

const errorMessage = (error: any): string =>
  typeof error?.response?.data?.error === 'string'
    ? error.response.data.error
    : 'Unable to load weight for this day.'

/** Newest first. Id breaks ties because every weigh-in on a day shares midnight (FF-0090). */
const newestFirst = (logs: WeightLog[]) =>
  [...logs].sort((a, b) => {
    const byTime = new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    if (byTime !== 0) return byTime
    return Number(b.id) - Number(a.id)
  })

function WeightSection({ date }: { date: string }) {
  const [logs, setLogs] = useState<WeightLog[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [closed, setClosed] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setLogs(null)
    weightApi.getLogsByDate(date)
      .then(items => { if (active) setLogs(newestFirst(items)) })
      .catch(e => { if (active) setError(errorMessage(e)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [date, attempt])

  const entries = logs ?? []
  const summary = !logs ? '—' : entries.length === 0 ? '—' : entries.length === 1 ? formatWeight(entries[0].weight) : `${entries.length} entries`

  return <section aria-label="Diary Weight" className="bg-white rounded-lg">
    <button type="button" className="flex items-center justify-between w-full px-4 py-3 bg-[#185ADB] text-white rounded-t-lg text-left" aria-label="Weight section" aria-expanded={!closed} onClick={() => setClosed(value => !value)}><span className="font-bold">Weight</span><span className="text-sm">{summary} <span aria-hidden="true">{closed ? '›' : '⌄'}</span></span></button>
    {!closed && <div className="divide-y divide-[#e0e0e0]">
      {loading && <p role="status" className="px-4 py-3 text-sm text-[#757575]">Loading weight…</p>}
      {error && <div className="px-4 py-3 text-sm"><p role="alert">{error}</p><button className="text-mfp-blue underline" onClick={() => setAttempt(value => value + 1)}>Retry weight</button></div>}
      {logs && !logs.length && <p className="px-4 py-3 text-sm text-[#757575]">No weight logged for this day.</p>}
      {entries.map(log => <div key={log.id} className="flex items-center justify-between hover:bg-[#fafafa] transition-colors">
        <Link className="flex-1 min-w-0 flex items-center px-4 py-3" to={`/weight/history/${log.id}/edit`} aria-label={`Edit weight ${formatWeight(log.weight)}`}>
          {log.photo_url && <ThumbnailImage src={weightPhotoUrl(log.photo_url)} alt="" className="w-10 h-10 rounded object-cover shrink-0 mr-3" />}
          <span className="min-w-0">
            <span className="block font-medium text-sm text-[#212121]">{formatWeight(log.weight)}</span>
            {log.notes && <span className="block text-xs text-[#757575] mt-0.5 whitespace-pre-wrap break-words">{log.notes}</span>}
          </span>
        </Link>
        <button type="button" aria-label={`Delete weight ${formatWeight(log.weight)}`} className="text-[#757575] hover:text-red-600 shrink-0 p-1 mr-4" onClick={() => { setDeleteId(log.id); setDeleteError('') }}><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth={2} strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
      </div>)}
      <Link to={`/weight/log?date=${date}`} className="block py-3 text-center text-sm font-medium text-[#185ADB] rounded-b-lg hover:bg-[#f2f2f2]">+ Log Weight</Link>
    </div>}
    <Modal title="Delete Weight" isOpen={deleteId != null} onClose={() => { if (!deleting) setDeleteId(null) }} submitLabel="Delete" submitDisabled={deleting} submitLoading={deleting} onSubmit={async () => {
      if (deleteId == null || deleting) return
      setDeleting(true); setDeleteError('')
      try {
        await weightApi.deleteLog(deleteId)
        if (alive.current) { setLogs(previous => previous && previous.filter(log => log.id !== deleteId)); setDeleteId(null) }
      } catch (e) { if (alive.current) setDeleteError(errorMessage(e)) }
      finally { if (alive.current) setDeleting(false) }
    }}><p>Delete this weigh-in? This cannot be undone.</p>{deleteError && <p role="alert" className="text-mfp-error mt-2">{deleteError}</p>}</Modal>
  </section>
}

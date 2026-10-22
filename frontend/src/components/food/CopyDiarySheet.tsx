import { useEffect, useRef, useState } from 'react'
import { copyDiary, type CopyKind, type CopyResult } from '@/api/diaryCopy'
import { exerciseError } from '@/pages/Exercise/exercisePreferences'

export interface CopyEntry { id: number; label: string; detail?: string }
export default function CopyDiarySheet({ kind, sourceDate, entries, onClose, onCopied }: {
  kind: CopyKind; sourceDate: string; entries: CopyEntry[]; onClose: () => void; onCopied: (result: CopyResult) => void
}) {
  const [destination, setDestination] = useState('')
  const [selected, setSelected] = useState(entries.map(entry => entry.id))
  const [confirmed, setConfirmed] = useState(false)
  const [copying, setCopying] = useState(false)
  const [error, setError] = useState('')
  const busy = useRef(false)
  const alive = useRef(true)
  const request = useRef<{ signature: string; id: string } | null>(null)
  const title = kind === 'exercise' ? 'Exercise' : kind === 'medication' ? 'Medication' : 'Bowel Movements'
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); if (!busy.current) onClose() } }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onClose])
  const sameDate = destination === sourceDate
  return <div role="dialog" aria-modal="true" aria-label={`Copy ${title}`} className="fixed inset-0 z-50 flex items-end justify-center bg-black/45" onClick={() => { if (!busy.current) onClose() }}>
    <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-white rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-4" onClick={event => event.stopPropagation()}>
      <header><h2 className="font-bold text-lg">Copy {title}</h2><p className="text-xs text-[#757575] mt-1">From {sourceDate}. Originals stay unchanged.</p></header>
      {error && <p role="alert" className="text-mfp-error text-sm">{error}</p>}
      <fieldset disabled={copying} className="space-y-3"><legend className="text-sm font-medium mb-2">Select entries · {selected.length} of {entries.length}</legend>
        {entries.map(entry => <label key={entry.id} className="flex items-start gap-3 border border-[#e0e0e0] rounded-lg p-3 text-sm"><input type="checkbox" className="mt-1" checked={selected.includes(entry.id)} onChange={event => { setSelected(ids => event.target.checked ? [...ids, entry.id] : ids.filter(id => id !== entry.id)); setConfirmed(false) }} /><span className="min-w-0 break-words">{entry.label}{entry.detail && <span className="block text-xs text-[#757575] mt-1">{entry.detail}</span>}</span></label>)}
        <label className="block text-sm font-medium">Copy to date<input type="date" className="block w-full border rounded-lg px-3 py-2.5 mt-1 bg-white" value={destination} onChange={event => { setDestination(event.target.value); setConfirmed(false) }} /></label>
        {sameDate && <p className="text-sm text-mfp-error">Choose a different destination date.</p>}
        <p className="text-xs text-[#757575]">{kind === 'exercise' ? 'Photos are not copied. Estimates are recalculated using destination-date weight; manual calorie inputs are preserved. Legacy estimates without original inputs remain unchanged.' : 'Listed local times, doses and notes are preserved. Copying records actual events—not a reminder, prescription or planned dose.'}</p>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /><span>{kind === 'exercise' ? 'I confirm these selected workouts occurred on the destination date.' : kind === 'medication' ? 'I confirm these doses were actually taken on the destination date, at the listed times.' : 'I confirm these bowel movements actually occurred on the destination date, at the listed times.'}</span></label>
      </fieldset>
      <button type="button" className="w-full py-3 bg-[#185ADB] text-white rounded-xl font-semibold text-sm disabled:opacity-50" disabled={copying || !selected.length || !destination || sameDate || !confirmed} onClick={async () => {
        if (busy.current || !selected.length || !destination || sameDate || !confirmed) return
        busy.current = true; setCopying(true); setError('')
        try {
          const signature = JSON.stringify([kind, sourceDate, destination, [...selected].sort((a, b) => a - b)])
          if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() }
          const result = await copyDiary(kind, { source_date: sourceDate, destination_date: destination, log_ids: selected, confirmed: true, request_id: request.current.id })
          if (alive.current) onCopied(result)
        } catch (e) { if (alive.current) setError(exerciseError(e)) }
        finally { busy.current = false; if (alive.current) setCopying(false) }
      }}>{copying ? 'Copying…' : `Copy ${selected.length} ${selected.length === 1 ? 'entry' : 'entries'}${destination ? ` to ${destination}` : ''}`}</button>
      <button type="button" className="w-full py-2 text-sm text-[#757575]" disabled={copying} onClick={onClose}>Cancel</button>
    </div>
  </div>
}

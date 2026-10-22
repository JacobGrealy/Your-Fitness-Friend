import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { healthApi, healthError, type HealthKind, type HealthPayload } from '@/api/health'
import { useAuthStore } from '@/store/authStore'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import { todayLocal } from '@/utils/localDate'

const input = 'w-full border border-mfp-border rounded-lg px-3 py-3 bg-white mt-1 focus:ring-2 focus:ring-mfp-blue'
const localNow = () => { const now = new Date(); return `${todayLocal(now)}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` }
export default function LogHealth() {
  const { kind, id } = useParams()
  const userId = useAuthStore(s => s.user?.id)
  const { setTitle } = usePageTitle()
  useEffect(() => { setTitle(kind === 'medication' ? 'Log Medication' : 'Log Bowel Movement') }, [kind, setTitle])
  if (kind !== 'medication' && kind !== 'bowel') return <p className="p-4" role="alert">Unknown log type. <Link to="/food/daily">Return to diary</Link></p>
  return <HealthForm key={`${userId}:${kind}:${id}`} kind={kind} id={id} />
}

function HealthForm({ kind, id }: { kind: HealthKind; id?: string }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [stamp, setStamp] = useState(() => {
    const now = localNow(); const day = params.get('date')
    return day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day + now.slice(10) : now
  })
  const [dose, setDose] = useState(1.5)
  const [doses, setDoses] = useState<number[]>([])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    let active = true
    setLoading(true); setLoadError('')
    const load = async () => {
      const options = kind === 'medication' ? await healthApi.options() : null
      const entry = id ? await healthApi.get(id) : null
      if (!active) return
      if (entry && entry.kind !== kind) throw new Error('Log type mismatch')
      if (options) { setDoses(options.dose_options_mg); setDose(entry?.dose_mg ?? options.default_dose_mg) }
      if (entry) { setStamp(entry.logged_at); setNotes(entry.notes || '') }
    }
    load().catch(e => { if (active) setLoadError(healthError(e)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [kind, id, attempt])
  const medication = kind === 'medication'
  if (loading) return <p role="status" className="p-4">Loading log…</p>
  if (loadError) return <div className="p-4 space-y-3"><p role="alert">{loadError}</p><button className="text-mfp-blue underline" onClick={() => setAttempt(x => x + 1)}>Retry</button></div>
  return <form className="p-4 space-y-5" onSubmit={async event => {
    event.preventDefault(); if (saving) return
    setSaving(true); setError('')
    const payload: HealthPayload = { kind, logged_at: stamp, notes, ...(medication ? { dose_mg: dose } : {}) }
    try { const entry = await healthApi.save(payload, id); if (alive.current) navigate(`/food/daily?date=${entry.date}`) }
    catch (e) { if (alive.current) setError(healthError(e)) }
    finally { if (alive.current) setSaving(false) }
  }}>
    <Link className="text-mfp-blue text-sm" to="/food/daily">← Diary</Link>
    <header className="border-l-4 border-mfp-blue pl-4"><p className="uppercase tracking-widest text-xs text-mfp-textSecondary">{id ? 'Edit entry' : 'Personal health log'}</p><h1 className="text-2xl font-bold mt-1">{medication ? 'Wegovy pill' : 'Bowel movement'}</h1><p className="text-sm text-mfp-textSecondary mt-1">{medication ? 'Record the dose you actually took.' : 'Date, time, and anything you want to note.'}</p></header>
    {error && <p role="alert" className="text-mfp-error">{error}</p>}
    <fieldset disabled={saving} className="space-y-4">
      <label className="block text-sm font-medium">{medication ? 'Date and time taken' : 'Date and time'}<input className={input} type="datetime-local" required value={stamp} onChange={e => setStamp(e.target.value)} /></label>
      {medication && <label className="block text-sm font-medium">Dose (mg)<select className={input} value={dose} onChange={e => setDose(Number(e.target.value))}>{doses.map(value => <option key={value} value={value}>{value} mg</option>)}</select><span className="block text-xs text-mfp-textSecondary mt-1">Defaults to your last logged selection, or 1.5 mg with no history. This is a record, not a dosing recommendation.</span></label>}
      <label className="block text-sm font-medium">Notes (optional)<textarea className={input} rows={3} maxLength={1000} value={notes} onChange={e => setNotes(e.target.value)} /></label>
    </fieldset>
    <button type="submit" disabled={saving} className="w-full bg-mfp-blue text-white rounded-lg py-3 font-semibold disabled:opacity-50">{saving ? 'Saving…' : id ? 'Save changes' : medication ? 'Log medication' : 'Log bowel movement'}</button>
  </form>
}

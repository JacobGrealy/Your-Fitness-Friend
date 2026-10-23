import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { hydrationApi, hydrationError } from '@/api/hydration'
import { useAuthStore } from '@/store/authStore'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import { requestedLocalDate } from '@/utils/localDate'
const input = 'w-full border border-mfp-border rounded-lg px-3 py-3 bg-white mt-1 focus:ring-2 focus:ring-mfp-blue'
export default function LogHydration() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const userId = useAuthStore(s => s.user?.id)
  const { setTitle } = usePageTitle()
  useEffect(() => { setTitle('Log Hydration') }, [setTitle])
  return <HydrationForm key={`${userId}:${id}:${params.get('date')}`} id={id} />
}
function HydrationForm({ id }: { id?: string }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [stamp, setStamp] = useState(() => {
    const now = new Date()
    return `${requestedLocalDate(params.get('date'))}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const alive = useRef(true)
  const busy = useRef(false)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    let active = true
    setLoading(true); setLoadError('')
    const load = async () => {
      if (id) {
        const entry = await hydrationApi.get(id)
        if (active) { setAmount(String(entry.amount_oz)); setStamp(entry.logged_at); setNotes(entry.notes || '') }
      } else {
        const options = await hydrationApi.options()
        if (active) setAmount(String(options.default_amount_oz))
      }
    }
    load().catch(e => { if (active) setLoadError(hydrationError(e)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, attempt])
  if (loading) return <p role="status" className="p-4">Loading hydration…</p>
  if (loadError) return <div className="p-4 space-y-3"><p role="alert">{loadError}</p><button className="text-mfp-blue underline" onClick={() => setAttempt(value => value + 1)}>Retry hydration</button></div>
  const valid = amount !== '' && Number.isFinite(Number(amount)) && Number(amount) > 0 && Number(amount) <= 1000 && !!stamp
  return <form className="p-4 space-y-5" onSubmit={async event => {
    event.preventDefault(); if (!valid || busy.current) return
    busy.current = true; setSaving(true); setError('')
    try {
      const entry = await hydrationApi.save({ amount_oz: Number(amount), logged_at: stamp, notes }, id)
      if (alive.current) navigate(`/food/daily?date=${entry.date}`)
    } catch (e) { if (alive.current) setError(hydrationError(e)) }
    finally { busy.current = false; if (alive.current) setSaving(false) }
  }}>
    <Link to={`/food/daily?date=${stamp.slice(0, 10)}`} className="text-mfp-blue text-sm">← Diary</Link>
    <header className="border-l-4 border-mfp-blue pl-4"><p className="text-xs uppercase tracking-widest text-mfp-textSecondary">{id ? 'Edit water intake' : 'Water intake'}</p><h1 className="text-2xl font-bold mt-1">Hydration</h1><p className="text-sm text-mfp-textSecondary mt-1">Finished a bottle? Record the water you drank.</p></header>
    {error && <p role="alert" className="text-mfp-error">{error}</p>}
    <fieldset disabled={saving} className="space-y-4">
      <label className="block text-sm font-medium">Water (fl oz)<input aria-label="Water (fl oz)" className={input} type="number" min="0.01" max="1000" step="any" required inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} /><span className="block mt-1 text-xs text-mfp-textSecondary">US fluid ounces. Defaults to your last logged amount, or 24 oz with no history.</span></label>
      <label className="block text-sm font-medium">Date and time<input className={input} type="datetime-local" required value={stamp} onChange={e => setStamp(e.target.value)} /></label>
      <label className="block text-sm font-medium">Notes (optional)<textarea className={input} rows={3} maxLength={1000} value={notes} onChange={e => setNotes(e.target.value)} /></label>
    </fieldset>
    <button type="submit" disabled={saving || !valid} className="w-full bg-mfp-blue rounded-lg py-3 text-white font-semibold disabled:opacity-50">{saving ? 'Saving…' : id ? 'Save hydration changes' : 'Log hydration'}</button>
  </form>
}

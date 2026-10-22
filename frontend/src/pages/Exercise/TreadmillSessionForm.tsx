import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { exerciseApi } from '@/api/exercise'
import { useExerciseStore } from '@/store/exerciseStore'
import type { ExerciseEstimate, TreadmillSessionCreate } from '@/types'
import { todayLocal } from '@/utils/localDate'
import { exerciseError, exerciseKey, readPreference, writePreference } from './exercisePreferences'
import ExercisePhotoField, { emptyExercisePhoto, type ExercisePhotoDraft } from '@/components/exercise/ExercisePhotoField'

const input = 'w-full rounded-lg border border-mfp-border bg-white px-3 py-3 text-mfp-text focus:ring-2 focus:ring-mfp-blue'
const display = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 })

export default function TreadmillSessionForm({ userId }: { userId: string }) {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const editId = params.get('edit') || undefined
  const repeatId = params.get('repeat') || undefined
  const remembered = useMemo(() => readPreference<any>(exerciseKey(userId, 'treadmill'), {}), [userId])
  const [date, setDate] = useState(todayLocal())
  const [duration, setDuration] = useState('')
  const [speed, setSpeed] = useState(String(remembered?.speed_mph ?? ''))
  const [incline, setIncline] = useState(String(remembered?.incline_percent ?? 0))
  const [mode, setMode] = useState<'mph' | 'km/h' | 'min/mile' | 'min/km'>('mph')
  const [override, setOverride] = useState('')
  const [armsSupported, setArmsSupported] = useState(false)
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState<ExercisePhotoDraft>(emptyExercisePhoto)
  const [initialPhoto, setInitialPhoto] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!(editId || repeatId))
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [previewError, setPreviewError] = useState('')
  const [preview, setPreview] = useState<ExerciseEstimate | null>(null)
  const [estimating, setEstimating] = useState(false)
  const [saving, setSaving] = useState(false)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  useEffect(() => {
    if (!editId && !repeatId) return
    let active = true
    exerciseApi.getExerciseLog((editId || repeatId)!).then(log => {
      if (!active) return
      if (log.activity_id !== 'treadmill_walking' || !log.details || !('speed_mph' in log.details)) throw new Error('Unsupported session')
      setSpeed(String(log.details.speed_mph)); setIncline(String(log.details.incline_percent))
      setArmsSupported(log.details.arms_supported === true)
      if (editId) {
        setInitialPhoto(log.photo_endpoint || null)
        setDate(log.date || log.logged_at.slice(0, 10)); setDuration(String(log.duration))
        setNotes(log.notes || ''); setOverride(log.details.calorie_override == null ? '' : String(log.details.calorie_override))
      }
      // Repeats intentionally begin today without duration, override, notes or photo.
    }).catch(e => { if (active) setLoadError(exerciseError(e)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [editId, repeatId])

  const payload = useMemo<TreadmillSessionCreate | null>(() => {
    if (!date || !duration || !speed || !incline || Number(duration) <= 0 || Number(speed) <= 0) return null
    const numeric = [Number(duration), Number(speed), Number(incline)]
    if (override !== '') numeric.push(Number(override))
    if (!numeric.every(Number.isFinite)) return null
    return {
      activity_id: 'treadmill_walking', date, duration_minutes: Number(duration), incline_percent: Number(incline),
      ...(mode === 'mph' || mode === 'km/h' ? { speed: Number(speed), speed_unit: mode } : { pace: Number(speed), pace_unit: mode }),
      ...(override !== '' ? { calorie_override: Number(override) } : {}), notes, arms_supported: armsSupported,
    }
  }, [date, duration, speed, mode, incline, override, notes, armsSupported])

  useEffect(() => {
    let active = true
    setPreview(null); setPreviewError(''); setEstimating(false)
    if (!payload || loading || loadError) return
    setEstimating(true)
    const timer = setTimeout(() => {
      exerciseApi.estimateSession(payload, editId).then(value => { if (active) setPreview(value) })
        .catch(e => { if (active) setPreviewError(exerciseError(e)) })
        .finally(() => { if (active) setEstimating(false) })
    }, 300)
    return () => { active = false; clearTimeout(timer) }
  }, [payload, loading, loadError])

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!payload || saving) return
    setSaving(true); setError('')
    try {
      const result = photo.file || photo.remove
        ? await exerciseApi.saveSession(payload, editId, photo.file || undefined, photo.remove)
        : await exerciseApi.saveSession(payload, editId)
      if (!alive.current) return
      if (result.details && 'speed_mph' in result.details) writePreference(exerciseKey(userId, 'treadmill'), { speed_mph: result.details.speed_mph, incline_percent: result.details.incline_percent })
      writePreference(exerciseKey(userId, 'recent'), 'treadmill_walking')
      void useExerciseStore.getState().fetchExerciseLogs()
      navigate('/food/daily')
    } catch (e) { if (alive.current) setError(exerciseError(e)) }
    finally { if (alive.current) setSaving(false) }
  }
  if (loading) return <p role="status" className="p-4">Loading session…</p>
  if (loadError) return <div className="p-4"><p role="alert">{loadError}</p><Link to="/food/daily">Back to diary</Link></div>
  return <form onSubmit={save} className="p-4 space-y-5">
    <Link to="/exercise/log" className="text-sm text-mfp-blue">← All activities</Link>
    <header className="border-l-4 border-mfp-blue pl-4">
      <p className="text-xs uppercase tracking-widest text-mfp-textSecondary">{editId ? 'Edit session' : repeatId ? 'Repeat activity · new session' : 'Cardio · Treadmill walking'}</p>
      <h1 className="text-2xl font-bold mt-1">Walking Pad / Treadmill</h1>
      <p className="text-sm text-mfp-textSecondary mt-1">Your time. Your pace. Every step counts.</p>
    </header>
    {error && <p role="alert" className="text-mfp-error">{error}</p>}
    <fieldset disabled={saving} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium min-w-0">Session date<input className={`${input} mt-1`} type="date" required value={date} onChange={e => setDate(e.target.value)} /></label>
        <label className="text-sm font-medium">Time (minutes)<input className={`${input} mt-1`} type="number" required min="0.1" max="1440" step="any" value={duration} onChange={e => setDuration(e.target.value)} placeholder="30" /></label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">Speed / pace units<select className={`${input} mt-1`} value={mode} onChange={e => {
          const next = e.target.value as typeof mode
          const raw = Number(speed)
          if (raw > 0) {
            const mph = mode === 'mph' ? raw : mode === 'km/h' ? raw / 1.609344 : mode === 'min/mile' ? 60 / raw : 60 / raw / 1.609344
            setSpeed(String(Number((next === 'mph' ? mph : next === 'km/h' ? mph * 1.609344 : next === 'min/mile' ? 60 / mph : 60 / mph / 1.609344).toFixed(6))))
          }
          setMode(next)
        }}><option value="mph">mph</option><option value="km/h">km/h</option><option value="min/mile">min/mile</option><option value="min/km">min/km</option></select></label>
        <label className="text-sm font-medium">{mode.startsWith('min') ? 'Pace' : 'Speed'} ({mode})<input className={`${input} mt-1`} type="number" required min="0.01" step="any" value={speed} onChange={e => setSpeed(e.target.value)} /></label>
      </div>
      <label className="block text-sm font-medium">Incline (% grade)<input className={`${input} mt-1`} type="number" required min="0" max="20" step="any" value={incline} onChange={e => setIncline(e.target.value)} /><span className="block text-xs text-mfp-textSecondary mt-1">Use percent grade, not degrees. Flat walking is 0%.</span></label>
      <label className="flex items-start gap-3 rounded-lg border border-mfp-border p-3 cursor-pointer">
        <input type="checkbox" className="mt-1 h-5 w-5 accent-[#185ADB]" checked={armsSupported} onChange={e => setArmsSupported(e.target.checked)} />
        <span><span className="block text-sm font-medium">Arms supported</span><span className="block text-xs text-mfp-textSecondary mt-1">Multiply calories by 0.75 (25% reduction), including any manual override.</span></span>
      </label>
      <label className="block text-sm font-medium">Device / manual active calories (optional)<input className={`${input} mt-1`} type="number" min="0" max="20000" step="any" value={override} onChange={e => setOverride(e.target.value)} /><span className="block text-xs text-mfp-textSecondary mt-1">Overrides the estimate. Enter active calories, excluding resting energy.</span></label>
      <label className="block text-sm font-medium">Session notes<textarea className={`${input} mt-1`} rows={2} maxLength={500} value={notes} onChange={e => setNotes(e.target.value)} /></label>
      <ExercisePhotoField value={photo} onChange={setPhoto} initialUrl={initialPhoto} />
    </fieldset>
    <section aria-label="Calorie preview" className="bg-[#eef4ff] border border-[#cbdcf7] rounded-xl p-5 space-y-2">
      <p className="text-xs uppercase tracking-widest text-mfp-blue">Estimated activity energy</p>
      {estimating && <p role="status">Calculating…</p>}
      {previewError && <p role="alert" className="text-mfp-error">{previewError}</p>}
      {!payload && <p className="text-sm">Enter time, speed or pace, and incline to calculate.</p>}
      {preview && <>
        <p className="text-3xl font-bold tabular-nums">{display(preview.calories_burned)} <span className="text-base font-normal">active kcal{preview.calorie_override != null ? ' · manual' : ''}</span></p>
        {preview.arms_supported && <p className="text-sm font-medium">Arms supported · calories × 0.75</p>}
        <p className="text-sm tabular-nums">{display(preview.distance_miles)} mi · {display(preview.distance_km)} km</p>
        <p className="text-xs">Using {display(preview.weight_lbs)} lb · {preview.weight_source === 'profile' ? 'profile weight fallback' : `weigh-in ${preview.weight_date}`}</p>
        <details className="text-xs"><summary className="cursor-pointer underline">Calculation details & limitations</summary>
          <p className="mt-2">{preview.method} · Total session calories: {preview.gross_calories == null ? 'not estimated' : display(preview.gross_calories)}</p>
          {preview.warnings.map(warning => <p key={warning} className="mt-1">{warning}</p>)}
        </details>
      </>}
      <p className="text-xs text-mfp-textSecondary">Exercise is tracked separately. Your food calorie allowance won’t increase.</p>
    </section>
    <button className="w-full rounded-lg bg-mfp-blue text-white py-3 font-semibold disabled:opacity-50" type="submit" disabled={!payload || saving}>{saving ? 'Saving session…' : editId ? 'Save changes' : 'Log walking session'}</button>
  </form>
}

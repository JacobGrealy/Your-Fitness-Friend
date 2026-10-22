import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { ActivityId, ActivityEstimate, ActivitySessionCreate } from '@/types'
import { exerciseApi } from '@/api/exercise'
import { todayLocal } from '@/utils/localDate'
import ExercisePhotoField, { emptyExercisePhoto, type ExercisePhotoDraft } from '@/components/exercise/ExercisePhotoField'
import { activityOptions } from './activityOptions'
import { exerciseError, exerciseKey, writePreference } from './exercisePreferences'

const input = 'w-full border border-mfp-border rounded-lg px-3 py-3 bg-white text-sm mt-1'
const n = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 })
type MetricMode = 'distance_mi' | 'distance_km' | 'speed_mph' | 'speed_kmh' | 'pace_mile' | 'pace_km'
const metricLabels: Record<MetricMode, string> = { distance_mi: 'Distance (mi)', distance_km: 'Distance (km)', speed_mph: 'Speed (mph)', speed_kmh: 'Speed (km/h)', pace_mile: 'Pace (min/mile)', pace_km: 'Pace (min/km)' }

export default function ActivitySessionForm({ activityId, userId }: { activityId: ActivityId; userId: string }) {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const editId = params.get('edit') || undefined
  const repeatId = params.get('repeat') || undefined
  const treadmill = activityId === 'treadmill_running'
  const stationary = activityId === 'stationary_cycling'
  const mobility = activityId === 'stretching' || activityId === 'yoga'
  const optionalMetric = activityId === 'cycling' || stationary
  const [date, setDate] = useState(todayLocal())
  const [duration, setDuration] = useState('')
  const [metricMode, setMetricMode] = useState<MetricMode>(treadmill ? 'speed_mph' : 'distance_mi')
  const [metric, setMetric] = useState('')
  const [incline, setIncline] = useState('0')
  const [power, setPower] = useState('')
  const [effort, setEffort] = useState<'light' | 'moderate' | 'vigorous'>('moderate')
  const [style, setStyle] = useState<'general' | 'hatha' | 'vinyasa' | 'power'>('general')
  const [override, setOverride] = useState('')
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState<ExercisePhotoDraft>(emptyExercisePhoto)
  const [initialPhoto, setInitialPhoto] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!(editId || repeatId))
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<ActivityEstimate | null>(null)
  const [previewError, setPreviewError] = useState('')
  const [estimating, setEstimating] = useState(false)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    if (!editId && !repeatId) return
    let active = true
    setLoading(true); setLoadError('')
    exerciseApi.getExerciseLog((editId || repeatId)!).then(log => {
      if (!active) return
      if (log.activity_id !== activityId || !log.details || !('power_watts' in log.details)) throw new Error('Unsupported session')
      const details = log.details
      if (treadmill) { setMetricMode('speed_mph'); setMetric(details.speed_mph == null ? '' : String(details.speed_mph)); setIncline(String(details.incline_percent ?? 0)) }
      else { setMetricMode('distance_mi'); setMetric(details.distance_miles == null ? '' : String(details.distance_miles)) }
      setPower(details.power_watts == null ? '' : String(details.power_watts)); setEffort(details.effort)
      if (details.yoga_style) setStyle(details.yoga_style as typeof style)
      if (editId) {
        setDate(log.date || log.logged_at.slice(0, 10)); setDuration(String(log.duration))
        setNotes(log.notes || ''); setOverride(details.calorie_override == null ? '' : String(details.calorie_override)); setInitialPhoto(log.photo_endpoint || null)
      }
    }).catch(e => { if (active) setLoadError(exerciseError(e)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [activityId, editId, repeatId, treadmill, attempt])
  const payload = useMemo<ActivitySessionCreate | null>(() => {
    if (!date || !duration || !Number.isFinite(Number(duration)) || Number(duration) <= 0) return null
    const result: ActivitySessionCreate = { activity_id: activityId, date, duration_minutes: Number(duration), notes }
    if (!mobility) {
      if (metric === '' && !optionalMetric) return null
      if (metric !== '') {
        if (!Number.isFinite(Number(metric)) || Number(metric) <= 0) return null
        if (metricMode.startsWith('distance')) { result.distance = Number(metric); result.distance_unit = metricMode === 'distance_mi' ? 'mi' : 'km' }
        else if (metricMode.startsWith('speed')) { result.speed = Number(metric); result.speed_unit = metricMode === 'speed_mph' ? 'mph' : 'km/h' }
        else { result.pace = Number(metric); result.pace_unit = metricMode === 'pace_mile' ? 'min/mile' : 'min/km' }
      }
    }
    if (treadmill) {
      if (incline === '' || !Number.isFinite(Number(incline))) return null
      result.incline_percent = Number(incline)
    }
    if (stationary) {
      result.effort = effort
      if (power !== '') { if (!Number.isFinite(Number(power)) || Number(power) <= 0) return null; result.power_watts = Number(power) }
    }
    if (activityId === 'yoga') result.yoga_style = style
    if (override !== '') { if (!Number.isFinite(Number(override)) || Number(override) < 0) return null; result.calorie_override = Number(override) }
    return result
  }, [activityId, date, duration, metric, metricMode, incline, power, effort, style, notes, override, mobility, optionalMetric, stationary, treadmill])
  useEffect(() => {
    let active = true
    setPreview(null); setPreviewError(''); setEstimating(false)
    if (!payload || loading || loadError) return
    setEstimating(true)
    const timer = setTimeout(() => {
      exerciseApi.estimateActivity(payload, editId).then(value => { if (active) setPreview(value) })
        .catch(e => { if (active) setPreviewError(exerciseError(e)) }).finally(() => { if (active) setEstimating(false) })
    }, 300)
    return () => { active = false; clearTimeout(timer) }
  }, [payload, loading, loadError, editId])
  if (loading) return <p className="p-4" role="status">Loading session…</p>
  if (loadError) return <div className="p-4"><p role="alert">{loadError}</p><button className="text-mfp-blue underline" onClick={() => setAttempt(x => x + 1)}>Retry session</button></div>
  const modes: MetricMode[] = stationary ? ['distance_mi', 'distance_km'] : treadmill ? ['speed_mph', 'speed_kmh', 'pace_mile', 'pace_km'] : ['distance_mi', 'distance_km', 'pace_mile', 'pace_km', 'speed_mph', 'speed_kmh']
  return <form className="p-4 space-y-5" onSubmit={async event => {
    event.preventDefault(); if (!payload || saving) return
    setSaving(true); setError('')
    try {
      const result = await exerciseApi.saveSession(payload, editId, photo.file || undefined, photo.remove)
      if (!alive.current) return
      writePreference(exerciseKey(userId, 'recent'), activityId)
      navigate(`/food/daily?date=${result.date || date}`)
    } catch (e) { if (alive.current) setError(exerciseError(e)) }
    finally { if (alive.current) setSaving(false) }
  }}>
    <Link to="/exercise/log" className="text-mfp-blue text-sm">← All activities</Link>
    <header className="border-l-4 border-mfp-blue pl-4"><p className="text-xs uppercase tracking-widest text-mfp-textSecondary">{editId ? 'Edit session' : repeatId ? 'Repeat activity · new session' : mobility ? 'Mobility' : 'Cardio'}</p><h1 className="text-2xl font-bold mt-1">{activityOptions[activityId].name}</h1><p className="text-sm text-mfp-textSecondary mt-1">{activityOptions[activityId].description}</p></header>
    {editId && <Link className="text-mfp-blue underline text-sm" to={`/exercise/log?activity=${activityId}&repeat=${editId}`}>Repeat this activity as a new session</Link>}
    {error && <p role="alert" className="text-mfp-error">{error}</p>}
    <fieldset disabled={saving} className="space-y-4">
      <div className="grid grid-cols-2 gap-3"><label className="text-sm min-w-0">Session date<input className={input} type="date" required value={date} onChange={e => setDate(e.target.value)} /></label><label className="text-sm">Time (minutes)<input className={input} type="number" required min="0.1" max="1440" step="any" value={duration} onChange={e => setDuration(e.target.value)} /></label></div>
      {!mobility && <div className="space-y-2"><label className="block text-sm">Distance / pace units<select className={input} value={metricMode} onChange={e => { setMetricMode(e.target.value as MetricMode); setMetric('') }}>{modes.map(mode => <option key={mode} value={mode}>{metricLabels[mode]}</option>)}</select></label><label className="block text-sm">{metricLabels[metricMode]}{optionalMetric ? ' (optional)' : ''}<input className={input} type="number" required={!optionalMetric} min="0.001" step="any" value={metric} onChange={e => setMetric(e.target.value)} /></label><p className="text-xs text-mfp-textSecondary">Changing units clears the value so it cannot be mistaken for another measurement.</p></div>}
      {treadmill && <label className="block text-sm">Incline (% grade)<input className={input} required type="number" min="0" max="20" step="any" value={incline} onChange={e => setIncline(e.target.value)} /></label>}
      {stationary && <><label className="block text-sm">Measured power (watts, optional)<input className={input} type="number" min="25" max="500" step="any" value={power} onChange={e => setPower(e.target.value)} /><span className="block text-xs text-mfp-textSecondary mt-1">Use real measured watts—not the bike’s resistance level. Power takes precedence over effort.</span></label><label className="block text-sm">Effort without measured power<select className={input} value={effort} onChange={e => setEffort(e.target.value as typeof effort)} disabled={power !== ''}><option value="light">Light</option><option value="moderate">Moderate</option><option value="vigorous">Vigorous</option></select></label></>}
      {activityId === 'yoga' && <label className="block text-sm">Yoga style<select className={input} value={style} onChange={e => setStyle(e.target.value as typeof style)}><option value="general">General</option><option value="hatha">Hatha</option><option value="vinyasa">Vinyasa</option><option value="power">Power</option></select></label>}
      <label className="block text-sm">Device / manual active calories (optional)<input className={input} type="number" min="0" max="20000" step="any" value={override} onChange={e => setOverride(e.target.value)} /></label>
      <label className="block text-sm">Session notes<textarea className={input} rows={2} maxLength={500} value={notes} onChange={e => setNotes(e.target.value)} /></label>
      <ExercisePhotoField value={photo} onChange={setPhoto} initialUrl={initialPhoto} />
    </fieldset>
    <section className="bg-[#eef4ff] border border-[#cbdcf7] rounded-xl p-4 space-y-2" aria-label="Activity calorie preview"><p className="text-xs uppercase tracking-widest text-mfp-blue">Estimated activity energy</p>
      {estimating && <p role="status">Calculating…</p>}{previewError && <p role="alert" className="text-mfp-error">{previewError}</p>}
      {!payload && <p className="text-sm">Enter session time and required activity details to calculate.</p>}
      {preview && <><p className="text-2xl font-bold tabular-nums">{n(preview.calories_burned)} <span className="text-sm font-normal">active kcal{preview.calorie_override != null ? ' · manual' : ''}</span></p>{preview.distance_miles != null && <p className="text-sm">{n(preview.distance_miles)} mi · {n(preview.distance_km!)} km</p>}<p className="text-xs">Using {n(preview.weight_lbs)} lb · {preview.weight_source === 'profile' ? 'profile weight fallback' : preview.weight_date}</p><details className="text-xs"><summary>Calculation details & limitations</summary><p className="mt-2">{preview.method} · Total session {n(preview.gross_calories)} kcal</p>{preview.warnings.map(w => <p key={w} className="mt-1">{w}</p>)}</details></>}
      <p className="text-xs text-mfp-textSecondary">Exercise calories do not increase your food allowance.</p>
    </section>
    <button type="submit" disabled={!payload || saving} className="w-full bg-mfp-blue text-white rounded-lg py-3 font-semibold disabled:opacity-50">{saving ? 'Saving session…' : editId ? 'Save activity changes' : 'Log activity'}</button>
  </form>
}

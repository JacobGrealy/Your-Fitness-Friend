import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { exerciseApi } from '@/api/exercise'
import type { ExerciseLog, StrengthEquipment, StrengthExercise, StrengthLibraryItem, StrengthSessionCreate, StrengthEstimate } from '@/types'
import { todayLocal } from '@/utils/localDate'
import ExercisePhotoField, { emptyExercisePhoto, type ExercisePhotoDraft } from '@/components/exercise/ExercisePhotoField'
import { exerciseError } from './exercisePreferences'

interface DraftExercise { exercise_id: string | null; name: string; equipment: StrengthEquipment; sets: { reps: string; weight: string }[] }
const input = 'w-full border border-mfp-border rounded-lg bg-white px-3 py-2 mt-1 text-sm'
const n = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 })
const drafts = (exercises: StrengthExercise[], library: StrengthLibraryItem[]): DraftExercise[] => exercises.map(ex => ({
  exercise_id: library.some(item => item.id === ex.exercise_id) ? ex.exercise_id : null,
  name: ex.name, equipment: ex.equipment,
  sets: ex.sets.map(set => ({ reps: String(set.reps), weight: set.weight_lbs == null ? '' : String(set.weight_lbs) })),
}))
export default function StrengthSessionForm() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const editId = params.get('edit') || undefined
  const repeatId = params.get('repeat') || undefined
  const [library, setLibrary] = useState<StrengthLibraryItem[]>([])
  const [previous, setPrevious] = useState<ExerciseLog | null>(null)
  const [selection, setSelection] = useState('')
  const [exercises, setExercises] = useState<DraftExercise[]>([])
  const [date, setDate] = useState(todayLocal())
  const [duration, setDuration] = useState('')
  const [effort, setEffort] = useState<'moderate' | 'vigorous'>('moderate')
  const [override, setOverride] = useState('')
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState<ExercisePhotoDraft>(emptyExercisePhoto)
  const [initialPhoto, setInitialPhoto] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<StrengthEstimate | null>(null)
  const [previewError, setPreviewError] = useState('')
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    let active = true
    setLoading(true); setLoadError('')
    Promise.all([
      exerciseApi.getStrengthLibrary(),
      editId || repeatId ? exerciseApi.getExerciseLog((editId || repeatId)!) : exerciseApi.getLatest('strength_training').catch(() => null),
    ]).then(([items, log]) => {
      if (!active) return
      setLibrary(items); setSelection(items[0]?.id || 'custom')
      if (editId || repeatId) {
        if (!log?.details || !('exercises' in log.details)) throw new Error('Not a strength workout')
        setExercises(drafts(log.details.exercises, items)); setEffort(log.details.effort)
        if (editId) {
          setDate(log.date || log.logged_at.slice(0, 10)); setDuration(log.duration == null ? '' : String(log.duration))
          setNotes(log.notes || ''); setOverride(log.details.calorie_override == null ? '' : String(log.details.calorie_override)); setInitialPhoto(log.photo_endpoint || null)
        }
      } else setPrevious(log)
    }).catch(e => { if (active) setLoadError(exerciseError(e)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [editId, repeatId, attempt])

  const payload = useMemo<StrengthSessionCreate | null>(() => {
    if (!date || !exercises.length) return null
    const normalized: StrengthExercise[] = []
    for (const exercise of exercises) {
      if (!exercise.name.trim() || !exercise.sets.length) return null
      const sets = []
      for (const set of exercise.sets) {
        const reps = Number(set.reps); const weight = Number(set.weight)
        if (!set.reps || !Number.isInteger(reps) || reps <= 0) return null
        if (exercise.equipment !== 'bodyweight' && (set.weight === '' || !Number.isFinite(weight) || weight < 0)) return null
        sets.push({ reps, weight_lbs: exercise.equipment === 'bodyweight' ? null : weight })
      }
      normalized.push({ exercise_id: exercise.exercise_id, name: exercise.name.trim(), equipment: exercise.equipment, sets })
    }
    if (duration !== '' && (!Number.isFinite(Number(duration)) || Number(duration) <= 0)) return null
    if (override !== '' && (!Number.isFinite(Number(override)) || Number(override) < 0)) return null
    return { activity_id: 'strength_training', date, exercises: normalized, effort, notes,
      duration_minutes: duration === '' ? null : Number(duration),
      ...(override !== '' ? { calorie_override: Number(override) } : {}),
    }
  }, [exercises, date, duration, effort, notes, override])
  useEffect(() => {
    let active = true
    setPreview(null); setPreviewError('')
    if (!payload || loading) return
    const timer = setTimeout(() => {
      exerciseApi.estimateStrength(payload, editId).then(value => { if (active) setPreview(value) }).catch(e => { if (active) setPreviewError(exerciseError(e)) })
    }, 300)
    return () => { active = false; clearTimeout(timer) }
  }, [payload, loading, editId])
  const update = (index: number, action: (item: DraftExercise) => DraftExercise) => setExercises(items => items.map((item, i) => i === index ? action(item) : item))
  const move = (index: number, direction: number) => setExercises(items => { const next = [...items]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return next })
  if (loading) return <p className="p-4" role="status">Loading strength exercises…</p>
  if (loadError) return <div className="p-4"><p role="alert">{loadError}</p><button className="text-mfp-blue underline" onClick={() => setAttempt(x => x + 1)}>Retry strength exercises</button></div>
  return <form className="p-4 space-y-5" onSubmit={async event => {
    event.preventDefault(); if (!payload || saving) return
    setSaving(true); setError('')
    try {
      const log = await exerciseApi.saveSession(payload, editId, photo.file || undefined, photo.remove)
      if (alive.current) navigate(`/food/daily?date=${log.date || date}`)
    } catch (e) { if (alive.current) setError(exerciseError(e)) }
    finally { if (alive.current) setSaving(false) }
  }}>
    <Link className="text-mfp-blue text-sm" to="/exercise/log">← All activities</Link>
    <header className="border-l-4 border-mfp-blue pl-4"><p className="text-xs uppercase tracking-widest text-mfp-textSecondary">{editId ? 'Edit workout' : repeatId ? 'Repeat workout · new session' : 'Strength · Session log'}</p><h1 className="text-2xl font-bold mt-1">Strength Workout</h1><p className="text-sm text-mfp-textSecondary mt-1">One workout. Every exercise, every set.</p></header>
    {editId && <Link className="inline-block text-sm text-mfp-blue underline" to={`/exercise/log?activity=strength_training&repeat=${editId}`}>Repeat this workout as a new session</Link>}
    {error && <p role="alert" className="text-mfp-error">{error}</p>}
    <fieldset disabled={saving} className="space-y-4">
      <label className="block text-sm font-medium">Workout date<input type="date" required className={input} value={date} onChange={e => setDate(e.target.value)} /></label>
      {!editId && !repeatId && previous?.details && 'exercises' in previous.details && <button type="button" className="text-mfp-blue underline text-sm" onClick={() => {
        if (previous.details && 'exercises' in previous.details) { setExercises(drafts(previous.details.exercises, library)); setEffort(previous.details.effort) }
      }}>Use previous workout’s exercises & sets</button>}
      <p className="text-xs text-mfp-textSecondary">All loads in pounds. Dumbbells: per hand. Barbells: total including the bar. Bodyweight: reps only.</p>
      {exercises.map((exercise, index) => <section key={index} className="bg-white border border-mfp-border rounded-xl p-4 space-y-3" aria-label={`Exercise ${index + 1}`}>
        <div className="flex items-start justify-between gap-3"><h2 className="font-semibold">{index + 1}. {exercise.name || 'Custom exercise'}</h2><button type="button" className="text-mfp-error text-xs underline" onClick={() => setExercises(items => items.filter((_, i) => i !== index))}>Remove exercise {index + 1}</button></div>
        {!exercise.exercise_id && <div className="grid grid-cols-2 gap-3"><label className="text-sm">Exercise name<input required maxLength={100} className={input} value={exercise.name} onChange={e => update(index, item => ({ ...item, name: e.target.value }))} /></label><label className="text-sm">Equipment<select className={input} value={exercise.equipment} onChange={e => update(index, item => ({ ...item, equipment: e.target.value as StrengthEquipment }))}>{['other', 'barbell', 'dumbbell', 'machine', 'bodyweight'].map(value => <option key={value} value={value}>{value}</option>)}</select></label></div>}
        <p className="text-xs text-mfp-textSecondary">{exercise.equipment === 'dumbbell' ? 'Load per hand' : exercise.equipment === 'barbell' ? 'Load includes bar' : exercise.equipment === 'bodyweight' ? 'Bodyweight · no external load' : 'External load'}</p>
        {exercise.sets.map((set, setIndex) => <div key={setIndex} className="flex items-end gap-2">
          <span className="text-xs text-mfp-textSecondary pb-3">{setIndex + 1}</span>
          <label className="text-xs flex-1 min-w-0">Reps<input aria-label={`Reps for exercise ${index + 1} set ${setIndex + 1}`} className={input} type="number" min="1" max="10000" step="1" required value={set.reps} onChange={e => update(index, item => ({ ...item, sets: item.sets.map((row, i) => i === setIndex ? { ...row, reps: e.target.value } : row) }))} /></label>
          {exercise.equipment !== 'bodyweight' && <label className="text-xs flex-1 min-w-0">{exercise.equipment === 'dumbbell' ? 'lb / hand' : 'Load (lb)'}<input aria-label={`Load for exercise ${index + 1} set ${setIndex + 1}`} className={input} type="number" min="0" max="5000" step="any" required value={set.weight} onChange={e => update(index, item => ({ ...item, sets: item.sets.map((row, i) => i === setIndex ? { ...row, weight: e.target.value } : row) }))} /></label>}
          <button type="button" aria-label={`Remove exercise ${index + 1} set ${setIndex + 1}`} className="p-2 mb-1 text-mfp-error" disabled={exercise.sets.length === 1} onClick={() => update(index, item => ({ ...item, sets: item.sets.filter((_, i) => i !== setIndex) }))}>×</button>
        </div>)}
        <div className="flex flex-wrap gap-4 text-sm"><button type="button" className="text-mfp-blue underline" onClick={() => update(index, item => ({ ...item, sets: [...item.sets, { ...(item.sets[item.sets.length - 1] || { reps: '', weight: '' }) }] }))}>Add set to exercise {index + 1}</button>{index > 0 && <button type="button" onClick={() => move(index, -1)} className="text-mfp-blue underline">Move exercise {index + 1} up</button>}{index < exercises.length - 1 && <button type="button" onClick={() => move(index, 1)} className="text-mfp-blue underline">Move exercise {index + 1} down</button>}</div>
      </section>)}
      <div className="border border-dashed border-mfp-blue rounded-xl p-4 space-y-3"><label className="block text-sm font-medium">Add an exercise<select className={input} value={selection} onChange={e => setSelection(e.target.value)}>{library.map(item => <option key={item.id} value={item.id}>{item.name} · {item.equipment}</option>)}<option value="custom">Custom exercise…</option></select></label><button type="button" className="text-mfp-blue font-medium" onClick={() => {
        const selected = library.find(item => item.id === selection)
        setExercises(items => [...items, { exercise_id: selected?.id || null, name: selected?.name || '', equipment: selected?.equipment || 'other', sets: [{ reps: '', weight: '' }] }])
      }}>+ Add exercise</button></div>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm">Session time (minutes, optional)<input className={input} type="number" min="0.1" max="1440" step="any" value={duration} onChange={e => setDuration(e.target.value)} /></label><label className="text-sm">Session effort<select className={input} value={effort} onChange={e => setEffort(e.target.value as typeof effort)}><option value="moderate">Moderate</option><option value="vigorous">Vigorous</option></select></label></div>
      <label className="block text-sm">Device / manual active calories (optional)<input className={input} type="number" min="0" max="20000" step="any" value={override} onChange={e => setOverride(e.target.value)} /></label>
      <label className="block text-sm">Workout notes<textarea className={input} rows={2} maxLength={500} value={notes} onChange={e => setNotes(e.target.value)} /></label>
      <ExercisePhotoField value={photo} onChange={setPhoto} initialUrl={initialPhoto} />
    </fieldset>
    <section className="bg-[#eef4ff] border border-[#cbdcf7] rounded-xl p-4 space-y-2" aria-label="Strength calorie preview"><p className="text-xs uppercase tracking-widest text-mfp-blue">Session energy</p>
      {previewError && <p role="alert" className="text-mfp-error">{previewError}</p>}
      {!payload && <p className="text-sm">Add exercises and complete their sets to save a workout.</p>}
      {preview && <><p className="font-bold text-xl">{preview.calories_burned == null ? 'Calories not estimated' : `${n(preview.calories_burned)} active kcal${preview.calorie_override != null ? ' · manual' : ''}`}</p>{preview.weight_lbs != null && <p className="text-xs">Using {n(preview.weight_lbs)} lb · {preview.weight_source === 'profile' ? 'profile weight fallback' : preview.weight_date}</p>}{preview.warnings.map(w => <p key={w} className="text-xs text-mfp-textSecondary">{w}</p>)}</>}
      <p className="text-xs text-mfp-textSecondary">Exercise calories do not increase your food allowance.</p>
    </section>
    <button type="submit" disabled={!payload || saving} className="w-full rounded-lg bg-mfp-blue text-white py-3 font-semibold disabled:opacity-50">{saving ? 'Saving workout…' : editId ? 'Save workout changes' : 'Log strength workout'}</button>
  </form>
}

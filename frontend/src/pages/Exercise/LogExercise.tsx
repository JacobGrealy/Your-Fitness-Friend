import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { exerciseApi } from '@/api/exercise'
import { useAuthStore } from '@/store/authStore'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import type { ExerciseActivity } from '@/types'
import LegacyLogExercise from './LegacyLogExercise'
import TreadmillSessionForm from './TreadmillSessionForm'
import StrengthSessionForm from './StrengthSessionForm'
import ActivitySessionForm from './ActivitySessionForm'
import { activityOptions, isActivityId } from './activityOptions'
import { exerciseError, exerciseKey, readPreference, writePreference } from './exercisePreferences'

export default function LogExercise() {
  const { setTitle } = usePageTitle()
  const userId = useAuthStore(s => String(s.user?.id ?? ''))
  const [params] = useSearchParams()
  useEffect(() => { setTitle('Log Exercise') }, [setTitle])
  if (params.get('mode') === 'custom') return <LegacyLogExercise />
  return <ExercisePicker key={userId} userId={userId} />
}

function ExercisePicker({ userId }: { userId: string }) {
  const [params, setParams] = useSearchParams()
  const [catalog, setCatalog] = useState<ExerciseActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [favorites, setFavorites] = useState<string[]>(() => {
    const stored = readPreference<unknown>(exerciseKey(userId, 'favorites'), [])
    return Array.isArray(stored) ? stored.filter(x => typeof x === 'string') : []
  })
  const recent = readPreference<string>(exerciseKey(userId, 'recent'), '')
  useEffect(() => {
    let alive = true
    setLoading(true); setError('')
    exerciseApi.getCatalog().then(items => { if (alive) setCatalog(items) })
      .catch(e => { if (alive) setError(exerciseError(e)) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [attempt])
  const activity = params.get('activity')
  if (activity === 'treadmill_walking') return <TreadmillSessionForm key={`${userId}:${params.get('edit')}:${params.get('repeat')}`} userId={userId} />
  if (activity === 'strength_training') return <StrengthSessionForm key={`${userId}:${params.get('edit')}:${params.get('repeat')}`} />
  if (isActivityId(activity)) return <ActivitySessionForm key={`${userId}:${activity}:${params.get('edit')}:${params.get('repeat')}`} activityId={activity} userId={userId} />
  const ordered = [...catalog].sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)) || Number(b.id === recent) - Number(a.id === recent))
  return <div className="p-4 space-y-5">
    <div className="border-l-4 border-mfp-blue pl-4 py-2">
      <p className="text-xs uppercase tracking-widest text-mfp-textSecondary">Your exercise diary</p>
      <h1 className="text-2xl font-bold text-mfp-text">What moved you today?</h1>
      <p className="text-sm text-mfp-textSecondary mt-1">Choose an activity. We’ll ask only for what matters.</p>
    </div>
    {loading && <p role="status">Loading activities…</p>}
    {error && <div role="alert" className="border border-mfp-error/30 rounded-lg p-4 space-y-2"><p>{error}</p><button className="text-mfp-blue underline" onClick={() => setAttempt(x => x + 1)}>Retry activities</button></div>}
    {!loading && !error && !catalog.length && <p>No built-in activities available.</p>}
    <div className="space-y-3">{ordered.map(item => <div key={item.id} className="flex items-center border border-mfp-border rounded-xl bg-white overflow-hidden">
      <button className="text-left flex-1 p-5" onClick={() => setParams({ activity: item.id })}>
        <span className="text-xs tracking-widest uppercase text-mfp-blue">{item.category}{item.id === recent ? ' · Recent' : ''}</span>
        <span className="block text-lg font-bold mt-1">{item.name}</span>
        <span className="block text-sm text-mfp-textSecondary mt-1">{item.tracking_format === 'strength' ? 'Exercises · Sets · Reps · Load' : isActivityId(item.id) ? activityOptions[item.id].description : 'Time · Speed or pace · Incline'}</span>
      </button>
      <button type="button" aria-label={`Favorite ${item.name}`} aria-pressed={favorites.includes(item.id)} className="p-4 text-2xl text-mfp-blue" onClick={() => {
        const next = favorites.includes(item.id) ? favorites.filter(x => x !== item.id) : [...favorites, item.id]
        setFavorites(next); writePreference(exerciseKey(userId, 'favorites'), next)
      }}>{favorites.includes(item.id) ? '★' : '☆'}</button>
    </div>)}</div>
    <div className="pt-3 border-t border-mfp-border text-sm space-y-2">
      <Link className="block text-mfp-blue underline" to="/exercise/log?mode=custom">Log from my custom exercise library</Link>
      <Link className="block text-mfp-blue underline" to="/exercise/library">Manage custom exercises</Link>
    </div>
  </div>
}

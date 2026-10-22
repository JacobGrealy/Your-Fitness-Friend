import type { ExerciseLog } from '@/types'
const n = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 })
export function exerciseSummary(log: ExerciseLog): string {
  const details = log.details
  const parts: string[] = []
  if (log.duration != null) parts.push(`${n(log.duration)} min`)
  if (details && 'exercises' in details) {
    for (const exercise of details.exercises) {
      const load = exercise.equipment === 'dumbbell' ? ' lb/hand' : ' lb'
      parts.push(`${exercise.name}: ${exercise.sets.map(set => set.weight_lbs == null ? `${set.reps} reps` : `${set.reps} × ${n(set.weight_lbs)}${load}`).join(', ')}`)
    }
  } else if (details && 'speed_mph' in details) {
    parts.push(`${n(details.speed_mph)} mph`, `${n(details.incline_percent)}% incline`, `${n(details.distance_miles)} mi`)
  }
  return parts.join(' · ')
}

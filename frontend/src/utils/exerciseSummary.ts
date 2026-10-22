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
    if (details.speed_mph != null) parts.push(`${n(details.speed_mph)} mph`)
    if (details.incline_percent != null) parts.push(`${n(details.incline_percent)}% incline`)
    if (details.distance_miles != null) parts.push(`${n(details.distance_miles)} mi`)
    if ('power_watts' in details && details.power_watts != null) parts.push(`${n(details.power_watts)} W`)
    if ('yoga_style' in details && details.yoga_style) parts.push(`${details.yoga_style} yoga`)
  }
  return parts.join(' · ')
}

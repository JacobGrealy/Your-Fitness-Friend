import { format } from 'date-fns'

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM dd, yyyy')
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM dd, yyyy HH:mm')
}

export function formatWeight(weight: number): string {
  return `${weight.toFixed(1)} lbs`
}

export function formatCalories(calories: number): string {
  return calories.toLocaleString()
}

export function formatMacros(protein: number, carbs: number, fat: number): string {
  return `P: ${protein}g C: ${carbs}g F: ${fat}g`
}

export function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }
  return `${minutes}m`
}

export function getMacroPercentage(calories: number, totalCalories: number): number {
  if (totalCalories === 0) return 0
  return Math.round((calories / totalCalories) * 100)
}

export function calculateCaloriesRemaining(consumed: number, goal: number): number {
  return goal - consumed
}

/**
 * How much of a food a diary row represents (FF-0029): "2 × 170 g", "1 serving",
 * or nothing at all when the log never recorded a serving. Returns null rather
 * than a default, so callers can omit the line entirely.
 */
export function formatServing(
  servings: number | null | undefined,
  servingSize: string | null | undefined
): string | null {
  const size = (servingSize ?? '').trim()
  const count = servings ?? null

  if (!size && (count === null || count === 0)) return null
  if (!size) return count === null ? null : `${formatCount(count)} serving${count === 1 ? '' : 's'}`
  if (count === null || count <= 0) return size
  return `${formatCount(count)} × ${size}`
}

function formatCount(value: number): string {
  // 1 and 2 read better than 1.0 and 2.0; 1.5 keeps its decimal.
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

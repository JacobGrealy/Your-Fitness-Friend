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

/**
 * Per-serving maths for the client (FF-0086).
 *
 * The server owns the stored totals; this only exists so the number on screen can move the
 * instant the serving count changes, without a round trip. Rounding happens for display
 * only, to at most two decimals.
 */

export interface PerServing {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export const QUICK_SERVINGS = [0.25, 0.5, 1, 1.5, 2] as const

/** Totals for a serving count, from the per-serving base. */
export function scalePerServing(perServing: PerServing, servings: number): PerServing {
  const count = Number.isFinite(servings) && servings > 0 ? servings : 1
  return {
    calories: (perServing.calories || 0) * count,
    protein_g: (perServing.protein_g || 0) * count,
    carbs_g: (perServing.carbs_g || 0) * count,
    fat_g: (perServing.fat_g || 0) * count,
  }
}

/** The per-serving base of a stored log, falling back to totals it is missing any. */
export function perServingOf(log: {
  calories?: number | null
  protein_g?: number | null
  carbs_g?: number | null
  fat_g?: number | null
  number_of_servings?: number | null
  calories_per_serving?: number | null
  protein_per_serving?: number | null
  carbs_per_serving?: number | null
  fat_per_serving?: number | null
}): PerServing {
  const servings =
    typeof log.number_of_servings === 'number' && log.number_of_servings > 0
      ? log.number_of_servings
      : 1

  const pick = (perServing: number | null | undefined, total: number | null | undefined) => {
    if (typeof perServing === 'number') return perServing
    return (total ?? 0) / servings
  }

  return {
    calories: pick(log.calories_per_serving, log.calories),
    protein_g: pick(log.protein_per_serving, log.protein_g),
    carbs_g: pick(log.carbs_per_serving, log.carbs_g),
    fat_g: pick(log.fat_per_serving, log.fat_g),
  }
}

/** Display helper: at most two decimals, no trailing zeros. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return String(Math.round(value * 100) / 100)
}

export function formatPerServing(perServing: PerServing): string {
  return `${formatNumber(perServing.calories)} kcal per serving · P ${formatNumber(
    perServing.protein_g
  )} C ${formatNumber(perServing.carbs_g)} F ${formatNumber(perServing.fat_g)}`
}

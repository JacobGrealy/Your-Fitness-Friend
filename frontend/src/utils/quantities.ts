// Mirrors app/utils/quantities.py; tested with the same US volume and mass constants.
export const UNITS: Record<string, { family: string; factor: number; label: string }> = {
  g: { family: 'mass', factor: 1, label: 'g' },
  kg: { family: 'mass', factor: 1000, label: 'kg' },
  oz: { family: 'mass', factor: 28.349523125, label: 'oz' },
  lb: { family: 'mass', factor: 453.59237, label: 'lb' },
  ml: { family: 'volume', factor: 1, label: 'ml' },
  cup: { family: 'volume', factor: 236.5882365, label: 'cup (US)' },
  tbsp: { family: 'volume', factor: 14.78676478125, label: 'tbsp (US)' },
  tsp: { family: 'volume', factor: 4.92892159375, label: 'tsp (US)' },
  serving: { family: 'serving', factor: 1, label: 'serving' },
  item: { family: 'item', factor: 1, label: 'item' },
}
export interface Reference { serving_amount?: number | null; serving_unit?: string | null }
export function compatibleUnits(unit?: string | null): string[] {
  return Object.keys(UNITS).filter(key => key === 'serving' ||
    (unit && UNITS[key].family === UNITS[unit]?.family))
}
export function servingCount(amount: number, unit: string, ref: Reference): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0
  if (unit === 'serving') return amount
  if (!ref.serving_amount || !ref.serving_unit || !UNITS[unit] ||
      UNITS[unit].family !== UNITS[ref.serving_unit]?.family) return 0
  return amount * UNITS[unit].factor / (ref.serving_amount * UNITS[ref.serving_unit].factor)
}

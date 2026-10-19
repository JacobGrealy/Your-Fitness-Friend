/**
 * BMI bands, in one place (FF-0085).
 *
 * The app stores height in centimetres and weight in pounds, so both conversions live here
 * and nowhere else — two implementations of one conversion is exactly the drift FF-0084 had
 * to unpick. The imperial shortcut (703·lb/in²) gives identical numbers, so the choice here
 * is simply the one with fewer constants.
 */

export type BmiBand = 'underweight' | 'healthy' | 'overweight' | 'obese'

/** WHO/CDC cut-points. */
export const BMI_THRESHOLDS = {
  underweight: 18.5,
  healthy: 25,
  overweight: 30,
} as const

const LB_PER_KG = 2.2046226218
const CM_PER_INCH = 2.54

/** BMI for a weight in pounds and a height in centimetres, or null without a height. */
export function bmi(weightLbs: number, heightCm: number | null | undefined): number | null {
  if (!heightCm || heightCm <= 0 || !Number.isFinite(weightLbs)) return null
  const kg = weightLbs / LB_PER_KG
  const metres = heightCm / 100
  return kg / (metres * metres)
}

/** The weight in pounds at a given BMI, for drawing a threshold on a pounds axis. */
export function weightAtBmi(
  targetBmi: number,
  heightCm: number | null | undefined
): number | null {
  if (!heightCm || heightCm <= 0) return null
  const metres = heightCm / 100
  return targetBmi * metres * metres * LB_PER_KG
}

export function bmiBand(value: number | null): BmiBand | null {
  if (value === null || !Number.isFinite(value)) return null
  if (value < BMI_THRESHOLDS.underweight) return 'underweight'
  if (value < BMI_THRESHOLDS.healthy) return 'healthy'
  if (value < BMI_THRESHOLDS.overweight) return 'overweight'
  return 'obese'
}

export const BMI_BAND_LABELS: Record<BmiBand, string> = {
  underweight: 'Underweight',
  healthy: 'Healthy',
  overweight: 'Overweight',
  obese: 'Obese',
}

export interface BmiLines {
  /** Null when the height is unknown, which is when the whole feature stays hidden. */
  healthyLow: number | null
  healthyHigh: number | null
  obeseLow: number | null
}

/** The three pound values the chart draws, from the user's height. */
export function bmiThresholds(weightHeightCm: number | null | undefined): BmiLines {
  return {
    healthyLow: weightAtBmi(BMI_THRESHOLDS.underweight, weightHeightCm),
    healthyHigh: weightAtBmi(BMI_THRESHOLDS.healthy, weightHeightCm),
    obeseLow: weightAtBmi(BMI_THRESHOLDS.overweight, weightHeightCm),
  }
}

/** Formatting for the axis labels and the readout. */
export function formatLbs(value: number): string {
  return `${Math.round(value * 10) / 10} lb`
}

/** Height helpers, hoisted so nothing re-implements a lossy feet/inches round trip. */
export function cmToInches(heightCm: number): number {
  return heightCm / CM_PER_INCH
}

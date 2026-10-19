import type { BmiToggleState } from '@/components/charts/BmiToggles'
import { BMI_TOGGLES_OFF } from '@/components/charts/BmiToggles'

/**
 * Persisted BMI switch state (FF-0085).
 *
 * Same shape as the reminders' localStorage handling: never throw, degrade to the default
 * when storage is refused (a restricted WebView can refuse it entirely). All off is the
 * default — the chart already carries a goal line, so adding bands is opt-in.
 */
const STORAGE_KEY = 'awefit.bmiToggles'

export function loadBmiToggles(): BmiToggleState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return BMI_TOGGLES_OFF
    const parsed = JSON.parse(raw) as Partial<BmiToggleState>
    return {
      healthy: Boolean(parsed.healthy),
      overweight: Boolean(parsed.overweight),
      obese: Boolean(parsed.obese),
    }
  } catch {
    return BMI_TOGGLES_OFF
  }
}

export function saveBmiToggles(state: BmiToggleState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage refused: the switches simply do not persist.
  }
}

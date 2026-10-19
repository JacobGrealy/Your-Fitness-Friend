import type { ChartToggleState } from '@/components/charts/BmiToggles'
import { CHART_TOGGLES_DEFAULT } from '@/components/charts/BmiToggles'

/**
 * Persisted BMI switch state (FF-0085).
 *
 * Same shape as the reminders' localStorage handling: never throw, degrade to the default
 * when storage is refused (a restricted WebView can refuse it entirely). All off is the
 * default — the chart already carries a goal line, so adding bands is opt-in.
 */
const STORAGE_KEY = 'awefit.chartToggles'

export function loadChartToggles(): ChartToggleState {
  try {
    // Reads the pre-FF-0088 key too, so an existing choice is not silently lost.
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('awefit.bmiToggles')
    if (!raw) return CHART_TOGGLES_DEFAULT
    const parsed = JSON.parse(raw) as Partial<ChartToggleState>
    return {
      healthy: Boolean(parsed.healthy),
      overweight: Boolean(parsed.overweight),
      obese: Boolean(parsed.obese),
      // Absent means "never chose", and the goal line is on by default (FF-0088).
      goal: parsed.goal === undefined ? CHART_TOGGLES_DEFAULT.goal : Boolean(parsed.goal),
    }
  } catch {
    return CHART_TOGGLES_DEFAULT
  }
}

export function saveChartToggles(state: ChartToggleState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage refused: the switches simply do not persist.
  }
}

import type { BmiLines } from '@/utils/bmi'

export interface BmiToggleState {
  healthy: boolean
  overweight: boolean
  obese: boolean
}

export const BMI_TOGGLES_OFF: BmiToggleState = { healthy: false, overweight: false, obese: false }

interface Props {
  value: BmiToggleState
  onChange: (next: BmiToggleState) => void
  /** Null when the user has no height: the whole feature needs one. */
  lines: BmiLines | null
}

const SWITCHES: Array<{ key: keyof BmiToggleState; label: string }> = [
  { key: 'healthy', label: 'Healthy range' },
  { key: 'overweight', label: 'Overweight starts' },
  { key: 'obese', label: 'Obese starts' },
]

/**
 * Three independent switches for the BMI reference lines (FF-0085).
 *
 * The bands are computed from the user's height, so without one there is nothing to draw.
 * Rather than hiding the feature silently, the row explains itself and points at Profile —
 * "why is this missing?" is a worse experience than "add your height first".
 */
export default function BmiToggles({ value, onChange, lines }: Props) {
  if (!lines) {
    return (
      <p className="text-[11px] px-1" style={{ color: '#757575' }}>
        BMI ranges need your height — add it in More → Profile.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2 px-1">
      {SWITCHES.map(({ key, label }) => {
        const on = value[key]
        return (
          <button
            key={key}
            type="button"
            role="switch"
            aria-checked={on}
            onClick={() => onChange({ ...value, [key]: !on })}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold border"
            style={{
              borderColor: on ? '#185ADB' : '#e0e0e0',
              background: on ? '#185ADB' : '#fff',
              color: on ? '#fff' : '#757575',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

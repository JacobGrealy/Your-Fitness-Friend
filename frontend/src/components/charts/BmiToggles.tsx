import type { BmiLines } from '@/utils/bmi'

export interface ChartToggleState {
  healthy: boolean
  overweight: boolean
  obese: boolean
  /**
   * The goal line (FF-0088). Unlike the BMI bands this defaults ON: the goal is the user's
   * own number, and turning it off is the deliberate choice.
   */
  goal: boolean
}

export const CHART_TOGGLES_DEFAULT: ChartToggleState = {
  healthy: false, overweight: false, obese: false, goal: true,
}

/** Kept for callers that predate the goal switch. */
export const BMI_TOGGLES_OFF: ChartToggleState = CHART_TOGGLES_DEFAULT

interface Props {
  value: ChartToggleState
  onChange: (next: ChartToggleState) => void
  /** Null when the user has no height: the BMI bands need one. */
  lines: BmiLines | null
}

const SWITCHES: Array<{ key: keyof ChartToggleState; label: string }> = [
  { key: 'healthy', label: 'Healthy range' },
  { key: 'overweight', label: 'Overweight starts' },
  { key: 'obese', label: 'Obese starts' },
]

function ChartSwitch({
  label,
  on,
  onToggle,
}: {
  label: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
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
}

/**
 * Three independent switches for the BMI reference lines (FF-0085).
 *
 * The bands are computed from the user's height, so without one there is nothing to draw.
 * Rather than hiding the feature silently, the row explains itself and points at Profile —
 * "why is this missing?" is a worse experience than "add your height first".
 */
export default function BmiToggles({ value, onChange, lines }: Props) {
  return (
    <div className="space-y-1 px-1">
      <div className="flex flex-wrap gap-2">
        {/* The goal line needs no height, so its switch is outside the BMI guard (FF-0088). */}
        <ChartSwitch
          label="Goal"
          on={value.goal}
          onToggle={() => onChange({ ...value, goal: !value.goal })}
        />
        {lines &&
          SWITCHES.map(({ key, label }) => (
            <ChartSwitch
              key={key}
              label={label}
              on={value[key]}
              onToggle={() => onChange({ ...value, [key]: !value[key] })}
            />
          ))}
      </div>
      {!lines && (
        <p className="text-[11px]" style={{ color: '#757575' }}>
          BMI ranges need your height — add it in More → Profile.
        </p>
      )}
    </div>
  )
}

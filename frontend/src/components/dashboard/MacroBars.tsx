interface MacroBarProps {
  label: string
  consumed: number
  goal: number
  unit: string
  color: string
}

function MacroBar({ label, consumed, goal, unit, color }: MacroBarProps) {
  const percentage = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-base-content/70">
          {consumed}{unit} / {goal}{unit}
        </span>
      </div>
      <div className="h-2.5 w-full bg-base-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

interface MacroBarsProps {
  protein: { consumed: number; goal: number }
  carbs: { consumed: number; goal: number }
  fat: { consumed: number; goal: number }
}

function MacroBars({ protein, carbs, fat }: MacroBarsProps) {
  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="card-title text-base">Macros</h2>
        <div className="space-y-3">
          <MacroBar
            label="Protein"
            consumed={protein.consumed}
            goal={protein.goal}
            unit="g"
            color="bg-primary"
          />
          <MacroBar
            label="Carbs"
            consumed={carbs.consumed}
            goal={carbs.goal}
            unit="g"
            color="bg-accent"
          />
          <MacroBar
            label="Fat"
            consumed={fat.consumed}
            goal={fat.goal}
            unit="g"
            color="bg-secondary"
          />
        </div>
      </div>
    </div>
  )
}

export default MacroBars

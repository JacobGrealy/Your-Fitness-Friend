import { formatCalories } from '@/utils/formatters'

interface CalorieRingProps {
  consumed: number
  goal: number
  remaining: number
  burned: number
}

function CalorieRing({ consumed, goal, remaining, burned }: CalorieRingProps) {
  const percentage = Math.min((consumed / goal) * 100, 100)
  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  let ringColor = 'text-success'
  if (percentage >= 100) {
    ringColor = 'text-error'
  } else if (percentage >= 85) {
    ringColor = 'text-warning'
  }

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body items-center text-center">
        <h2 className="card-title text-base">Calories</h2>

        <div className="relative mt-2">
          <svg
            className="w-40 h-40 -rotate-90"
            viewBox="0 0 120 120"
          >
            <circle
              cx="60"
              cy="60"
              r="54"
              className="stroke-base-300"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              className={`${ringColor} transition-all duration-700`}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{formatCalories(consumed)}</span>
            <span className="text-xs text-base-content/60">of {formatCalories(goal)}</span>
          </div>
        </div>

        <div className="mt-3 w-full space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-base-content/60">Remaining</span>
            <span className={`font-semibold ${remaining >= 0 ? 'text-success' : 'text-error'}`}>
              {remaining >= 0 ? formatCalories(remaining) : `${formatCalories(Math.abs(remaining))} over`}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-base-content/60">Burned (exercise)</span>
            <span className="font-semibold text-accent">{formatCalories(burned)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CalorieRing

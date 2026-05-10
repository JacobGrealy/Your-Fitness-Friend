import type { DailyCalorieData } from '@/types'

interface CalorieSummaryBarProps {
  calories: DailyCalorieData
}

function CalorieSummaryBar({ calories }: CalorieSummaryBarProps) {
  const { goal, consumed, burned_exercise, remaining } = calories

  const isUnderGoal = remaining >= 0

  return (
    <div className="bg-white rounded-lg p-4">
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-2xl font-bold" style={{ color: '#212121' }}>{goal.toLocaleString()}</p>
          <p className="text-xs mt-1" style={{ color: '#757575' }}>Goal</p>
        </div>
        <div>
          <p className="text-2xl font-bold" style={{ color: '#212121' }}>{consumed.toLocaleString()}</p>
          <p className="text-xs mt-1" style={{ color: '#757575' }}>Food</p>
        </div>
        <div>
          <p className="text-2xl font-bold" style={{ color: '#212121' }}>{burned_exercise.toLocaleString()}</p>
          <p className="text-xs mt-1" style={{ color: '#757575' }}>Exercise</p>
        </div>
        <div>
          <p
            className="text-2xl font-bold"
            style={{
              color: isUnderGoal ? '#4CAF50' : '#E53935',
            }}
          >
            {remaining >= 0 ? remaining.toLocaleString() : `-${Math.abs(remaining).toLocaleString()}`}
          </p>
          <p className="text-xs mt-1" style={{ color: '#757575' }}>Remaining</p>
        </div>
      </div>
    </div>
  )
}

export default CalorieSummaryBar

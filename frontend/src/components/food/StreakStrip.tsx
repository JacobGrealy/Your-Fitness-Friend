import type { DiaryDayState, DiaryStreaks, DiaryWeek } from '@/api/diary'

interface Props {
  streaks: DiaryStreaks
  week: DiaryWeek
}

const GREY = '#757575'
const GREEN = '#2E7D32'
const AMBER = '#F9A825'
const BLUE = '#185ADB'

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/**
 * The week strip (FF-0072).
 *
 * Seven dots for the current Sunday–Saturday week, the run length, and whether today
 * still counts. The dot states are deliberately four, not two:
 *
 *   on_target  green  — closed and within 10% of that day's goal
 *   closed     blue   — closed, but over goal (an honest state, not a failure)
 *   open       amber  — today, not closed yet: the streak is at risk right now
 *   missed     hollow grey
 *   future     pale   — the rest of the week, not yet earned
 *
 * Best streak deliberately lives in the badges section, not here: this strip is about
 * the week you can still affect.
 */
export default function StreakStrip({ streaks, week }: Props) {
  const closed = streaks.closed_days
  const atRisk = !streaks.closed_today
  const tag = atRisk ? 'close today to keep it' : 'today counts'

  return (
    <div className="bg-white rounded-lg px-4 py-3" data-testid="streak-strip">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xl font-bold" style={{ color: '#212121' }}>
          {closed}
          <span className="text-sm font-semibold ml-1.5" style={{ color: GREY }}>
            {closed === 1 ? 'day closed' : 'days closed'}
          </span>
        </p>
        <span
          className="text-[11px] font-bold px-2 py-1 rounded-full flex-shrink-0"
          style={{
            background: atRisk ? '#FFF8E1' : '#E8F5E9',
            color: atRisk ? '#8a6d00' : GREEN,
          }}
        >
          {tag}
        </span>
      </div>

      {/* Named because the week starts on Sunday: early in the week the dots are
          mostly empty while the run length above is high, and without this the two
          numbers look like they disagree. */}
      <p className="text-[10px] uppercase tracking-wide mt-3" style={{ color: GREY }}>
        this week
      </p>
      <div className="grid grid-cols-7 gap-1.5 mt-1">
        {week.days.map((day, index) => {
          const look = dotLook(day.state)
          return (
            <div key={day.date} className="flex flex-col items-center gap-1">
              <span
                aria-label={`${day.date}: ${day.state.replace('_', ' ')}`}
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                style={look}
              >
                {look.symbol}
              </span>
              <span className="text-[10px]" style={{ color: GREY }}>{DAY_LABELS[index]}</span>
            </div>
          )
        })}
      </div>

      <p className="text-xs mt-2" style={{ color: GREY }}>
        <b style={{ color: '#212121' }}>{week.on_target}</b> of 7 on target
      </p>
    </div>
  )
}

function dotLook(state: DiaryDayState): { background: string; color: string; border?: string; symbol: string } {
  switch (state) {
    case 'on_target':
      return { background: GREEN, color: '#fff', symbol: '✓' }
    case 'closed':
      return { background: BLUE, color: '#fff', symbol: '✓' }
    case 'open':
      return { background: '#fff', color: AMBER, border: `2px solid ${AMBER}`, symbol: '·' }
    case 'missed':
      return { background: '#fff', color: GREY, border: '2px solid #e0e0e0', symbol: '·' }
    default:
      return { background: '#ececec', color: '#b0b0b0', symbol: '' }
  }
}

import type { DiaryCompletionSummary } from '@/api/diary'
import StreakStrip from './StreakStrip'

interface Props {
  summary: DiaryCompletionSummary
  onReopen: () => void
  reopening?: boolean
}

const BLUE = '#185ADB'
const GREY = '#757575'
const GREEN = '#2E7D32'

function pounds(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `${Math.round(Math.abs(value) * 10) / 10} lb`
}

/**
 * The closed-day panel (FF-0068).
 *
 * Sits directly under the goal / food / exercise line, because that is where the
 * user's attention already is when they wonder whether to add one more thing. It
 * carries the five-week projection, both streaks, and the only way back out —
 * Reopen — so closing reads as a finish line rather than a hidden toggle.
 */
export default function ClosedDayPanel({ summary, onReopen, reopening = false }: Props) {
  const { projection, streaks, week, status, message, totals, goal_calories: goal } = summary
  const hasProjection = projection.change_lbs !== null && projection.change_lbs !== undefined
  const losing = (projection.change_lbs ?? 0) < 0

  return (
    <div className="bg-white rounded-lg overflow-hidden border border-[#cfe8d5]">
      <div className="px-4 py-2 flex items-center justify-between gap-3" style={{ background: '#E8F5E9' }}>
        <span className="text-sm font-semibold" style={{ color: GREEN }}>
          ✓ Diary closed
        </span>
        <button
          type="button"
          onClick={onReopen}
          disabled={reopening}
          className="text-xs font-medium px-2 py-1 rounded-md border bg-white disabled:opacity-50"
          style={{ borderColor: '#cfe8d5', color: GREY }}
        >
          {reopening ? 'Reopening…' : 'Reopen'}
        </button>
      </div>

      {week && (
        <div className="px-2 pt-2">
          <StreakStrip streaks={streaks} week={week} />
        </div>
      )}

      <div className="px-4 py-3 space-y-3">
        {hasProjection ? (
          <p className="text-sm" style={{ color: '#212121' }}>
            <span className="font-semibold" style={{ color: losing ? GREEN : BLUE }}>
              {losing ? '↓' : '↑'} {pounds(projection.change_lbs)}
            </span>
            <span style={{ color: GREY }}>
              {' '}in {projection.days / 7} weeks if every day were like today
              {projection.projected_weight_lbs !== null
                ? ` — ${projection.projected_weight_lbs} lb`
                : ''}
            </span>
          </p>
        ) : (
          <p className="text-sm" style={{ color: GREY }}>{message}</p>
        )}

        {status !== 'ok' && (
          <div
            className="rounded-lg p-2 text-[11px]"
            style={{ background: status === 'too_low' ? '#FDECEA' : '#FFF8E1', color: '#212121' }}
            role="status"
          >
            {message}
          </div>
        )}

        {goal ? (
          <p className="text-[11px]" style={{ color: GREY }}>
            {totals.calories.toLocaleString()} of {goal.toLocaleString()} kcal logged.
            Adding food after closing means reopening the day.
          </p>
        ) : null}
      </div>
    </div>
  )
}

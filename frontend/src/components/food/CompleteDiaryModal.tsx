import { formatMacro } from '@/utils/formatters'
import type { DiaryCompletionSummary } from '@/api/diary'

interface Props {
  summary: DiaryCompletionSummary
  onClose: () => void
  onReopen: () => void
  reopening?: boolean
}

const BLUE = '#185ADB'
const GREY = '#757575'

function pounds(value: number | null): string {
  if (value === null || value === undefined) return '—'
  const rounded = Math.round(Math.abs(value) * 10) / 10
  return `${rounded} lb`
}

/**
 * The day's report card (FF-0054).
 *
 * Kept deliberately plain about what the projection is: a motivational estimate
 * built from one day repeated, not a forecast. When the API withholds the number
 * (nothing logged, or intake low enough that projecting loss would encourage
 * under-eating) this screen shows the reason instead of a figure.
 */
export default function CompleteDiaryModal({ summary, onClose, onReopen, reopening = false }: Props) {
  const { totals, projection, status, message, goal_calories: goal } = summary
  const closedDays = summary.streaks?.closed_days ?? summary.streak ?? 0
  const onTargetDays = summary.streaks?.within_goal_days ?? 0
  const hasProjection = projection.change_lbs !== null && projection.change_lbs !== undefined
  const losing = (projection.change_lbs ?? 0) < 0

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Diary complete"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[85vh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 py-4" style={{ background: BLUE }}>
          <p className="text-white text-lg font-semibold">Diary complete</p>
          <p className="text-white/80 text-xs mt-0.5">
            {summary.date}
            {closedDays > 1 ? ` · ${closedDays} days in a row` : ''}
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'Cal', value: totals.calories.toLocaleString() },
              { label: 'Protein', value: `${formatMacro(totals.protein_g)}g` },
              { label: 'Carbs', value: `${formatMacro(totals.carbs_g)}g` },
              { label: 'Fat', value: `${formatMacro(totals.fat_g)}g` },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-[#f2f2f2] py-2">
                <p className="text-sm font-semibold" style={{ color: '#212121' }}>{item.value}</p>
                <p className="text-[10px]" style={{ color: GREY }}>{item.label}</p>
              </div>
            ))}
          </div>

          {goal ? (
            <p className="text-xs text-center" style={{ color: GREY }}>
              {totals.calories.toLocaleString()} of {goal.toLocaleString()} calorie goal
            </p>
          ) : null}

          {hasProjection ? (
            <div className="rounded-xl border border-[#e0e0e0] p-4 text-center">
              <p className="text-xs uppercase tracking-wide" style={{ color: GREY }}>
                In {projection.days / 7} weeks
              </p>
              <p className="text-2xl font-semibold mt-1" style={{ color: losing ? '#2E7D32' : BLUE }}>
                {losing ? '↓' : '↑'} {pounds(projection.change_lbs)}
              </p>
              {projection.projected_weight_lbs !== null && (
                <p className="text-sm mt-1" style={{ color: '#212121' }}>
                  {projection.projected_weight_lbs} lb
                  {projection.start_weight_lbs !== null ? ` from ${projection.start_weight_lbs} lb` : ''}
                </p>
              )}
              <p className="text-[11px] mt-2" style={{ color: GREY }}>
                If every day were like this one.
              </p>
            </div>
          ) : null}

          {closedDays > 0 && (
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg py-2" style={{ background: '#E8F5E9' }}>
                <p className="text-lg font-bold" style={{ color: '#2E7D32' }}>{closedDays}</p>
                <p className="text-[10px]" style={{ color: GREY }}>
                  {closedDays === 1 ? 'day closed' : 'days closed'} in a row
                </p>
              </div>
              <div className="rounded-lg py-2" style={{ background: '#E8F0FE' }}>
                <p className="text-lg font-bold" style={{ color: BLUE }}>{onTargetDays}</p>
                <p className="text-[10px]" style={{ color: GREY }}>
                  within {summary.streaks?.tolerance_pct ?? 10}% of goal
                </p>
              </div>
            </div>
          )}

          {status !== 'ok' && (
            <div
              className="rounded-lg p-3 text-xs"
              style={{
                background: status === 'too_low' ? '#FDECEA' : '#FFF8E1',
                color: '#212121',
              }}
              role="status"
            >
              {message}
            </div>
          )}

          {status === 'ok' && !hasProjection && (
            <p className="text-xs text-center" style={{ color: GREY }}>{message}</p>
          )}
        </div>

        <div className="px-5 pb-5 pt-1 flex gap-2">
          <button
            type="button"
            onClick={onReopen}
            disabled={reopening}
            className="flex-1 py-3 rounded-xl text-sm font-medium border border-[#e0e0e0] disabled:opacity-50"
            style={{ color: '#212121' }}
          >
            {reopening ? 'Reopening…' : 'Reopen'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-[2] py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: BLUE }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

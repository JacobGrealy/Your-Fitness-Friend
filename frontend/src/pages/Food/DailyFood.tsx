import { useCallback, useEffect, useRef, useState } from 'react'
import ThumbnailImage from '@/components/common/ThumbnailImage'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { diaryApi, type DiaryCompletionSummary, type DiaryStreaks, type DiaryWeek } from '@/api/diary'
import CompleteDiaryModal from '@/components/food/CompleteDiaryModal'
import ClosedDayPanel from '@/components/food/ClosedDayPanel'
import CopyMealSheet from '@/components/food/CopyMealSheet'
import StreakStrip from '@/components/food/StreakStrip'
import { useFoodStore } from '@/store/foodStore'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import type { MealType, FoodLog } from '@/types'
import { formatCalories, formatMacro, formatServing } from '@/utils/formatters'
import { MEAL_LABELS, MEAL_TYPES } from '@/utils/constants'
import CalorieSummaryBar from '@/components/dashboard/CalorieSummaryBar'
import Loading from '@/components/common/Loading'
import PendingStatus from '@/components/common/PendingStatus'
import Modal from '@/components/common/Modal'
import DiaryDateSelector from '@/components/food/DiaryDateSelector'
import { returnState } from '@/utils/returnTo'
import DiaryExerciseSection from '@/components/food/DiaryExerciseSection'
import DiaryHealthSections from '@/components/food/DiaryHealthSections'
import DiaryHydrationSection from '@/components/food/DiaryHydrationSection'

function queryDiaryDate(value: string | null): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T12:00:00`)
    if (!Number.isNaN(parsed.getTime()) && format(parsed, 'yyyy-MM-dd') === value) return parsed
  }
  return new Date()
}

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '☀️',
  lunch: '🌤️',
  dinner: '🌙',
  snack: '🍎',
}

function MealSection({
  meal,
  logs,
  totals,
  isCollapsed,
  onToggle,
  onDelete,
  onAddFood,
  onEditLog,
  onCopy,
}: {
  meal: MealType
  logs: FoodLog[]
  totals: { calories: number; protein: number; carbs: number; fat: number }
  isCollapsed: boolean
  onToggle: () => void
  onDelete: (id: string) => void
  onAddFood: (meal: MealType) => void
  onEditLog: (id: string) => void
  onCopy: (meal: MealType) => void
}) {
  return (
    <div className="bg-white rounded-lg">
      <button
        type="button"
        className="flex items-center justify-between w-full px-4 py-3 cursor-pointer bg-[#185ADB] rounded-t-lg text-left"
        onClick={onToggle}
        aria-expanded={!isCollapsed}
        aria-label={`${MEAL_LABELS[meal]} section`}
      >
        <div className="flex items-center gap-2">
          <span>{MEAL_ICONS[meal]}</span>
          <span className="font-bold text-white">{MEAL_LABELS[meal]}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white text-sm">
            {totals.calories > 0 ? `${totals.calories} cal` : '0 cal'}
          </span>
          {/* Copy this meal somewhere else, from the meal itself (FF-0082). */}
          <span
            role="button"
            tabIndex={0}
            aria-label={`Copy ${MEAL_LABELS[meal]}`}
            onClick={(event) => {
              event.stopPropagation()
              onCopy(meal)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.stopPropagation()
                onCopy(meal)
              }
            }}
            className="px-2 py-0.5 rounded border border-white/60 text-white text-[11px] font-semibold"
          >
            Copy
          </span>
          <svg
            className={`w-4 h-4 text-white transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {!isCollapsed && (
        <div className="divide-y divide-[#e0e0e0]">
          {logs.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[#757575]">
              0 calories
            </div>
          ) : (
            logs.map(log => (
              <div
                key={log.id}
                role="button"
                tabIndex={0}
                onClick={() => onEditLog(log.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onEditLog(log.id)
                  }
                }}
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#fafafa] transition-colors"
                aria-label={`Edit ${log.food_name}`}
              >
                {log.photo_url && (
                  <ThumbnailImage
                    src={`/api/food/uploads/${log.photo_url}`}
                    alt=""
                    className="w-10 h-10 rounded object-cover shrink-0 mr-3"
                  />
                )}
                <div className="flex-1 min-w-0 mr-3">
                  <span className="font-medium text-sm" style={{ color: '#212121' }}>{log.food_name}</span>
                  {log.brand && (
                    <div className="text-xs text-[#757575] mt-0.5">{log.brand}</div>
                  )}
                  <div className="text-xs text-[#757575] mt-0.5">
                    {(() => {
                      // Serving first when it is known: "how much did I have"
                      // is what a diary row is scanned for (FF-0029).
                      const serving = log.amount && log.unit && log.unit !== 'serving'
                        ? `${formatMacro(log.amount)} ${log.unit}`
                        : formatServing(log.number_of_servings, log.serving_size)
                      return serving ? `${serving} · ` : ''
                    })()}
                    {formatCalories(log.calories)} cal · P:{formatMacro(log.protein_g)}g C:{formatMacro(log.carbs_g)}g F:{formatMacro(log.fat_g)}g
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(log.id)
                  }}
                  className="text-[#757575] hover:text-red-600 transition-colors shrink-0 p-1"
                  aria-label={`Delete ${log.food_name}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAddFood(meal)
            }}
            className="w-full py-3 mt-1 text-sm font-medium text-[#185ADB] border-t border-[#e0e0e0] hover:bg-[#f2f2f2] transition-colors rounded-b-lg"
          >
            + Add Food
          </button>
        </div>
      )}
    </div>
  )
}

export default function DailyFood() {
  const { setTitle, setCenterContent } = usePageTitle()
  const navigate = useNavigate()
  const { foodLogs, dailyTotals, logsDate, totalsDate, logsLoading, totalsLoading, logsError, totalsError, fetchFoodLogs, fetchDailyTotals, deleteFoodLog, copyMeal } = useFoodStore()
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null)
  const [collapsedMeals, setCollapsedMeals] = useState<Set<MealType>>(new Set())
  const [searchParams] = useSearchParams()
  const requestedDate = searchParams.get('date')
  const [currentDate, setCurrentDate] = useState(() => queryDiaryDate(requestedDate))
  useEffect(() => { if (requestedDate) setCurrentDate(queryDiaryDate(requestedDate)) }, [requestedDate])
  const [exerciseSummary, setExerciseSummary] = useState({ date: '', total: 0 })
  const dateStr = format(currentDate, 'yyyy-MM-dd')
  const selectedDate = useRef(dateStr)
  const visit = useRef(0)
  if (selectedDate.current !== dateStr) visit.current++
  selectedDate.current = dateStr
  const deleteDialog = useRef(0)
  const [deleteError, setDeleteError] = useState('')
  const [completionDate, setCompletionDate] = useState<string | null>(null)
  const [completionError, setCompletionError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const deleteBusy = useRef(false)
  const actionBusy = useRef(false)
  // `closedSummary` feeds the panel on load; `completion` drives the celebration and
  // is set only when the user closes the day, so revisiting a closed diary does not
  // re-pop the modal (FF-0068).
  const [closedSummary, setClosedSummary] = useState<DiaryCompletionSummary | null>(null)
  const [completion, setCompletion] = useState<DiaryCompletionSummary | null>(null)
  const [completedToday, setCompletedToday] = useState(false)
  const [streaks, setStreaks] = useState<DiaryStreaks | null>(null)
  const [week, setWeek] = useState<DiaryWeek | null>(null)
  const [copyFrom, setCopyFrom] = useState<MealType | null>(null)
  const [completing, setCompleting] = useState(false)
  const [undoing, setUndoing] = useState(false)

  useEffect(() => { setTitle('Diary') }, [setTitle])

  useEffect(() => {
    let active = true
    setCompletionDate(null); setCompletionError(''); setCompletion(null)
    deleteDialog.current++
    setDeleteError(''); setDeleteLogId(null); setCopyFrom(null)
    void fetchDailyTotals(dateStr)
    void fetchFoodLogs(dateStr)
    diaryApi.getCompletion(dateStr).then(state => {
      if (!active || selectedDate.current !== dateStr) return
      setCompletedToday(state.completed)
      setClosedSummary(state.completed ? state : null)
      setStreaks(state.streaks ?? null)
      setWeek(state.week ?? null)
      setCompletionDate(dateStr)
    }).catch(() => {
      if (active && selectedDate.current === dateStr) setCompletionError('Unable to load diary completion. Please retry.')
    })
    return () => { active = false }
  }, [dateStr, attempt, fetchDailyTotals, fetchFoodLogs])

  const diaryError = logsError || totalsError || completionError
  // The rows and totals this screen is showing belong to the selected date. Until they
  // do — a first load, or a real date change — the body must not pretend to be this
  // day's diary. A same-date refresh is a different thing: it must NOT tear the body
  // down, because replacing it collapses the document and throws away the scroll
  // position (FF-0136).
  const showingSelectedDate = logsDate === dateStr && totalsDate === dateStr
  const refreshing = showingSelectedDate && (logsLoading || totalsLoading)
  // Completion carries its own date: a stale streak/closed panel is hidden across a
  // date change without blanking rows that are already correct.
  const completionForDate = completionDate === dateStr
  const diaryReady = showingSelectedDate && !diaryError
  const actionsReady = diaryReady && completionForDate && !completionError

  useEffect(() => {
    setCenterContent(
      <DiaryDateSelector date={currentDate} onChange={setCurrentDate} variant="header" />
    )
    return () => setCenterContent(null)
  }, [currentDate, setCenterContent])

  const completeDiary = useCallback(async () => {
    if (actionBusy.current || !actionsReady) return
    const startedVisit = visit.current
    actionBusy.current = true
    setCompleting(true)
    try {
      const summary = await diaryApi.complete(dateStr)
      if (selectedDate.current !== dateStr || visit.current !== startedVisit) return
      setClosedSummary(summary)
      setCompletion(summary)
      setCompletedToday(true)
      setStreaks(summary.streaks ?? null)
      setWeek(summary.week ?? null)
    } catch {
      if (selectedDate.current === dateStr && visit.current === startedVisit) setCompletionError('Unable to complete diary. Please retry.')
    } finally {
      actionBusy.current = false
      setCompleting(false)
    }
  }, [dateStr, actionsReady])

  const handleCopyMeal = useCallback(
    async (toDate: string, toMeal: MealType) => {
      if (!copyFrom) return
      try {
        await copyMeal(
          { date: format(currentDate, 'yyyy-MM-dd'), mealType: copyFrom },
          { date: toDate, mealType: toMeal, label: `${MEAL_LABELS[toMeal]} on ${toDate}` }
        )
      } catch {
        // the store has already explained the failure
      }
    },
    [copyFrom, currentDate, copyMeal]
  )

  const reopenDiary = useCallback(async () => {
    if (actionBusy.current || !diaryReady) return
    const startedVisit = visit.current
    actionBusy.current = true
    setUndoing(true)
    try {
      const state = await diaryApi.undo(dateStr)
      if (selectedDate.current !== dateStr || visit.current !== startedVisit) return
      setCompletion(null)
      setClosedSummary(null)
      setCompletedToday(false)
      // Reopening keeps yesterday's run: the streak only breaks if the day stays open.
      if (state?.streaks) setStreaks(state.streaks)
      if (state?.week) setWeek(state.week)
    } catch {
      if (selectedDate.current === dateStr && visit.current === startedVisit) setCompletionError('Unable to reopen diary. Please retry.')
    } finally {
      actionBusy.current = false
      setUndoing(false)
    }
  }, [dateStr, actionsReady])

  const groupedLogs = MEAL_TYPES.reduce((acc, meal) => {
    acc[meal] = foodLogs.filter(log => log.meal_type === meal)
    return acc
  }, {} as Record<MealType, FoodLog[]>)

  const toggleMeal = (meal: MealType) => {
    setCollapsedMeals(prev => {
      const next = new Set(prev)
      if (next.has(meal)) {
        next.delete(meal)
      } else {
        next.add(meal)
      }
      return next
    })
  }

  const handleDeleteLog = async () => {
    if (!deleteLogId || deleteBusy.current || !diaryReady) return
    const startedVisit = visit.current, dialog = deleteDialog.current
    deleteBusy.current = true; setDeleting(true); setDeleteError('')
    try {
      await deleteFoodLog(deleteLogId)
      if (visit.current === startedVisit && deleteDialog.current === dialog) setDeleteLogId(null)
    } catch (cause: any) {
      if (visit.current === startedVisit && deleteDialog.current === dialog) {
        setDeleteError(cause.response?.data?.error || cause.response?.data?.message || 'Failed to delete food log. Please retry.')
      }
    } finally { deleteBusy.current = false; setDeleting(false) }
  }

  const getMealTotals = (logs: FoodLog[]) => {
    return logs.reduce(
      (acc, log) => ({
        calories: acc.calories + log.calories,
        protein: acc.protein + log.protein_g,
        carbs: acc.carbs + log.carbs_g,
        fat: acc.fat + log.fat_g,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
  }

  return (
    <div className="bg-[#f2f2f2] pb-4">

      {/* The mobile top bar carries the date control, and it is hidden at the
          width where the sidebar takes over — so landscape and desktop get it
          inline. Without this, the diary date could not be changed at all in
          landscape (FF-0019). */}
      <div className="hidden sm:flex justify-end px-4 pt-4">
        <DiaryDateSelector date={currentDate} onChange={setCurrentDate} variant="inline" />
      </div>

      <div className="px-4 pt-4 space-y-4">
        {!diaryReady && (diaryError ? <div className="bg-white rounded-lg p-4"><p role="alert">{diaryError}</p><button className="mt-2 text-mfp-blue underline" onClick={() => setAttempt(value => value + 1)}>Retry diary</button></div> : <div role="status" aria-busy="true" className="py-8"><Loading text="Loading diary…" /></div>)}
        {diaryReady && <>
        {/* A same-date refresh keeps every section mounted, so the document height and
            the scroll position survive a delete or a totals reload (FF-0136). */}
        {refreshing && <PendingStatus text="Updating diary…" />}
        {dailyTotals && (
          <CalorieSummaryBar
            calories={{
              consumed: dailyTotals.total_calories,
              goal: dailyTotals.calorie_goal,
              remaining: dailyTotals.calories_remaining,
              burned_exercise: exerciseSummary.date === format(currentDate, 'yyyy-MM-dd') ? exerciseSummary.total : 0,
            }}
          />
        )}

        {completionForDate && completedToday && closedSummary && (
          <ClosedDayPanel summary={closedSummary} onReopen={reopenDiary} reopening={undoing} />
        )}

        {completionForDate && !completedToday && streaks && week && <StreakStrip streaks={streaks} week={week} />}

        <div className="space-y-4">
          {MEAL_TYPES.map(meal => {
            const logs = groupedLogs[meal]
            const totals = getMealTotals(logs)
            const isCollapsed = collapsedMeals.has(meal)

            return (
              <MealSection
                key={meal}
                meal={meal}
                logs={logs}
                totals={totals}
                isCollapsed={isCollapsed}
                onToggle={() => toggleMeal(meal)}
                onDelete={(id) => { deleteDialog.current++; setDeleteError(''); setDeleteLogId(id) }}
                onAddFood={(m) => navigate(`/food/log?meal=${m}&date=${format(currentDate, 'yyyy-MM-dd')}`, { state: returnState(`/food/daily?date=${format(currentDate, 'yyyy-MM-dd')}`) })}
                onEditLog={(id) => navigate(`/food/log/${id}/edit`)}
                onCopy={setCopyFrom}
              />
            )
          })}
        </div>
        </>}
        <DiaryExerciseSection key={dateStr} date={dateStr} onTotal={setExerciseSummary} />
        <DiaryHydrationSection date={format(currentDate, 'yyyy-MM-dd')} />
        <DiaryHealthSections date={format(currentDate, 'yyyy-MM-dd')} />
      </div>

      {/* Once the day is closed the panel above owns it — Reopen lives there, so
          this row disappears rather than offering a second way to undo (FF-0068).
          Kept inline rather than in a fixed bar: a floating element has to clear the
          bottom nav itself, and that mistake cost three rounds (FF-0051, FF-0053). */}
      {diaryReady && copyFrom && (
        <CopyMealSheet
          isOpen
          onClose={() => setCopyFrom(null)}
          fromMeal={copyFrom}
          fromDate={format(currentDate, 'yyyy-MM-dd')}
          itemCount={groupedLogs[copyFrom]?.length ?? 0}
          onCopy={handleCopyMeal}
        />
      )}

      {actionsReady && !completedToday && (
        <div className="px-4 pt-2 pb-2">
          <button
            type="button"
            onClick={completeDiary}
            disabled={completing}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: '#185ADB' }}
          >
            {completing ? 'Completing…' : 'Complete Diary'}
          </button>
        </div>
      )}

      {diaryReady && completion && (
        <CompleteDiaryModal
          summary={completion}
          onClose={() => setCompletion(null)}
          onReopen={reopenDiary}
          reopening={undoing}
        />
      )}

      <Modal
        isOpen={deleteLogId !== null && (diaryReady || deleting)}
        onClose={() => { if (!deleting) setDeleteLogId(null) }}
        title="Delete Food Log"
        submitLabel="Delete"
        onSubmit={handleDeleteLog}
        submitDisabled={deleting}
        submitLoading={deleting}
      >
        <p className="text-sm" style={{ color: '#757575' }}>
          Are you sure you want to delete this food log? This action cannot be undone.
        </p>
        {deleteError && <p role="alert" className="text-red-700 mt-2">{deleteError}</p>}
      </Modal>
    </div>
  )
}

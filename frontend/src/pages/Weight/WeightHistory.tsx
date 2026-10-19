import { format } from 'date-fns'
import { todayLocal } from '@/utils/localDate'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWeightStore } from '@/store/weightStore'
import { useAuthStore } from '@/store/authStore'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import { formatDate, formatWeight } from '@/utils/formatters'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'
import Modal from '@/components/common/Modal'
import WeightChartWithGoal from '@/components/charts/WeightChartWithGoal'
import BmiToggles, { type ChartToggleState } from '@/components/charts/BmiToggles'
import { bmiThresholds } from '@/utils/bmi'
import { loadChartToggles, saveChartToggles } from '@/utils/bmiPreferences'
import {
  TREND_WINDOW_DAYS,
  buildWeightSeries,
  changeSinceStart,
  dayOf,
  trendDirection,
} from '@/utils/weightTrend'
import { estimateGoalEta, formatEtaDate } from '@/utils/goalEta'
import ThenAndNow from '@/components/weight/ThenAndNow'
import WeightTimelapse from '@/components/weight/WeightTimelapse'

export default function WeightHistory() {
  const { setTitle } = usePageTitle()
  const { logs, isLoading, fetchLogs, deleteLog } = useWeightStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => { setTitle('Progress') }, [setTitle])

  useEffect(() => {
    fetchLogs()
  }, [])

  // Newest first. Id breaks ties because weight logs are stored at midnight, so two entries
  // on one day share a timestamp and array order would otherwise decide (FF-0090).
  const sortedLogs = [...logs].sort((a, b) => {
    const byTime = new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    if (byTime !== 0) return byTime
    return Number(b.id) - Number(a.id)
  })

  // The same series definition Home uses (FF-0084). The window here is wider, but any
  // overlapping day produces the identical point, which is what the two screens needed.
  // Whole history for the chart (a Progress screen should not hide old weigh-ins), built by
  // the same function Home uses, so any overlapping day is the identical point.
  const series = buildWeightSeries(
    logs.map((log) => ({ weight: log.weight, recorded_at: log.recorded_at })),
    null
  )
  const direction = trendDirection(
    buildWeightSeries(
      logs.map((log) => ({ weight: log.weight, recorded_at: log.recorded_at })),
      TREND_WINDOW_DAYS
    )
  )
  const chartData = series.map((point) => ({
    // The chart wants a string date; the local day is already decided here, so this cannot
    // drift back into the UTC-shifted label (FF-0084).
    date: `${point.day}T00:00:00`,
    weight: point.weight,
  }))

  // BMI reference lines (FF-0085). Null height means no bands, and the toggles say why.
  const [chartToggles, setChartToggles] = useState<ChartToggleState>(() => loadChartToggles())
  const bmiLines = useMemo(() => {
    const lines = bmiThresholds(user?.height ?? null)
    return lines.healthyLow === null ? null : lines
  }, [user?.height])

  const handleChartToggle = useCallback((next: ChartToggleState) => {
    setChartToggles(next)
    saveChartToggles(next)
  }, [])

  const bmiOverlay = useMemo(() => {
    if (!bmiLines) return undefined
    return {
      healthyRange:
        chartToggles.healthy && bmiLines.healthyLow !== null && bmiLines.healthyHigh !== null
          ? { low: bmiLines.healthyLow, high: bmiLines.healthyHigh }
          : null,
      overweightFrom: chartToggles.overweight ? bmiLines.healthyHigh : null,
      obeseFrom: chartToggles.obese ? bmiLines.obeseLow : null,
    }
  }, [bmiLines, chartToggles])

  const currentWeight = sortedLogs.length > 0 ? sortedLogs[0].weight : null
  const goalWeight = user?.weight_goal_lbs

  // Same measurement Home shows: progress from the first weigh-in (FF-0090).
  const sinceStart = useMemo(
    () => changeSinceStart(logs.map((log) => ({
      weight: log.weight, recorded_at: log.recorded_at, id: log.id,
    }))),
    [logs]
  )

  // The newest weigh-in may be days old; say so rather than implying today (FF-0090).
  const newestDay = sortedLogs.length > 0
    ? dayOf(sortedLogs[0].recorded_at)
    : ''
  const currentIsToday = newestDay === todayLocal()
  const currentDateLabel = newestDay
    ? format(new Date(`${newestDay}T00:00:00`), 'MMM d')
    : ''

  const startDateLabel = sinceStart
    ? format(new Date(`${sinceStart.startDay}T00:00:00`), 'MMM d')
    : ''
  const startChangePercent = sinceStart && sinceStart.start
    ? ((sinceStart.change / sinceStart.start) * 100).toFixed(1)
    : null

  const distanceToGoal = currentWeight !== null && goalWeight
    ? Math.abs(currentWeight - goalWeight)
    : null

  // Projected from the logged trend, falling back to the weekly goal; null when
  // there is nothing honest to say (FF-0026).
  const eta = estimateGoalEta({
    currentWeight,
    goalWeight,
    logs: logs.map((log) => ({ weight: log.weight, recorded_at: log.recorded_at })),
    weeklyGoal: user?.weekly_goal,
  })

  const handleDelete = () => {
    if (deleteId) {
      deleteLog(deleteId)
      setDeleteId(null)
    }
  }

  return (
    // No viewport height here: the shell owns it (FF-0051). This used to set an
    // inline minHeight: 100vh, which the class-based sweep and gate both missed,
    // leaving Progress as the one screen that scrolled 136px into nothing (FF-0052).
    // pb-24 was a duplicate of the shell's own bottom-nav clearance.
    <div className="p-4" style={{ backgroundColor: '#f2f2f2' }}>
      {/* Weight Goal Card */}
      {currentWeight !== null && (
        <div className="bg-white rounded-lg p-4 mb-4 border border-[#e0e0e0]">
          {goalWeight && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: '#757575' }}>Weight Goal</span>
              <span className="text-sm font-medium" style={{ color: '#185ADB' }}>{formatWeight(goalWeight)}</span>
            </div>
          )}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium" style={{ color: '#757575' }}>
              {currentIsToday ? 'Current Weight' : `Weight (${currentDateLabel})`}
            </span>
            <span className="text-lg font-bold" style={{ color: '#212121' }}>{formatWeight(currentWeight)}</span>
          </div>

          {/* Progress from the first weigh-in: the same measurement Home shows (FF-0090). */}
          {sinceStart && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: '#757575' }}>
                vs. Starting Weight
                <span className="block text-[11px] font-normal" style={{ color: '#9e9e9e' }}>
                  since {startDateLabel}
                </span>
              </span>
              <span
                className="text-sm font-bold text-right"
                style={{ color: sinceStart.change > 0 ? '#E53935' : sinceStart.change < 0 ? '#2E7D32' : '#757575' }}
              >
                {sinceStart.change > 0 ? '↑' : sinceStart.change < 0 ? '↓' : '→'}{' '}
                {sinceStart.change > 0 ? '+' : ''}{sinceStart.change.toFixed(1)} lbs
                {startChangePercent != null && (
                  <span className="block text-[11px] font-normal" style={{ color: '#757575' }}>
                    {startChangePercent}%
                  </span>
                )}
              </span>
            </div>
          )}

          {goalWeight && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: '#757575' }}>
                Distance to Goal
              </span>
              <span className="text-sm font-bold" style={{ color: '#185ADB' }}>
                {distanceToGoal?.toFixed(1)} lbs
              </span>
            </div>
          )}
          {eta && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#e0e0e0]">
              <span className="text-sm font-medium" style={{ color: '#757575' }}>
                On track for
              </span>
              <span className="text-sm font-bold text-right" style={{ color: '#212121' }}>
                {formatEtaDate(eta.date)}
                <span className="block text-xs font-normal" style={{ color: '#757575' }}>
                  {Math.abs(eta.rateLbsPerWeek).toFixed(1)} lb/week
                  {eta.source === 'goal' ? ' (your goal)' : ' (your trend)'}
                </span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="mb-4">
          <div className="flex items-baseline justify-between px-1 mb-1">
            <span className="text-xs" style={{ color: '#757575' }}>
              last {TREND_WINDOW_DAYS} days
            </span>
            <span
              className="text-xs font-semibold"
              style={{
                color:
                  direction === 'down' ? '#2E7D32' : direction === 'up' ? '#c62828' : '#757575',
              }}
            >
              {direction === 'stable' ? 'holding steady' : `trending ${direction}`}
            </span>
          </div>
          <BmiToggles value={chartToggles} onChange={handleChartToggle} lines={bmiLines} />
          <WeightChartWithGoal
            data={chartData}
            height={180}
            goal={chartToggles.goal ? goalWeight : undefined}
            bmi={bmiOverlay}
          />
        </div>
      )}

      {/* Then and Now — collapsed by default, and silent without two photo days */}
      <div className="mb-4">
        <ThenAndNow logs={logs} />
      </div>

      {/* Timelapse — also collapsed, and fetches nothing until opened */}
      <div className="mb-4">
        <WeightTimelapse logs={logs} />
      </div>

      {/* Loading / Empty State */}
      {isLoading && logs.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loading text="Loading weight history..." />
        </div>
      ) : sortedLogs.length === 0 ? (
        <EmptyState
          title="No weight logs yet"
          description="Start tracking your weight to see your history here."
        />
      ) : (
        /* Recent Entries */
        <div className="bg-white rounded-lg border border-[#e0e0e0] overflow-hidden">
          <div className="px-4 py-3" style={{ backgroundColor: '#185ADB' }}>
            <h2 className="text-sm font-semibold text-white">Recent Entries</h2>
          </div>
          {sortedLogs.map((log, index) => (
            <div
              key={log.id}
              onClick={() => navigate(`/weight/history/${log.id}`)}
              className="cursor-pointer px-4 py-3 flex items-center justify-between"
              style={{
                borderBottom: index < sortedLogs.length - 1 ? '1px solid #e0e0e0' : 'none',
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold" style={{ color: '#212121' }}>{formatWeight(log.weight)}</span>
                  <span className="text-xs" style={{ color: '#757575' }}>{formatDate(log.recorded_at)}</span>
                </div>
                {log.notes && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: '#757575' }}>
                    {log.notes}
                  </p>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteId(log.id)
                }}
                className="ml-3 p-1 rounded hover:bg-[#f2f2f2]"
                style={{ color: '#757575' }}
                aria-label="Delete weight entry"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Weight Log"
        submitLabel="Delete"
        onSubmit={handleDelete}
        submitDisabled={isLoading}
        submitLoading={isLoading}
      >
        <p style={{ color: '#757575' }}>
          Are you sure you want to delete this weight log? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}

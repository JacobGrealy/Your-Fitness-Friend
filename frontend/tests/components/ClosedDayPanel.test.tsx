import { fireEvent, render, screen } from '@testing-library/react'
import ClosedDayPanel from '@/components/food/ClosedDayPanel'
import type { DiaryCompletionSummary } from '@/api/diary'

// FF-0068: the closed-day panel. It replaces the old bottom "Diary complete / Undo"
// row: the projection, both streaks and the only way back out all live here, right
// under the goal/food/exercise line.

const summary: DiaryCompletionSummary = {
  date: '2026-10-17',
  completed: true,
  completed_at: '2026-10-17T20:00:00',
  totals: { calories: 2000, protein_g: 90, carbs_g: 180, fat_g: 60, log_count: 4 },
  goal_calories: 2100,
  maintenance_calories: 2720,
  status: 'ok',
  projection: { days: 35, change_lbs: -7.2, projected_weight_lbs: 169.2, start_weight_lbs: 176.4 },
  streaks: {
    closed_days: 5,
    within_goal_days: 3,
    closed_today: true,
    within_goal_today: true,
    tolerance_pct: 10,
  },
  week: {
    start: '2026-10-11',
    end: '2026-10-17',
    days: [
      { date: '2026-10-11', state: 'on_target' as const },
      { date: '2026-10-12', state: 'on_target' as const },
      { date: '2026-10-13', state: 'closed' as const },
      { date: '2026-10-14', state: 'on_target' as const },
      { date: '2026-10-15', state: 'on_target' as const },
      { date: '2026-10-16', state: 'on_target' as const },
      { date: '2026-10-17', state: 'on_target' as const },
    ],
    closed: 7,
    on_target: 6,
  },
  message: 'Based on this day, repeated for five weeks.',
}

describe('ClosedDayPanel (FF-0068)', () => {
  it('states its closed and offers the way back out', () => {
    const onReopen = jest.fn()
    render(<ClosedDayPanel summary={summary} onReopen={onReopen} />)

    expect(screen.getByText('✓ Diary closed')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reopen' }))
    expect(onReopen).toHaveBeenCalled()
  })

  it('puts the projection where the eye already is, under the calorie line', () => {
    render(<ClosedDayPanel summary={summary} onReopen={jest.fn()} />)

    expect(screen.getByText(/7\.2 lb/)).toBeInTheDocument()
    expect(screen.getByText(/in 5 weeks if every day were like today/)).toBeInTheDocument()
    expect(screen.getByText(/169\.2 lb/)).toBeInTheDocument()
  })

  it('carries the week strip, and best streak is not here', () => {
    render(<ClosedDayPanel summary={summary} onReopen={jest.fn()} />)

    expect(screen.getByTestId('streak-strip')).toBeInTheDocument()
    expect(screen.getByText('days closed')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()          // on target this week
    expect(screen.queryByText(/best/i)).not.toBeInTheDocument()
  })

  it('reads naturally on a one-day streak', () => {
    render(
      <ClosedDayPanel
        summary={{
          ...summary,
          streaks: { ...summary.streaks, closed_days: 1, within_goal_days: 1 },
        }}
        onReopen={jest.fn()}
      />
    )

    expect(screen.getByText('day closed')).toBeInTheDocument()
  })

  it('nudges against adding more once closed', () => {
    render(<ClosedDayPanel summary={summary} onReopen={jest.fn()} />)
    expect(screen.getByText(/Adding food after closing means reopening the day/)).toBeInTheDocument()
    expect(screen.getByText(/2,000 of 2,100 kcal/)).toBeInTheDocument()
  })

  it('explains instead of projecting when the number is withheld', () => {
    render(
      <ClosedDayPanel
        summary={{
          ...summary,
          status: 'too_low',
          projection: { days: 35, change_lbs: null, projected_weight_lbs: null, start_weight_lbs: 176.4 },
          message: 'This is under the intake most people need.',
        }}
        onReopen={jest.fn()}
      />
    )

    expect(screen.queryByText(/in 5 weeks/)).not.toBeInTheDocument()
    expect(screen.getAllByText(/under the intake most people need/).length).toBeGreaterThan(0)
  })

  it('disables reopen while it is happening', () => {
    render(<ClosedDayPanel summary={summary} onReopen={jest.fn()} reopening />)
    expect(screen.getByRole('button', { name: 'Reopening…' })).toBeDisabled()
  })
})

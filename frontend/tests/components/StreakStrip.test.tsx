import { render, screen } from '@testing-library/react'
import StreakStrip from '@/components/food/StreakStrip'
import type { DiaryStreaks, DiaryWeek } from '@/api/diary'

// FF-0072: the seven-dot strip that appears on the diary and on Home.

const week = (states: DiaryWeek['days'][number]['state'][]): DiaryWeek => ({
  start: '2026-10-11',
  end: '2026-10-17',
  days: states.map((state, index) => ({ date: `2026-10-${String(11 + index).padStart(2, '0')}`, state })),
  closed: states.filter((s) => s === 'on_target' || s === 'closed').length,
  on_target: states.filter((s) => s === 'on_target').length,
})

const streaks = (overrides: Partial<DiaryStreaks> = {}): DiaryStreaks => ({
  closed_days: 4,
  within_goal_days: 3,
  closed_today: false,
  within_goal_today: false,
  tolerance_pct: 10,
  ...overrides,
})

describe('StreakStrip (FF-0072)', () => {
  it('shows the run length and every day of the week', () => {
    render(<StreakStrip streaks={streaks()} week={week(['missed', 'missed', 'missed', 'on_target', 'on_target', 'closed', 'open'])} />)

    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('days closed')).toBeInTheDocument()
    // S M T W T F S
    expect(screen.getAllByText(/^[SMTWF]$/)).toHaveLength(7)
  })

  it('warns while today is still open, and says so when it counts', () => {
    const { unmount } = render(
      <StreakStrip streaks={streaks()} week={week(['on_target', 'on_target', 'on_target', 'on_target', 'on_target', 'on_target', 'open'])} />
    )
    expect(screen.getByText('close today to keep it')).toBeInTheDocument()
    unmount()

    render(
      <StreakStrip
        streaks={streaks({ closed_today: true, within_goal_today: true })}
        week={week(['on_target', 'on_target', 'on_target', 'on_target', 'on_target', 'on_target', 'on_target'])}
      />
    )
    expect(screen.getByText('today counts')).toBeInTheDocument()
  })

  it('labels each dot with its day and state for screen readers', () => {
    render(<StreakStrip streaks={streaks()} week={week(['on_target', 'closed', 'open', 'missed', 'future', 'future', 'future'])} />)

    expect(screen.getByLabelText('2026-10-11: on target')).toBeInTheDocument()
    expect(screen.getByLabelText('2026-10-12: closed')).toBeInTheDocument()
    expect(screen.getByLabelText('2026-10-13: open')).toBeInTheDocument()
    expect(screen.getByLabelText('2026-10-14: missed')).toBeInTheDocument()
    expect(screen.getByLabelText('2026-10-15: future')).toBeInTheDocument()
  })

  it('distinguishes closed-but-over-goal from on target by colour', () => {
    render(<StreakStrip streaks={streaks()} week={week(['on_target', 'closed', 'future', 'future', 'future', 'future', 'future'])} />)

    const onTarget = screen.getByLabelText('2026-10-11: on target')
    const over = screen.getByLabelText('2026-10-12: closed')
    // green for on target, blue for closed-over — not red, because it is not a failure
    expect(onTarget.style.background).toBe('rgb(46, 125, 50)')
    expect(over.style.background).toBe('rgb(24, 90, 219)')
  })

  it('counts on-target days out of seven, not out of closed days', () => {
    render(<StreakStrip streaks={streaks()} week={week(['on_target', 'closed', 'on_target', 'missed', 'future', 'future', 'future'])} />)
    expect(screen.getByText(/of 7 on target/)).toHaveTextContent('2 of 7 on target')
  })

  it('says "day" rather than "days" for a single day', () => {
    render(<StreakStrip streaks={streaks({ closed_days: 1 })} week={week(['on_target', 'future', 'future', 'future', 'future', 'future', 'future'])} />)
    expect(screen.getByText('day closed')).toBeInTheDocument()
  })
})

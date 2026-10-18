import { render, screen, waitFor } from '@testing-library/react'
import BadgesSection from '@/components/profile/BadgesSection'

// FF-0072: the More page badge collection. Repeatable badges show counts; locked ones
// show progress through the current week.

const getBadges = jest.fn()

jest.mock('@/api/diary', () => ({
  diaryApi: { getBadges: (...args: unknown[]) => getBadges(...args) },
}))

const payload = {
  week: {
    start: '2026-10-11',
    end: '2026-10-17',
    days: [
      { date: '2026-10-11', state: 'on_target' }, { date: '2026-10-12', state: 'on_target' },
      { date: '2026-10-13', state: 'closed' }, { date: '2026-10-14', state: 'on_target' },
      { date: '2026-10-15', state: 'missed' }, { date: '2026-10-16', state: 'open' },
      { date: '2026-10-17', state: 'future' },
    ],
    closed: 4,
    on_target: 3,
  },
  badges: [
    { id: 'perfect_week', title: 'Perfect week', rule: 'Diary closed every day', count: 4, earned: true, progress: { closed: 4, on_target: 3, of: 7 } },
    { id: 'on_target_week', title: 'On target week', rule: 'At least 5 of 7', count: 2, earned: true, progress: { closed: 4, on_target: 3, of: 7 } },
    { id: 'golden_week', title: 'Golden week', rule: 'All 7 within 10%', count: 0, earned: false, progress: { closed: 4, on_target: 3, of: 7 } },
  ],
  stats: { days_closed: 42, best_streak: 9 },
}

describe('BadgesSection (FF-0072)', () => {
  beforeEach(() => getBadges.mockReset().mockResolvedValue(payload))

  it('counts badges, because they are repeatable', async () => {
    render(<BadgesSection />)
    expect(await screen.findByTestId('badge-perfect_week')).toHaveTextContent('× 4')
    expect(screen.getByTestId('badge-on_target_week')).toHaveTextContent('× 2')
  })

  it('shows progress for a badge not yet earned', async () => {
    render(<BadgesSection />)
    expect(await screen.findByTestId('badge-golden_week')).toHaveTextContent('3 / 7 this week')
  })

  it('reports this week and the lifetime stats, best streak among them', async () => {
    render(<BadgesSection />)
    await screen.findByText(/this week:/)
    expect(screen.getByText('this week: 4 / 7 closed, 3 on target')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()     // days closed
    expect(screen.getByText('9')).toBeInTheDocument()      // best streak, More only
    expect(screen.getByText('perfect weeks')).toBeInTheDocument()
  })

  it('renders nothing at all if the endpoint fails, rather than an empty shell', async () => {
    getBadges.mockRejectedValue(new Error('offline'))
    const { container } = render(<BadgesSection />)
    // The rejection lands a tick after the call, so assert on the result, not the call.
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })
})

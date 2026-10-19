import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import WeightHistory from '@/pages/Weight/WeightHistory'
import { useWeightStore } from '@/store/weightStore'
import { useAuthStore } from '@/store/authStore'

// FF-0090: Progress shows the same "vs. Starting Weight" measurement as Home, and it must
// appear even when no goal weight is set (the old card hid itself in that case).

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}))
jest.mock('@/components/layout/PageTitleContext', () => ({
  usePageTitle: () => ({ setTitle: jest.fn(), setHeaderRightContent: jest.fn() }),
}))
jest.mock('@/store/weightStore', () => ({ useWeightStore: jest.fn() }))
// the real chart needs ResizeObserver, which jsdom lacks; the card under test is not the chart
jest.mock('@/components/charts/WeightChartWithGoal', () => ({
  __esModule: true,
  default: () => <div data-testid="chart" />,
}))
jest.mock('@/store/authStore', () => ({ useAuthStore: jest.fn() }))

const LOGS = [
  { id: '13', weight: 257.5, recorded_at: '2026-10-19T00:00:00', notes: null, photo_url: null },
  { id: '12', weight: 259.3, recorded_at: '2026-10-18T00:00:00', notes: null, photo_url: null },
  { id: '11', weight: 264.7, recorded_at: '2026-10-17T00:00:00', notes: null, photo_url: null },
]

function mount({ logs = LOGS, user = { weight_goal_lbs: 190, height: null } } = {}) {
  ;(useWeightStore as unknown as jest.Mock).mockReturnValue({
    logs,
    isLoading: false,
    error: null,
    fetchLogs: jest.fn(),
    deleteLog: jest.fn(),
  })
  ;(useAuthStore as unknown as jest.Mock).mockReturnValue({ user })

  return render(
    <MemoryRouter initialEntries={['/weight/history']}>
      <Routes>
        <Route path="/weight/history" element={<WeightHistory />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Progress vs starting weight (FF-0090)', () => {
  it('shows the change since the first weigh-in', () => {
    mount()

    expect(screen.getByText('vs. Starting Weight')).toBeInTheDocument()
    expect(screen.getByText(/since Oct 17/)).toBeInTheDocument()
    expect(screen.getByText(/-7\.2 lbs/)).toBeInTheDocument()
    expect(screen.getByText('-2.7%')).toBeInTheDocument()
  })

  it('shows it even with no goal weight set', () => {
    mount({ user: { weight_goal_lbs: null, height: null } })

    expect(screen.getByText('vs. Starting Weight')).toBeInTheDocument()
    expect(screen.queryByText('Distance to Goal')).not.toBeInTheDocument()
  })

  it('shows nothing for a single weigh-in', () => {
    mount({ logs: [LOGS[0]] })

    expect(screen.queryByText('vs. Starting Weight')).not.toBeInTheDocument()
  })

  it('dates the current weight when the newest entry is not today', () => {
    mount({ logs: LOGS.slice(1) })   // newest is Oct 18

    expect(screen.getByText('Weight (Oct 18)')).toBeInTheDocument()
    expect(screen.queryByText('Current Weight')).not.toBeInTheDocument()
  })
})

describe('same-day ordering on Progress (FF-0090)', () => {
  it('treats the later of two same-day weigh-ins as current', () => {
    // Both share a midnight timestamp, so only the id says which came second. The card must
    // agree with its own since-start figure.
    mount({
      logs: [
        { id: '1', weight: 264.7, recorded_at: '2026-10-19T00:00:00', notes: null, photo_url: null },
        { id: '2', weight: 257.5, recorded_at: '2026-10-19T00:00:00', notes: null, photo_url: null },
      ],
    })

    // the newest number appears in the summary card; the change must match it
    expect(screen.getAllByText('257.5 lbs').length).toBeGreaterThan(0)
    expect(screen.queryByText('264.7 lbs')).toBeTruthy()   // still listed as history
    expect(screen.getByText(/-7\.2 lbs/)).toBeInTheDocument()
  })
})

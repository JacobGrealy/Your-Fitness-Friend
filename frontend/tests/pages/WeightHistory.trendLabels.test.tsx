import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import WeightHistory from '@/pages/Weight/WeightHistory'

// FF-0138: the owner asked for the "last 7 days" caption and the trending/holding-steady
// verdict to come off the Progress page. The chart stays; those two labels must not return.

const entries = (weights: number[]) =>
  weights.map((weight, index) => ({
    id: String(index + 1),
    weight,
    recorded_at: `2026-09-${String(index + 1).padStart(2, '0')}T12:00:00`,
    notes: '',
  }))

let logs = entries([206, 207, 208])

jest.mock('@/store/weightStore', () => ({
  useWeightStore: () => ({ logs, isLoading: false, fetchLogs: jest.fn(), deleteLog: jest.fn() }),
}))
jest.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ user: { weight_goal_lbs: 190, weekly_goal: 'lose_1' } }),
}))
jest.mock('@/components/layout/PageTitleContext', () => ({
  usePageTitle: () => ({ setTitle: jest.fn(), setHeaderRightContent: jest.fn(), headerRightContent: null, centerContent: null }),
}))
jest.mock('@/components/charts/WeightChartWithGoal', () => ({
  __esModule: true,
  default: ({ data }: { data: { date: string; weight: number }[] }) => (
    <div data-testid="chart" data-dates={data.map(d => d.date.slice(0, 10)).join(',')} />
  ),
}))

const show = () => render(<MemoryRouter><WeightHistory /></MemoryRouter>)

describe('Progress page carries no trend labels (FF-0138)', () => {
  // Rising, falling and flat histories must all stay label-free: the old badge said
  // "trending up", "trending down" or "holding steady" depending on the data.
  const histories: [string, number[]][] = [
    ['rising', [206, 207, 208]],
    ['falling', [208, 207, 206]],
    ['flat', [207, 207, 207]],
  ]

  it.each(histories)('renders the chart but no caption or verdict for a %s history', (_name, weights) => {
    logs = entries(weights)
    show()
    expect(screen.getByTestId('chart')).toBeInTheDocument()
    expect(screen.queryByText(/last \d+ days/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/trending/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/holding steady/i)).not.toBeInTheDocument()
  })

  it('keeps the goal projection, which is not a trend verdict', () => {
    logs = entries([206, 207, 208])
    show()
    expect(screen.getByText('On track for')).toBeInTheDocument()
    expect(screen.getByText(/lb\/week/)).toBeInTheDocument()
  })
})

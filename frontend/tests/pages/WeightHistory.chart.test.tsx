import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import WeightHistory from '@/pages/Weight/WeightHistory'

// FF-0012 was reported as "the Progress weight chart's x-axis is reversed".
// The behaviour was already correct when it was checked (the API returns newest
// first and the page sorts ascending before charting), so this test locks the
// contract instead of leaving a visual bug that only someone eyeballing a chart
// would catch if it came back.

const logs = [
  { id: '3', weight: 208, recorded_at: '2026-09-22T12:00:00', notes: '' },
  { id: '2', weight: 207, recorded_at: '2026-09-08T12:00:00', notes: '' },
  { id: '1', weight: 206, recorded_at: '2026-09-01T12:00:00', notes: '' },
]

jest.mock('@/store/weightStore', () => ({
  useWeightStore: () => ({
    logs,
    isLoading: false,
    fetchLogs: jest.fn(),
    deleteLog: jest.fn(),
  }),
}))

jest.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ user: { weight_goal_lbs: 190, weekly_goal: 'lose_1' } }),
}))

jest.mock('@/components/layout/PageTitleContext', () => ({
  usePageTitle: () => ({ setTitle: jest.fn(), setHeaderRightContent: jest.fn(), headerRightContent: null, centerContent: null }),
}))

// Capture the data the page hands to the chart, in order.
jest.mock('@/components/charts/WeightChartWithGoal', () => ({
  __esModule: true,
  default: ({ data }: { data: { date: string; weight: number }[] }) => (
    <div data-testid="chart" data-dates={data.map((d) => d.date.slice(0, 10)).join(',')} />
  ),
}))

describe('Progress weight chart ordering (FF-0012)', () => {
  it('feeds the chart oldest-to-newest even though the API returns newest first', () => {
    render(
      <MemoryRouter>
        <WeightHistory />
      </MemoryRouter>
    )

    expect(screen.getByTestId('chart')).toHaveAttribute(
      'data-dates',
      '2026-09-01,2026-09-08,2026-09-22'
    )
  })

  it('still lists recent entries newest first', () => {
    render(
      <MemoryRouter>
        <WeightHistory />
      </MemoryRouter>
    )

    const dates = screen.getAllByText(/Sep \d{2}, 2026/).map((el) => el.textContent)
    expect(dates).toEqual(['Sep 22, 2026', 'Sep 08, 2026', 'Sep 01, 2026'])
  })
})

describe('Goal ETA on Progress (FF-0026)', () => {
  it('shows a projected date under the distance to goal', () => {
    render(
      <MemoryRouter>
        <WeightHistory />
      </MemoryRouter>
    )

    expect(screen.getByText('On track for')).toBeInTheDocument()
    // three weighed days, flat trend -> the weekly goal drives the projection
    expect(screen.getByText(/1\.0 lb\/week/)).toBeInTheDocument()
    expect(screen.getByText(/your goal/)).toBeInTheDocument()
  })
})

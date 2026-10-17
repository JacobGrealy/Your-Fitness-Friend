import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '@/pages/Dashboard'

// FF-0037: Today's Meals keyed its meal order on 'snacks' while the data is
// 'snack', so a snack was grouped and then filtered away - and the header total,
// summed from the rendered groups, was short by it.

const summary = {
  calories: { consumed: 780, goal: 2200, remaining: 1420, burned_exercise: 0 },
  meals: [
    { meal_type: 'breakfast', food_name: 'Oatmeal', calories: 300 },
    { meal_type: 'lunch', food_name: 'Chicken salad', calories: 420 },
    { meal_type: 'snack', food_name: 'Greek yogurt', calories: 60 },
  ],
  weight: { current: null, change_from_yesterday: null },
  exercise: { total_calories_burned: 0, total_minutes: 0, sessions: 0 },
}

jest.mock('@/store/dashboardStore', () => ({
  useDashboardStore: () => ({
    dailySummary: summary,
    weightTrend: [],
    isLoading: false,
    error: null,
    fetchDailySummary: jest.fn(),
    fetchWeightTrend: jest.fn(),
  }),
}))

jest.mock('@/components/charts', () => ({
  WeightTrendChart: () => <div data-testid="weight-chart" />,
}))

jest.mock('@/components/layout/PageTitleContext', () => ({
  usePageTitle: () => ({ setTitle: jest.fn(), setHeaderRightContent: jest.fn(), headerRightContent: null, centerContent: null }),
}))

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  )

describe("Today's Meals (FF-0037)", () => {
  it('lists snacks alongside the other meals', () => {
    renderDashboard()

    expect(screen.getByText('Breakfast')).toBeInTheDocument()
    expect(screen.getByText('Lunch')).toBeInTheDocument()
    expect(screen.getByText('Snacks')).toBeInTheDocument()
  })

  it('shows the snack item when the row is expanded', () => {
    renderDashboard()

    fireEvent.click(screen.getByText('Snacks'))

    expect(screen.getByText('Greek yogurt')).toBeInTheDocument()
  })

  it('counts snack calories in the section header', () => {
    renderDashboard()

    // 300 + 420 + 60 — the snack used to be missing from this figure too
    expect(screen.getByText('780 kcal')).toBeInTheDocument()
  })

  it('leaves out meal types with nothing logged', () => {
    renderDashboard()

    expect(screen.queryByText('Dinner')).not.toBeInTheDocument()
  })
})

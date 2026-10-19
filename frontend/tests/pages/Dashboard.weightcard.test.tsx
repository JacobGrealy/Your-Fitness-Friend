import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '@/pages/Dashboard'
import { useDashboardStore } from '@/store/dashboardStore'

// FF-0090: the card compares against the STARTING weigh-in and dates the current number,
// so it never implies "today" when the newest entry is older.

jest.mock('@/api/food', () => ({ foodApi: {} }))
jest.mock('@/api/dashboard', () => ({ dashboardApi: {} }))
jest.mock('@/store/dashboardStore', () => ({
  useDashboardStore: jest.fn(),
}))
jest.mock('@/api/auth', () => ({ authApi: {} }))
jest.mock('@/api/diary', () => ({
  diaryApi: {
    getStreaks: jest.fn(async () => null),
    getWeek: jest.fn(async () => null),
    getCompletion: jest.fn(async () => ({ status: 'open', message: '', totals: null, projection: null })),
  },
}))
jest.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ user: null }),
}))

// the diary summary and the weight trend both come from the dashboard store
jest.mock('@/store/foodStore', () => ({ useFoodStore: () => ({}) }))

jest.mock('@/store/uiStore', () => ({
  useUIStore: () => ({ showToast: jest.fn() }),
}))
jest.mock('@/components/layout/PageTitleContext', () => ({
  usePageTitle: () => ({ setTitle: jest.fn() }),
}))

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function foodStore(weight: Record<string, unknown>) {
  return {
    dailySummary: summaryWith(weight),
    fetchDailySummary: jest.fn(),
    weightTrend: [],
    fetchWeightTrend: jest.fn(),
    foodLogs: [],
    error: null,
    isLoading: false,
  }
}

function summaryWith(weight: Record<string, unknown>) {
  return {
    date: today(),
    calories: { consumed: 0, goal: 2000, remaining: 2000, burned_exercise: 0 },
    macros: {
      protein: { consumed: 0, goal: 150 },
      carbs: { consumed: 0, goal: 200 },
      fat: { consumed: 0, goal: 60 },
    },
    weight,
    exercises: [],
    meals: [],
  }
}

describe('Home weight card (FF-0090)', () => {
  beforeEach(() => {
    ;(useDashboardStore as unknown as jest.Mock).mockReturnValue(foodStore({
      current: 257.5,
      current_date: today(),
      start: 264.7,
      start_date: '2026-10-17',
      change_from_start: -7.2,
      change_from_yesterday: -1.8,
      change_from_week_ago: null,
    }))
  })

  it('compares against the starting weight, not yesterday', () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>)

    expect(screen.getByText('vs. Starting Weight')).toBeInTheDocument()
    expect(screen.queryByText(/vs\. Yesterday/i)).not.toBeInTheDocument()
    expect(screen.getByText('-7.2 lbs')).toBeInTheDocument()
    expect(screen.getByText(/since Oct 17/)).toBeInTheDocument()
  })

  it('says Current Weight when the newest weigh-in is today', () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    expect(screen.getByText('Current Weight')).toBeInTheDocument()
  })

  it('dates the number when the newest weigh-in is older', () => {
    ;(useDashboardStore as unknown as jest.Mock).mockReturnValue(foodStore({
      current: 257.5,
      current_date: '2026-10-17',
      start: 270.0,
      start_date: '2026-10-10',
      change_from_start: -12.5,
      change_from_yesterday: null,
      change_from_week_ago: null,
    }))

    render(<MemoryRouter><Dashboard /></MemoryRouter>)

    expect(screen.queryByText('Current Weight')).not.toBeInTheDocument()
    expect(screen.getByText('Weight (Oct 17)')).toBeInTheDocument()
  })

  it('shows no comparison when there is only one weigh-in', () => {
    ;(useDashboardStore as unknown as jest.Mock).mockReturnValue(foodStore({
      current: 257.5,
      current_date: today(),
      start: 257.5,
      start_date: today(),
      change_from_start: null,
      change_from_yesterday: null,
      change_from_week_ago: null,
    }))

    render(<MemoryRouter><Dashboard /></MemoryRouter>)

    expect(screen.getByText('Current Weight')).toBeInTheDocument()
    expect(screen.queryByText('vs. Starting Weight')).not.toBeInTheDocument()
  })
})

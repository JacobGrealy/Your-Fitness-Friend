import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Profile from '@/pages/Profile'

// The page now asks the diary API for the week strip (FF-0072); the axios client it
// imports uses import.meta.env, which jest cannot parse.
jest.mock('@/api/diary', () => ({
  diaryApi: {
    getCompletion: jest.fn(() => Promise.resolve({
      date: '2026-10-18',
      completed: false,
      streaks: { closed_days: 0, within_goal_days: 0, closed_today: false, within_goal_today: false, tolerance_pct: 10 },
      week: {
        start: '2026-10-11',
        end: '2026-10-17',
        days: [
          { date: '2026-10-11', state: 'missed' }, { date: '2026-10-12', state: 'missed' },
          { date: '2026-10-13', state: 'missed' }, { date: '2026-10-14', state: 'missed' },
          { date: '2026-10-15', state: 'missed' }, { date: '2026-10-16', state: 'missed' },
          { date: '2026-10-17', state: 'open' },
        ],
        closed: 0,
        on_target: 0,
      },
    })),
    getBadges: jest.fn(() => Promise.resolve({
      week: { start: '2026-10-11', end: '2026-10-17', days: [], closed: 0, on_target: 0 },
      badges: [],
      stats: { days_closed: 0, best_streak: 0 },
    })),
    complete: jest.fn(),
    undo: jest.fn(),
  },
}))


// FF-0011: the Account and Help rows of the More page used to be dead tap
// targets. They now open real sheets instead of silently doing nothing.

// Reminder lifecycle HTTP/native wiring has its own integration tests.
jest.mock('@/reminderLifecycle', () => ({
  refreshReminderSchedule: jest.fn(async () => 'unsupported'),
}))

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

jest.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 1,
      email: 'someone@example.test',
      username: 'someone@example.test',
      daily_calorie_goal: 2000,
      height: 180.34,
      weight: 85,
      age: 34,
      gender: 'male',
      activity_level: 'moderate',
      weekly_goal: 'maintain',
      bmr: 1790,
      tdee: 2775,
      created_at: '2026-01-01T00:00:00Z',
    },
    logout: jest.fn(),
    checkAuth: () => checkAuth(),
    updateUser: jest.fn(),
  }),
}))

jest.mock('@/components/layout/PageTitleContext', () => ({
  usePageTitle: () => ({ setTitle: jest.fn(), setHeaderRightContent: jest.fn(), headerRightContent: null, centerContent: null }),
}))

const updateProfile = jest.fn()
const checkAuth = jest.fn()

jest.mock('@/api/auth', () => ({
  authApi: {
    getProfile: jest.fn().mockResolvedValue({}),
    updateProfile: (...args: unknown[]) => updateProfile(...args),
    uploadProfilePhoto: jest.fn(),
    deleteProfilePhoto: jest.fn(),
  },
}))

jest.mock('@/api/weight', () => ({
  weightApi: { getWeightLogs: jest.fn().mockResolvedValue([]) },
}))

jest.mock('@/api/app', () => ({
  getAppRelease: jest.fn().mockResolvedValue(null),
}))

jest.mock('@/native', () => ({
  getRunningAppVersion: jest.fn().mockResolvedValue(null),
  isUpdateAvailable: () => false,
  openExternalUrl: jest.fn(),
}))

describe('More page rows (FF-0011)', () => {
  const renderPage = () =>
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    )

  it('Help opens a Help & About sheet', async () => {
    renderPage()

    fireEvent.click(screen.getByText('Help'))

    await waitFor(() => expect(screen.getByText('Help & About')).toBeInTheDocument())
    expect(screen.getByText('Logging food')).toBeInTheDocument()
  })

  it('Account opens the edit-profile sheet', async () => {
    renderPage()

    fireEvent.click(screen.getByText('Account'))

    await waitFor(() => expect(screen.getByText(/edit profile/i)).toBeInTheDocument())
  })
})

describe('Calorie goal editing (FF-0017)', () => {
  const renderPage = () =>
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    )

  beforeEach(() => {
    updateProfile.mockReset().mockResolvedValue({})
    checkAuth.mockReset().mockResolvedValue(undefined)
  })

  it('opens an editor from the Calorie Goal row', async () => {
    renderPage()

    fireEvent.click(screen.getByText('Calorie Goal'))

    await waitFor(() => expect(screen.getByText('Daily Calorie Goal')).toBeInTheDocument())
    expect(screen.getByPlaceholderText('e.g. 2200')).toHaveValue(2000)
  })

  it('saves a typed goal through the profile endpoint', async () => {
    renderPage()

    fireEvent.click(screen.getByText('Calorie Goal'))
    await waitFor(() => expect(screen.getByPlaceholderText('e.g. 2200')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('e.g. 2200'), { target: { value: '2350' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({ daily_calorie_goal: 2350 })
    )
    expect(checkAuth).toHaveBeenCalled()
  })

  it('refuses a goal outside the accepted range', async () => {
    renderPage()

    fireEvent.click(screen.getByText('Calorie Goal'))
    await waitFor(() => expect(screen.getByPlaceholderText('e.g. 2200')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('e.g. 2200'), { target: { value: '12000' } })

    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled()
  })
})

// FF-0022 asked for a height field on the profile. It was already there end to
// end (model column, registration payload, cm <-> ft/in conversion, display and
// edit), so this pins the two halves a regression would break first.
describe('Height on the profile (FF-0022)', () => {
  const renderPage = () =>
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    )

  it('shows the stored height as feet and inches', () => {
    renderPage()

    expect(screen.getByText('Height')).toBeInTheDocument()
    expect(screen.getByText(`5' 11"`)).toBeInTheDocument()
  })

  it('can be edited from the profile sheet', async () => {
    renderPage()

    fireEvent.click(screen.getByText('Account'))

    await waitFor(() => expect(screen.getByPlaceholderText('Ft')).toHaveValue(5))
    expect(screen.getByPlaceholderText('In')).toHaveValue(11)
  })
})

// FF-0023 / FF-0024 / FF-0025: the calorie model (BMR, TDEE, weekly goal) is
// entirely backend-driven and was already surfaced on this page. These pin the
// three rows a regression would silently blank.
describe('Calorie model rows (FF-0023/0024/0025)', () => {
  const renderPage = () =>
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    )

  it('shows BMR and TDEE', () => {
    renderPage()

    expect(screen.getByText('1,790 kcal/day')).toBeInTheDocument()
    expect(screen.getByText('2,775 kcal/day')).toBeInTheDocument()
  })

  it('offers the weekly goal choices', async () => {
    renderPage()

    fireEvent.click(screen.getByText('Weekly Goal'))

    await waitFor(() => expect(screen.getAllByText('Lose 1 lb/wk').length).toBeGreaterThan(0))
    expect(screen.getAllByText('Maintain').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Lose 2 lb/wk').length).toBeGreaterThan(0)
  })
})

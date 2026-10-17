import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Profile from '@/pages/Profile'

// FF-0011: the Account and Help rows of the More page used to be dead tap
// targets. They now open real sheets instead of silently doing nothing.

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

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
      created_at: '2026-01-01T00:00:00Z',
    },
    logout: jest.fn(),
    checkAuth: jest.fn(),
    updateUser: jest.fn(),
  }),
}))

jest.mock('@/components/layout/PageTitleContext', () => ({
  usePageTitle: () => ({ setTitle: jest.fn(), setHeaderRightContent: jest.fn(), headerRightContent: null, centerContent: null }),
}))

jest.mock('@/api/auth', () => ({
  authApi: {
    getProfile: jest.fn().mockResolvedValue({}),
    updateProfile: jest.fn(),
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

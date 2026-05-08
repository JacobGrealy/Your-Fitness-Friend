const mockApi = {
  post: jest.fn(),
  get: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
}

jest.mock('@/api/client', () => ({
  __esModule: true,
  default: mockApi,
  api: mockApi,
}))

jest.mock('@/store/authStore', () => ({
  useAuthStore: jest.fn(),
}))

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithRouter } from '../utils'
import Login from '@/pages/Auth/Login'
import { useAuthStore } from '@/store/authStore'

const mockLogin = jest.fn()
const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

describe('Login page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLogin.mockResolvedValue(undefined)
    ;(useAuthStore as jest.Mock).mockReturnValue({
      login: mockLogin,
      error: null,
      isLoading: false,
    })
  })

  describe('renders login form', () => {
    it('displays welcome heading', async () => {
      renderWithRouter(<Login />)
      await waitFor(() => {
        expect(screen.getByText('Welcome back')).toBeInTheDocument()
      })
    })

    it('displays email field', async () => {
      renderWithRouter(<Login />)
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
      })
    })

    it('displays password field', async () => {
      renderWithRouter(<Login />)
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
      })
    })
  })

  describe('shows validation errors for empty fields', () => {
    it('shows password validation error when submitting empty form', async () => {
      renderWithRouter(<Login />)
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /sign in/i })
        fireEvent.click(submitButton)
      })
    })
  })

  describe('shows error message on login failure', () => {
    it('displays error when login fails', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid credentials'))
      ;(useAuthStore as jest.Mock).mockReturnValue({
        login: mockLogin,
        error: 'Invalid credentials',
        isLoading: false,
      })

      renderWithRouter(<Login />)

      await waitFor(() => {
        const emailInput = screen.getByPlaceholderText('Enter your email')
        const passwordInput = screen.getByPlaceholderText('Enter your password')
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
      })

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })
    })
  })

  describe('navigates to dashboard on success', () => {
    it('calls navigate after successful login', async () => {
      ;(useAuthStore as jest.Mock).mockReturnValue({
        login: mockLogin,
        error: null,
        isLoading: false,
      })

      renderWithRouter(<Login />)

      await waitFor(() => {
        const emailInput = screen.getByPlaceholderText('Enter your email')
        const passwordInput = screen.getByPlaceholderText('Enter your password')
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
      })

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
      })
    })
  })
})

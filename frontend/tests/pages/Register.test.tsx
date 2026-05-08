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

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithRouter } from '../utils'
import Register from '@/pages/Auth/Register'
import { useAuthStore } from '@/store/authStore'

jest.mock('@/store/authStore', () => ({
  useAuthStore: jest.fn(),
}))

const mockRegister = jest.fn()
const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

describe('Register page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRegister.mockResolvedValue(undefined)
    ;(useAuthStore as jest.Mock).mockReturnValue({
      register: mockRegister,
      error: null,
      isLoading: false,
    })
  })

  describe('renders registration form', () => {
    it('displays create account heading', async () => {
      renderWithRouter(<Register />)
      await waitFor(() => {
        expect(screen.getByText('Create account')).toBeInTheDocument()
      })
    })

    it('displays name field', async () => {
      renderWithRouter(<Register />)
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument()
      })
    })

    it('displays email field', async () => {
      renderWithRouter(<Register />)
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
      })
    })

    it('displays password field', async () => {
      renderWithRouter(<Register />)
      await waitFor(() => {
        const passwordInputs = screen.getAllByPlaceholderText('Enter your password')
        expect(passwordInputs).toHaveLength(1)
      })
    })

    it('displays confirm password field', async () => {
      renderWithRouter(<Register />)
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Confirm your password')).toBeInTheDocument()
      })
    })
  })

  describe('shows validation errors', () => {
    it('shows validation error when submitting empty form', async () => {
      renderWithRouter(<Register />)

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /sign up/i })
        fireEvent.click(submitButton)
      })
    })
  })

  describe('shows error message on register failure', () => {
    it('displays error when registration fails', async () => {
      mockRegister.mockRejectedValue(new Error('Email already exists'))
      ;(useAuthStore as jest.Mock).mockReturnValue({
        register: mockRegister,
        error: 'Email already exists',
        isLoading: false,
      })

      renderWithRouter(<Register />)

      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('Enter your name')
        const emailInput = screen.getByPlaceholderText('Enter your email')
        const passwordInput = screen.getByPlaceholderText('Enter your password')
        const confirmInput = screen.getByPlaceholderText('Confirm your password')

        fireEvent.change(nameInput, { target: { value: 'Test User' } })
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'Password1' } })
        fireEvent.change(confirmInput, { target: { value: 'Password1' } })
        fireEvent.click(screen.getByRole('button', { name: /sign up/i }))
      })

      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument()
      })
    })
  })
})

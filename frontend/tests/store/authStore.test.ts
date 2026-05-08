import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'

jest.mock('@/api/auth', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  },
}))

jest.mock('@/api/client', () => ({
  default: {
    post: jest.fn(),
    get: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
  api: {
    post: jest.fn(),
    get: jest.fn(),
  },
}))

describe('authStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
  })

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('login success', () => {
    it('sets user, token, and isAuthenticated on success', async () => {
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test', created_at: '2024-01-01' }
      const mockToken = 'test-token'
      ;(authApi.login as jest.Mock).mockResolvedValue({ data: { token: mockToken, user: mockUser } })

      await useAuthStore.getState().login('test@example.com', 'password123')

      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.token).toBe(mockToken)
      expect(state.isAuthenticated).toBe(true)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('login failure', () => {
    it('sets error and isLoading false on failure', async () => {
      const error = { response: { data: { message: 'Invalid credentials' } } }
      ;(authApi.login as jest.Mock).mockRejectedValue(error)

      await useAuthStore.getState().login('test@example.com', 'wrong')

      const state = useAuthStore.getState()
      expect(state.error).toBe('Invalid credentials')
      expect(state.isLoading).toBe(false)
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('register success', () => {
    it('sets user, token, and isAuthenticated on success', async () => {
      const mockUser = { id: '2', email: 'new@example.com', name: 'New User', created_at: '2024-01-02' }
      const mockToken = 'new-token'
      ;(authApi.register as jest.Mock).mockResolvedValue({ data: { token: mockToken, user: mockUser } })

      await useAuthStore.getState().register('new@example.com', 'password123', 'New User')

      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.token).toBe(mockToken)
      expect(state.isAuthenticated).toBe(true)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('logout', () => {
    it('clears user, token, and isAuthenticated', async () => {
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', name: 'Test', created_at: '2024-01-01' },
        token: 'test-token',
        isAuthenticated: true,
      })

      await useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.error).toBeNull()
    })

    it('clears state even if logout API fails', async () => {
      ;(authApi.logout as jest.Mock).mockRejectedValue(new Error('Network error'))
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', name: 'Test', created_at: '2024-01-01' },
        token: 'test-token',
        isAuthenticated: true,
      })

      await useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('clearError', () => {
    it('clears the error message', () => {
      useAuthStore.setState({ error: 'Some error' })
      expect(useAuthStore.getState().error).toBe('Some error')

      useAuthStore.getState().clearError()

      expect(useAuthStore.getState().error).toBeNull()
    })
  })
})

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

import { authApi } from '@/api/auth'
import { api } from '@/api/client'

const mockPost = api.post as jest.Mock
const mockGet = api.get as jest.Mock

describe('authApi', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('login', () => {
    it('makes correct POST request', async () => {
      const mockResponse = { data: { token: 'test-token', user: { id: '1', email: 'test@example.com', name: 'Test', created_at: '2024-01-01' } } }
      mockPost.mockResolvedValue(mockResponse)

      const result = await authApi.login({ email: 'test@example.com', password: 'password123' })

      expect(mockPost).toHaveBeenCalledWith('/auth/login', { email: 'test@example.com', password: 'password123' })
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('register', () => {
    it('makes correct POST request', async () => {
      const mockResponse = { data: { token: 'test-token', user: { id: '1', email: 'test@example.com', name: 'Test', created_at: '2024-01-01' } } }
      mockPost.mockResolvedValue(mockResponse)

      const result = await authApi.register({ email: 'test@example.com', password: 'password123', name: 'Test' })

      expect(mockPost).toHaveBeenCalledWith('/auth/register', { email: 'test@example.com', password: 'password123', name: 'Test' })
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('logout', () => {
    it('makes correct POST request', async () => {
      mockPost.mockResolvedValue({ data: {} })

      await authApi.logout()

      expect(mockPost).toHaveBeenCalledWith('/auth/logout')
    })
  })

  describe('getProfile', () => {
    it('makes correct GET request', async () => {
      const mockProfile = { id: '1', email: 'test@example.com', name: 'Test', created_at: '2024-01-01' }
      mockGet.mockResolvedValue({ data: mockProfile })

      const result = await authApi.getProfile()

      expect(mockGet).toHaveBeenCalledWith('/auth/profile')
      expect(result).toEqual(mockProfile)
    })
  })
})

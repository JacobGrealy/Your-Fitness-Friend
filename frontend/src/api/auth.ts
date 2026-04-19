import api from './client'
import { LoginCredentials, RegisterData, UserProfile } from './types'

export const authApi = {
  login: async (credentials: LoginCredentials) => {
    const response = await api.post('/auth/login', credentials)
    return response.data
  },

  register: async (data: RegisterData) => {
    const response = await api.post('/auth/register', data)
    return response.data
  },

  logout: async () => {
    await api.post('/auth/logout')
  },

  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get('/auth/profile')
    return response.data
  },
}

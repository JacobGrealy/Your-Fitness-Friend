import api from './client'
import { LoginCredentials, RegisterData, UserProfile } from './types'

export const authApi = {
  login: async (credentials: LoginCredentials, remember = true) => {
    // remember -> Flask-Login's remember_token. Without it the phone has to be
    // re-authenticated every launch, because an Android WebView drops session
    // cookies when the app process dies (FF-0043).
    const response = await api.post('/auth/login', { ...credentials, remember })
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

  updateProfile: async (data: Partial<UserProfile>): Promise<UserProfile> => {
    const response = await api.put('/auth/profile', data)
    return response.data
  },

  uploadProfilePhoto: async (formData: FormData) => {
    const response = await api.post('/auth/profile-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  deleteProfilePhoto: async () => {
    const response = await api.delete('/auth/profile-photo')
    return response.data
  },
}

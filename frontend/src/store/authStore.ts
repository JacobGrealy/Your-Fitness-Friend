import { create } from 'zustand'
import { authApi } from '@/api/auth'
import { UserProfile } from '@/api/types'

interface AuthState {
  user: UserProfile | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authApi.login({ email, password })
      const { token, user } = response.data
      localStorage.setItem('token', token)
      set({ 
        token, 
        user,
        isAuthenticated: true,
        isLoading: false 
      })
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Login failed',
        isLoading: false 
      })
      throw error
    }
  },

  register: async (email: string, password: string, name: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authApi.register({ email, password, name })
      const { token, user } = response.data
      localStorage.setItem('token', token)
      set({ 
        token, 
        user,
        isAuthenticated: true,
        isLoading: false 
      })
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Registration failed',
        isLoading: false 
      })
      throw error
    }
  },

  logout: async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      set({ 
        user: null, 
        token: null, 
        isAuthenticated: false,
        error: null 
      })
    }
  },

  clearError: () => set({ error: null }),
}))

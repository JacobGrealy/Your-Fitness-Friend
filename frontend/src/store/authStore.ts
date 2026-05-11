import { create } from 'zustand'
import { authApi } from '@/api/auth'
import { UserProfile } from '@/api/types'

interface AuthState {
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  checkAuth: async () => {
    if (get().isLoading) return
    set({ isLoading: true })
    try {
      const user = await authApi.getProfile()
      set({ user, isAuthenticated: true, isLoading: false })
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authApi.login({ email, password })
      set({ user: response.user, isAuthenticated: true, isLoading: false })
    } catch (error: any) {
      set({ 
        error: error.response?.data?.error || 'Login failed',
        isLoading: false 
      })
    }
  },

  register: async (email: string, password: string, name: string) => {
    set({ isLoading: true, error: null })
    try {
      await authApi.register({ email, password, name })
      set({ isLoading: false })
    } catch (error: any) {
      set({ 
        error: error.response?.data?.error || 'Registration failed',
        isLoading: false 
      })
    }
  },

  logout: async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      set({ 
        user: null, 
        isAuthenticated: false,
        error: null
      })
    }
  },

  clearError: () => set({ error: null }),
}))

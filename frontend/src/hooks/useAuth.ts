import { useAuthStore } from '@/store/authStore'

export function useAuth() {
  const { isAuthenticated, user, isLoading, login, register, logout, clearError } = useAuthStore()

  return {
    isAuthenticated,
    user,
    isLoading,
    login,
    register,
    logout,
    clearError,
  }
}

import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Loading from '@/components/common/Loading'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loading text="Loading..." />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }

  return <>{children}</>
}

export default AuthGuard

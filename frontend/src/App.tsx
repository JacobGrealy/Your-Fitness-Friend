import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useAuthStore } from './store/authStore'
import { useEffect, useRef } from 'react'
import { startReminderSync } from './reminderLifecycle'
import { clearReminders } from './notifications'

// Call checkAuth at module load time, before React renders
useAuthStore.getState().checkAuth()

function App() {
  const isLoading = useAuthStore((s) => s.isLoading)
  const userId = useAuthStore(s => s.isAuthenticated && s.user ? String(s.user.id) : null)
  const previousUser = useRef<string | null>(null)
  useEffect(() => {
    if (previousUser.current && previousUser.current !== userId) void clearReminders()
    previousUser.current = userId
    return userId ? startReminderSync(userId) : undefined
  }, [userId])

  // Block route rendering until auth is verified
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content/60">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return <RouterProvider router={router} />
}

export default App

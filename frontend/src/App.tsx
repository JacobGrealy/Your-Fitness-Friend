import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useAuthStore } from './store/authStore'

// Call checkAuth at module load time, before React renders
useAuthStore.getState().checkAuth()

function App() {
  const hasChecked = useAuthStore((s) => s.hasChecked)

  // Block route rendering until auth is verified
  if (!hasChecked) {
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

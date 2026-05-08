import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface HeaderProps {
  title?: string
  showBack?: boolean
  onBack?: () => void
  rightContent?: React.ReactNode
}

export default function Header({
  title = 'FitnessFriend',
  showBack = false,
  onBack,
  rightContent,
}: HeaderProps) {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuthStore()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-base-100 shadow-sm hidden sm:flex">
      <div className="flex items-center justify-between w-full px-6 py-3 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={handleBack}
              className="btn btn-ghost btn-sm btn-square"
              aria-label="Go back"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
          <h1 className="text-lg font-bold text-primary">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          {rightContent || (
            isAuthenticated && user ? (
              <div className="dropdown dropdown-end">
                <div
                  tabIndex={0}
                  role="button"
                  className="btn btn-ghost btn-circle avatar"
                >
                  <div className="w-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary text-sm font-bold">
                      {(user.username || user.email || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <ul
                  tabIndex={0}
                  className="dropdown-content menu menu-sm bg-base-100 rounded-box z-50 w-40 p-2 shadow-lg border border-base-300 mt-2"
                >
                  <li>
                    <button
                      onClick={() => navigate('/profile')}
                      className="text-base-content"
                    >
                      Profile
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        logout()
                        navigate('/auth/login')
                      }}
                      className="text-error"
                    >
                      Logout
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <button
                onClick={() => navigate('/auth/login')}
                className="btn btn-sm btn-primary"
              >
                Login
              </button>
            )
          )}
        </div>
      </div>
    </header>
  )
}

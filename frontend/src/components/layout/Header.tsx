import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { subDays, addDays, isToday, format } from 'date-fns'
import { useAuthStore } from '@/store/authStore'

interface HeaderProps {
  title?: string
  showBack?: boolean
  onBack?: () => void
  rightContent?: React.ReactNode
  showDateNav?: boolean
}

export default function Header({
  title = 'FitnessFriend',
  showBack = false,
  onBack,
  rightContent,
  showDateNav = false,
}: HeaderProps) {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuthStore()
  const [currentDate, setCurrentDate] = useState(new Date())

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }

  const handlePrevDay = () => {
    setCurrentDate((prev) => subDays(prev, 1))
  }

  const handleNextDay = () => {
    setCurrentDate((prev) => {
      if (isToday(prev)) return prev
      return addDays(prev, 1)
    })
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const formatDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today'
    return format(date, 'MMM d')
  }

  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#185ADB]">
      <div className="flex items-center justify-between w-full px-4 py-2 max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          {showBack && (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors"
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
        </div>

        <h1 className="text-lg font-bold text-white absolute left-1/2 -translate-x-1/2">{title}</h1>

        <div className="flex items-center gap-1">
          {rightContent || (
            isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm hover:bg-white/30 transition-colors"
                  aria-label="User menu"
                >
                  {(user.username || user.email || '?').charAt(0).toUpperCase()}
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 w-32 overflow-hidden z-50">
                    <button
                      onClick={() => {
                        setDropdownOpen(false)
                        navigate('/profile')
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        setDropdownOpen(false)
                        logout()
                        navigate('/auth/login')
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => navigate('/auth/login')}
                className="px-3 py-1.5 text-sm font-medium text-white bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              >
                Login
              </button>
            )
          )}
        </div>
      </div>

      {showDateNav && (
        <div className="flex items-center justify-center gap-4 py-2 bg-[#185ADB] border-t border-white/10">
          <button
            onClick={handlePrevDay}
            className="p-1 text-white hover:bg-white/10 rounded-full transition-colors"
            aria-label="Previous day"
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
          <button
            onClick={handleToday}
            className="px-3 py-1 text-sm font-medium text-white hover:bg-white/10 rounded-full transition-colors"
          >
            {formatDateLabel(currentDate)}
          </button>
          <button
            onClick={handleNextDay}
            className="p-1 text-white hover:bg-white/10 rounded-full transition-colors"
            aria-label="Next day"
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      )}
    </header>
  )
}

import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useCallback } from 'react'
import FABModal from './FABModal'

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const [fabOpen, setFabOpen] = useState(false)

  const tabs = [
    {
      label: 'Home',
      path: '/dashboard',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      label: 'Diary',
      path: '/food/daily',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      label: null,
      path: null,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      isAdd: true,
    },
    {
      label: 'Progress',
      path: '/weight/history',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      label: 'More',
      path: '/profile',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
      ),
    },
  ]

  const isActive = useCallback((path: string) => {
    if (!path) return false
    if (path === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/'
    return location.pathname.startsWith(path)
  }, [location.pathname])

 return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#f2f2f2] border-t border-gray-200 sm:hidden">
        <div className="grid grid-cols-5 items-center px-2 py-1">
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => {
                if (tab.isAdd) {
                  setFabOpen(true)
                } else if (tab.path) {
                  navigate(tab.path)
                }
              }}
              className={`flex flex-col items-center justify-center transition-colors ${
                isActive(tab.path!)
                  ? 'text-[#185ADB]'
                  : 'text-[#757575] hover:text-[#212121]'
              }`}
              aria-label={tab.isAdd ? 'Add log' : (tab.label ?? '')}
            >
              {tab.isAdd ? (
                <div className="w-12 h-12 rounded-full bg-[#185ADB] text-white flex items-center justify-center shadow-lg">
                  {tab.icon}
                </div>
              ) : (
                <>
                  <span className="w-6 h-6">{tab.icon}</span>
                  {tab.label && <span className="text-[10px] font-medium">{tab.label}</span>}
                </>
              )}
            </button>
          ))}
        </div>
      </nav>
      <FABModal isOpen={fabOpen} onClose={() => setFabOpen(false)} />
    </>
  )
}

import { useNavigate, useLocation } from 'react-router-dom'
import { useMemo } from 'react'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

interface BottomNavProps {
  items: NavItem[]
}

export default function BottomNav({ items }: BottomNavProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = useMemo(() => {
    return (path: string) => {
      if (path === '/') return location.pathname === '/' || location.pathname === '/dashboard'
      return location.pathname.startsWith(path)
    }
  }, [location.pathname])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-base-100 border-t border-base-300 sm:hidden">
      <div className="flex justify-around items-center px-2 py-1">
        {items.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-lg transition-colors min-w-[56px] ${
              isActive(item.path)
                ? 'text-primary'
                : 'text-base-content/50 hover:text-base-content'
            }`}
            aria-label={item.label}
          >
            <span className="w-6 h-6">{item.icon}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

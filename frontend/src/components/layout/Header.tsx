import { useNavigate } from 'react-router-dom'
import { usePageTitle } from './PageTitleContext'

interface HeaderProps {
  title?: string
  showBack?: boolean
  onBack?: () => void
  leftContent?: React.ReactNode
  centerContent?: React.ReactNode
  rightContent?: React.ReactNode
  className?: string
}

export default function Header({
  title: propTitle,
  showBack = false,
  onBack,
  leftContent,
  centerContent,
  rightContent,
  className,
}: HeaderProps) {
  const { title: contextTitle, headerRightContent: contextRight, centerContent: contextCenter } = usePageTitle()
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 bg-[#185ADB] shadow-md border-b border-black/10 pt-[env(safe-area-inset-top)] ${className ?? ''}`}>
      <div className="flex items-center w-full px-3 py-2 max-w-4xl mx-auto min-h-[48px] relative">
        {/* Left: Logo or back button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {leftContent ?? (
            showBack ? (
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
            ) : (
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1.5 p-1 -ml-1 text-white hover:bg-white/10 rounded-lg transition-colors sm:hidden"
                aria-label="Go to home"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="text-sm font-semibold">FitnessFriend</span>
              </button>
            )
          )}
        </div>

        {/* Center: Page title, absolutely centered */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1">
          {centerContent || contextCenter || (
            <h1 className="text-lg font-bold text-white whitespace-nowrap">{propTitle || contextTitle}</h1>
          )}
        </div>

        {/* Right: spacer to balance logo + actual right content */}
        <div className="flex items-center gap-1 w-[110px] justify-end">
          {rightContent || contextRight}
        </div>
      </div>
    </header>
  )
}

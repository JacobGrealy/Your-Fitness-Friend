import { useNavigate } from 'react-router-dom'
import { usePageTitle } from './PageTitleContext'

interface HeaderProps {
  title?: string
  showBack?: boolean
  onBack?: () => void
  leftContent?: React.ReactNode
  centerContent?: React.ReactNode
  rightContent?: React.ReactNode
}

export default function Header({
  title: propTitle,
  showBack = false,
  onBack,
  leftContent,
  centerContent,
  rightContent,
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
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#185ADB] shadow-md">
      <div className="flex items-center justify-between w-full px-4 py-2 max-w-4xl mx-auto min-h-[48px]">
        <div className="flex items-center gap-2">
          {leftContent ?? (
            showBack && (
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
            )
          )}
        </div>

        <div className="flex items-center gap-1">
          {centerContent || contextCenter || (
            <h1 className="text-lg font-bold text-white">{propTitle || contextTitle}</h1>
          )}
        </div>

        <div className="flex items-center gap-1">
          {rightContent || contextRight}
        </div>
      </div>
    </header>
  )
}

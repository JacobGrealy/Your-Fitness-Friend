import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

interface FABModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FABModal({ isOpen, onClose }: FABModalProps) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const options = [
    {
      label: 'Log Food',
      path: '/food/log',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v4m0 0v6m0-6H6m6 0h6M4 10h16M5 16h14a1 1 0 001-1V9a1 1 0 00-1-1H5a1 1 0 00-1 1v6a1 1 0 001 1z" />
        </svg>
      ),
    },
    {
      label: 'Log Weight',
      path: '/weight/log',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      ),
    },
    {
      label: 'Log Exercise',
      path: '/exercise/log',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      label: 'Log Food Photo',
      path: '/food/photo-log',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ]

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 sm:bg-black/30"
        onClick={onClose}
      />
      <div className="fixed z-50 bottom-20 left-1/2 -translate-x-1/2 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white rounded-2xl shadow-xl p-4 w-72 sm:w-80" role="dialog" aria-modal="true">
        <div className="flex flex-col gap-2">
          {options.map((option) => (
            <button
              key={option.path}
              onClick={() => {
                navigate(option.path)
                onClose()
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
            >
              <span className="text-[#185ADB]">{option.icon}</span>
              <span className="text-[#212121] font-medium text-base">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

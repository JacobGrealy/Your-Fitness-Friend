import { format, isToday, addDays, subDays } from 'date-fns'

interface DiaryDateSelectorProps {
  date: Date
  onChange: (date: Date) => void
  /** 'header' sits on the blue top bar; 'inline' sits in the page body. */
  variant?: 'header' | 'inline'
}

export function formatDateLabel(date: Date): string {
  if (isToday(date)) return 'Today'
  return format(date, 'MMM d')
}

/**
 * The diary's date control (FF-0019).
 *
 * Rendered twice on purpose: in the mobile top bar, and inline in the page for
 * widths where the mobile header is hidden (the landscape phone and desktop
 * layouts use the sidebar instead). Before this, landscape had no way to change
 * the day at all.
 */
export default function DiaryDateSelector({ date, onChange, variant = 'header' }: DiaryDateSelectorProps) {
  const header = variant === 'header'

  const buttonClass = header
    ? 'p-0.5 text-white hover:bg-white/10 rounded-full transition-colors'
    : 'p-1.5 text-[#185ADB] hover:bg-[#185ADB]/10 rounded-full transition-colors'

  const labelClass = header
    ? 'px-2 py-0.5 text-base font-bold text-white hover:bg-white/10 rounded-full transition-colors'
    : 'px-3 py-1 text-base font-semibold text-[#185ADB] hover:bg-[#185ADB]/10 rounded-lg transition-colors'

  const iconClass = header ? 'w-5 h-5' : 'w-4 h-4'

  return (
    <div className={`flex items-center justify-center gap-1 ${header ? 'text-white' : ''}`}>
      <button
        type="button"
        onClick={() => onChange(subDays(date, 1))}
        className={buttonClass}
        aria-label="Previous day"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onChange(new Date())}
        className={labelClass}
        aria-label="Jump to today"
      >
        {formatDateLabel(date)}
      </button>
      <button
        type="button"
        onClick={() => {
          // Never step into the future: there is nothing logged there.
          if (!isToday(date)) onChange(addDays(date, 1))
        }}
        className={buttonClass}
        aria-label="Next day"
        disabled={isToday(date)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`${iconClass} ${isToday(date) ? 'opacity-40' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}

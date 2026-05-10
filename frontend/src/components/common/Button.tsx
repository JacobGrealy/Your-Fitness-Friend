import { cn } from './cn'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
  children: React.ReactNode
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-mfp-blue text-white hover:bg-blue-700 rounded-lg font-medium',
  secondary: 'border border-mfp-blue text-mfp-blue rounded-lg font-medium',
  accent: 'bg-mfp-success text-white rounded-lg font-medium',
  ghost: 'text-mfp-textSecondary hover:text-mfp-text hover:bg-mfp-text/5 rounded-lg font-medium',
  outline: 'border border-mfp-blue text-mfp-blue rounded-lg font-medium',
}

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  xs: 'text-xs px-2 py-1',
  sm: 'text-sm px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-6 py-3',
}

const spinner = (
  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        loading && 'disabled:opacity-50',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && spinner}
      {children}
    </button>
  )
}

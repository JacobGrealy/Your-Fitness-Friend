import { cn } from './cn'

export interface CardProps {
  title?: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  shadow?: boolean | string
  border?: boolean
}

export default function Card({
  title,
  subtitle,
  children,
  className,
  shadow = false,
  border = false,
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg',
        typeof shadow === 'string' ? shadow : shadow && 'shadow-sm',
        border && 'border border-mfp-border',
        className
      )}
    >
      {(title || subtitle) && (
        <div className="p-4">
          {title && (
            <h2 className="text-lg font-semibold text-mfp-text">{title}</h2>
          )}
          {subtitle && (
            <p className="text-sm text-mfp-textSecondary mt-1">{subtitle}</p>
          )}
          {children}
        </div>
      )}
      {!title && !subtitle && children}
    </div>
  )
}

import { cn } from './cn'

export interface CardProps {
  title?: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  shadow?: boolean
}

export default function Card({
  title,
  subtitle,
  children,
  className,
  shadow = false,
}: CardProps) {
  return (
    <div
      className={cn(
        'card bg-base-100',
        shadow && (shadow === true ? 'shadow-md' : shadow),
        className
      )}
    >
      {(title || subtitle) && (
        <div className="card-body">
          {title && (
            <h2 className="card-title">{title}</h2>
          )}
          {subtitle && (
            <p className="text-sm text-base-content/70">{subtitle}</p>
          )}
          {children}
        </div>
      )}
      {!title && !subtitle && children}
    </div>
  )
}

import { cn } from './cn'

export interface LoadingProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  text?: string
  fullscreen?: boolean
}

const sizeClasses: Record<NonNullable<LoadingProps['size']>, string> = {
  xs: 'loading-xs',
  sm: 'loading-sm',
  md: 'loading-md',
  lg: 'loading-lg',
}

export default function Loading({
  size = 'md',
  text,
  fullscreen = false,
}: LoadingProps) {
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-base-100/80 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <span className={cn('loading loading-spinner', sizeClasses[size])} />
          {text && <span className="text-base-content/70">{text}</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className={cn('loading loading-spinner', sizeClasses[size])} />
      {text && <span className="text-base-content/70">{text}</span>}
    </div>
  )
}

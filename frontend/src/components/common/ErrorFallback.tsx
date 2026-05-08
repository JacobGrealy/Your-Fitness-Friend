import Button from './Button'
import { cn } from './cn'

export interface ErrorFallbackProps {
  error?: Error
  resetError?: () => void
  message?: string
  className?: string
}

export default function ErrorFallback({
  error,
  resetError,
  message = 'Something went wrong. Please try again.',
  className,
}: ErrorFallbackProps) {
  return (
    <div className={cn('flex items-center justify-center min-h-screen p-4', className)}>
      <div className="w-full max-w-md">
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body items-center text-center">
            <div className="alert alert-error w-full">
              <span>{message}</span>
            </div>
            {error && (
              <div className="text-sm text-base-content/60 break-all w-full">
                <p className="font-medium mt-2">Error details:</p>
                <p>{error.message}</p>
              </div>
            )}
            {resetError && (
              <div className="card-actions justify-center mt-4">
                <Button onClick={resetError}>Try Again</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

import { forwardRef } from 'react'
import { cn } from './cn'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'label'> {
  label?: string
  error?: string
 helperText?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  className,
  id,
  ...props
}: InputProps, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="form-control">
      {label && (
        <label htmlFor={inputId} className="label">
          <span className="label-text">{label}</span>
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'input input-bordered w-full',
          error && 'input-error',
          className
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
        {...props}
      />
      {error && (
        <label className="label">
          <span id={`${inputId}-error`} className="label-text-alt text-error">
            {error}
          </span>
        </label>
      )}
      {helperText && !error && (
        <label className="label">
          <span id={`${inputId}-helper`} className="label-text-alt text-base-content/60">
            {helperText}
          </span>
        </label>
      )}
    </div>
  )
})

export default Input

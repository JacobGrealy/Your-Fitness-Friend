import { forwardRef } from 'react'
import { cn } from './cn'

export interface TextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'label'> {
  label?: string
  error?: string
  helperText?: string
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(({
  label,
  error,
  helperText,
  className,
  id,
  rows = 3,
  ...props
}: TextAreaProps, ref) => {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="form-control">
      {label && (
        <label htmlFor={textareaId} className="label">
          <span className="label-text">{label}</span>
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        className={cn(
          'textarea textarea-bordered w-full',
          error && 'input-error',
          className
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
        {...props}
      />
      {error && (
        <label className="label">
          <span id={`${textareaId}-error`} className="label-text-alt text-error">
            {error}
          </span>
        </label>
      )}
      {helperText && !error && (
        <label className="label">
          <span id={`${textareaId}-helper`} className="label-text-alt text-base-content/60">
            {helperText}
          </span>
        </label>
      )}
    </div>
  )
})

export default TextArea

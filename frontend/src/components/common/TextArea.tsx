import { forwardRef, useCallback } from 'react'
import { cn } from './cn'

export interface TextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'label' | 'value'> {
  label?: string
  error?: string
  helperText?: string
  value?: string | number | readonly string[] | null | undefined
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(({
  label,
  error,
  helperText,
  className,
  id,
  rows = 3,
  value,
  ...props
}: TextAreaProps, ref) => {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-')

  const mergedRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      if (node) {
        if (ref) {
          if (typeof ref === 'function') {
            ref(node)
          } else {
            ref.current = node
          }
        }
      } else {
        if (ref) {
          if (typeof ref === 'function') {
            ref(null)
          } else {
            ref.current = null
          }
        }
      }
    },
    [ref]
  )

  return (
    <div className="form-control">
      {label && (
        <label htmlFor={textareaId} className="label">
          <span className="label-text">{label}</span>
        </label>
      )}
      <textarea
        ref={mergedRef}
        id={textareaId}
        rows={rows}
        value={value ?? ''}
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

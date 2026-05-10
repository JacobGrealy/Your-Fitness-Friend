import { forwardRef, useCallback } from 'react'
import { cn } from './cn'

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'label'> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  options,
  className,
  id,
  ...props
}: SelectProps, ref) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')

  const mergedRef = useCallback(
    (node: HTMLSelectElement | null) => {
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
        <label htmlFor={selectId} className="label">
          <span className="label-text">{label}</span>
        </label>
      )}
      <select
        ref={mergedRef}
        id={selectId}
        className={cn(
          'select select-bordered w-full',
          error && 'select-error',
          className
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <label className="label">
          <span id={`${selectId}-error`} className="label-text-alt text-error">
            {error}
          </span>
        </label>
      )}
    </div>
  )
})

export default Select

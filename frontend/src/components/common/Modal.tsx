import { cn } from './cn'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  submitLabel?: string
  onSubmit?: () => void
  submitDisabled?: boolean
  submitLoading?: boolean
}

const spinner = (
  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  submitLabel,
  onSubmit,
  submitDisabled = false,
  submitLoading = false,
}: ModalProps) {
  if (!isOpen) return null

  const handleSubmit = () => {
    if (onSubmit && !submitDisabled && !submitLoading) {
      onSubmit()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <h3 id="modal-title" className="text-lg font-semibold text-mfp-text p-4 pb-0">
          {title}
        </h3>
        <div className="p-4">{children}</div>
        {submitLabel && (
          <div className="flex justify-end gap-2 p-4 border-t border-mfp-border">
            <button
              className="text-mfp-textSecondary hover:text-mfp-text px-4 py-2 rounded-lg"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className={cn(
                'bg-mfp-blue text-white hover:bg-blue-700 rounded-lg px-4 py-2 font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
                submitLoading && 'disabled:opacity-50'
              )}
              onClick={handleSubmit}
              disabled={submitDisabled || submitLoading}
              type="button"
            >
              {submitLoading && spinner}
              {submitLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

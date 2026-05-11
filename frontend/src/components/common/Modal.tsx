import { useEffect } from 'react'
import Button from './Button'
import Spinner from './Spinner'

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
  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = () => {
    if (onSubmit && !submitDisabled && !submitLoading) {
      onSubmit()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative bg-white rounded-lg w-full max-w-lg sm:max-w-xl max-h-[90vh] overflow-y-auto mx-4"
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
            <Button variant="primary" onClick={handleSubmit} loading={submitLoading} disabled={submitDisabled || submitLoading} type="button">
              {submitLoading && <Spinner />}
              {submitLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

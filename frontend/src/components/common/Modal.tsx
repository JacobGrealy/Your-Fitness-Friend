import { useEffect } from 'react'
import Button from './Button'

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
        if (e.key === 'Escape') {
          onClose()
        }
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
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="modal-box relative w-full max-w-lg sm:max-w-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <h3 id="modal-title" className="text-lg font-bold">
          {title}
        </h3>
        <div className="py-4">{children}</div>
        {submitLabel && (
          <div className="modal-action">
            <button className="btn" onClick={onClose} type="button">
              Close
            </button>
            <Button
              variant="primary"
              loading={submitLoading}
              disabled={submitDisabled || submitLoading}
              onClick={handleSubmit}
              type="button"
            >
              {submitLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

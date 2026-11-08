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
  submitPendingLabel?: string
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
  submitPendingLabel,
}: ModalProps) {
  const close = () => { if (!submitLoading) onClose() }
  const pendingLabel = submitPendingLabel || (/delete/i.test(submitLabel || '') ? 'Deleting…' : /copy/i.test(submitLabel || '') ? 'Copying…' : 'Saving…')
  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !submitLoading) onClose()
      }
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose, submitLoading])

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
        onClick={close}
        aria-hidden="true"
      />
      <div
        className="relative bg-white rounded-lg w-full max-w-lg sm:max-w-xl max-h-[90vh] overflow-y-auto mx-4"
        role="dialog"
        aria-modal="true"
        aria-busy={submitLoading}
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
              onClick={close}
              type="button"
            >
              Cancel
            </button>
            <Button variant="primary" onClick={handleSubmit} loading={submitLoading} disabled={submitDisabled || submitLoading} type="button">
              <span role={submitLoading ? 'status' : undefined}>{submitLoading ? pendingLabel : submitLabel}</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

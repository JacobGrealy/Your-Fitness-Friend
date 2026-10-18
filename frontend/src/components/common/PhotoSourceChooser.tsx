import { useCallback, useRef } from 'react'

interface Props {
  /** Sheet mode only: the page controls when the choice appears. */
  open?: boolean
  onClose?: () => void
  onSelect: (file: File) => void
  /** Kept per-screen: the avatar accepts fewer formats than the photo logs. */
  accept?: string
  title?: string
  /**
   * Present the choice as two inline cards instead of a bottom sheet. The full-page
   * photo log wants the options in the page; a form wants them out of the way.
   */
  inline?: boolean
}

/**
 * Camera or gallery, on every photo upload (FF-0078).
 *
 * A file input carrying `capture="environment"` sends Android straight to the camera and
 * makes the gallery unreachable — which is what five screens here did, in different
 * copies. This owns both inputs and offers the choice, so the difference between the two
 * paths lives in one place:
 *
 *   camera  -> input WITH capture        (opens the camera)
 *   gallery -> input WITHOUT capture     (opens the picker)
 *
 * Both inputs stay mounted even while the sheet is closed, so a page (or a test) can
 * still drive them directly.
 */
export default function PhotoSourceChooser({
  open = false,
  onClose,
  onSelect,
  accept = 'image/*',
  title = 'Add a photo',
  inline = false,
}: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      // Clear the input so picking the same file twice still fires a change event.
      event.target.value = ''
      if (file) {
        onSelect(file)
      }
      onClose?.()
    },
    [onSelect, onClose]
  )

  return (
    <>
      <input
        ref={cameraInputRef}
        type="file"
        accept={accept}
        capture="environment"
        onChange={handleChange}
        className="hidden"
        data-testid="photo-input-camera"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        data-testid="photo-input-gallery"
      />

      {inline && (
        <div className="grid grid-cols-2 gap-3" data-testid="photo-source-inline">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center gap-2 py-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#185ADB] transition-colors"
          >
            <span className="text-2xl" aria-hidden="true">📷</span>
            <span className="text-sm font-medium" style={{ color: '#212121' }}>Camera</span>
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="flex flex-col items-center gap-2 py-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#185ADB] transition-colors"
          >
            <span className="text-2xl" aria-hidden="true">🖼️</span>
            <span className="text-sm font-medium" style={{ color: '#212121' }}>Gallery</span>
          </button>
        </div>
      )}

      {!inline && open && (
        <div
          role="dialog"
          aria-label={title}
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={onClose}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-2xl p-4 space-y-2"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm font-semibold text-center mb-2" style={{ color: '#212121' }}>
              {title}
            </p>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#185ADB' }}
            >
              Take photo
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="w-full py-3 rounded-xl text-sm font-semibold border bg-white"
              style={{ borderColor: '#e0e0e0', color: '#212121' }}
            >
              Choose from gallery
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-sm font-medium"
              style={{ color: '#757575' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}

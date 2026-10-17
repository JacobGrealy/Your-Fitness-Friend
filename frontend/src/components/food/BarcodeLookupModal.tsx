import { useCallback, useState } from 'react'
import Modal from '@/components/common/Modal'
import BarcodeScanner from '@/components/food/BarcodeScanner'
import { foodApi } from '@/api/food'
import type { Food } from '@/types'

interface BarcodeLookupModalProps {
  isOpen: boolean
  onClose: () => void
  /** Called with the found food; the caller decides where to log it. */
  onFound: (food: Food) => void
}

/**
 * Barcode entry and lookup (FF-0014), with the camera scanner from FF-0030.
 *
 * The camera is the default now that the app is served over HTTPS; the text field
 * stays because a damaged or unreadable label is the normal case in a kitchen, and
 * because it is the only option if the camera is refused.
 */
export default function BarcodeLookupModal({ isOpen, onClose, onFound }: BarcodeLookupModalProps) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [found, setFound] = useState<Food | null>(null)
  const [scanning, setScanning] = useState(true)

  const reset = () => {
    setCode('')
    setBusy(false)
    setError(null)
    setFound(null)
    setScanning(true)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const lookup = useCallback(async (raw: string) => {
    setBusy(true)
    setError(null)
    try {
      const { food } = await foodApi.lookupBarcode(raw.trim())
      setFound(food)
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 404) {
        setError('No product found for that barcode. You can still add it manually from Custom Foods.')
      } else if (status === 503) {
        setError('Product lookup is unavailable right now — try again, or add the food manually.')
      } else if (status === 400) {
        setError('That does not look like a barcode: enter the 6–14 digits printed underneath it.')
      } else {
        setError('Could not look that up. Check your connection and try again.')
      }
    } finally {
      setBusy(false)
    }
  }, [])

  const handleLookup = () => lookup(code)

  const handleDetected = (scanned: string) => {
    // Stop the camera first so the sheet is not decoding while the lookup runs.
    setScanning(false)
    setCode(scanned)
    setFound(null)
    void lookup(scanned)
  }

  const handleSubmit = () => {
    if (found) {
      onFound(found)
      reset()
      return
    }
    void handleLookup()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Find by Barcode"
      submitLabel={found ? 'Add to diary' : 'Look up'}
      onSubmit={handleSubmit}
      submitDisabled={busy || (!found && code.trim().length === 0)}
      submitLoading={busy}
    >
      <div className="space-y-3">
        {scanning && !found ? (
          <>
            <BarcodeScanner onDetected={handleDetected} />
            <button
              type="button"
              onClick={() => setScanning(false)}
              className="block w-full text-center text-sm underline"
              style={{ color: '#185ADB' }}
            >
              Type the barcode instead
            </button>
          </>
        ) : (
          <>
            <label className="block text-sm" style={{ color: '#757575' }} htmlFor="barcode-input">
              Barcode number
            </label>
            <input
              id="barcode-input"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setFound(null)
                setError(null)
              }}
              placeholder="e.g. 3017620422003"
              className="w-full border rounded-lg px-4 py-3 text-base outline-none"
              style={{ borderColor: '#e0e0e0' }}
            />
            <button
              type="button"
              onClick={() => setScanning(true)}
              className="block w-full text-center text-sm underline"
              style={{ color: '#185ADB' }}
            >
              Use the camera instead
            </button>
          </>
        )}

        {found && (
          <div className="rounded-lg p-3" style={{ background: '#E8F0FE' }}>
            <p className="text-sm font-semibold" style={{ color: '#185ADB' }}>{found.name}</p>
            <p className="text-xs mt-0.5" style={{ color: '#757575' }}>
              {[found.brand, `${found.calories} kcal`, found.serving_size].filter(Boolean).join(' · ')}
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm" style={{ color: '#E53935' }} role="alert">{error}</p>
        )}
      </div>
    </Modal>
  )
}

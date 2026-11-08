import { useRef, useState } from 'react'

/** Local write feedback and a synchronous lock, including same-frame double taps. */
export function usePendingAction() {
  const busy = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const run = async (action: () => Promise<void>) => {
    if (busy.current) return
    busy.current = true; setPending(true); setError('')
    try { await action() }
    catch (e: any) { setError(e?.response?.data?.error || e?.response?.data?.message || 'Unable to save changes. Please try again.') }
    finally { busy.current = false; setPending(false) }
  }
  return { pending, error, run }
}

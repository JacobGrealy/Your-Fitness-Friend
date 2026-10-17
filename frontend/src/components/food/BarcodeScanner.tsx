import { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

interface BarcodeScannerProps {
  /** Called once with the first decoded code; the caller stops the scanner. */
  onDetected: (code: string) => void
  /** Shown when the camera cannot be used at all. */
  onUnavailable?: (reason: string) => void
}

type Phase = 'starting' | 'scanning' | 'blocked'

/** How often a frame is decoded; ~8/s is plenty for a barcode held steady. */
const DECODE_INTERVAL_MS = 120

/**
 * Camera barcode scanner (FF-0030).
 *
 * Exists because the app is now served over Tailscale HTTPS: over plain HTTP the
 * origin is not a secure context and `navigator.mediaDevices` is undefined, so
 * this could not work at all (measured, see DECISIONS.md).
 *
 * Decoding is jsQR on a canvas rather than the Barcode Detection API, because
 * that API is not exposed inside an Android WebView — the one place this app
 * actually runs. jsQR is pure JavaScript, so it behaves the same everywhere.
 */
export default function BarcodeScanner({ onDetected, onUnavailable }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectedRef = useRef(false)
  const rafRef = useRef<number | null>(null)

  const [phase, setPhase] = useState<Phase>('starting')
  const [message, setMessage] = useState('Point the camera at a barcode')

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      window.clearTimeout(rafRef.current)
      rafRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    let cancelled = false

    const fail = (reason: string) => {
      if (cancelled) return
      setPhase('blocked')
      setMessage(reason)
      onUnavailable?.(reason)
    }

    const start = async () => {
      // A secure context is the whole reason this ticket was parked.
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        fail('The camera needs the app to be served over HTTPS. Open AweFit at its https:// address, or type the barcode instead.')
        return
      }

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
      } catch (err: any) {
        const name = err?.name ?? ''
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          fail('Camera permission was refused. Allow it in Android settings for AweFit, or type the barcode instead.')
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          fail('No camera was found on this device.')
        } else {
          fail('The camera could not be started. Type the barcode instead.')
        }
        return
      }

      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      streamRef.current = stream
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      try {
        await video.play()
      } catch {
        // Autoplay refusal is not fatal: the frames loop tolerates a paused video.
      }
      setPhase('scanning')

      const tick = () => {
        if (cancelled || detectedRef.current) return
        const canvas = canvasRef.current
        if (video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
          const width = video.videoWidth
          const height = video.videoHeight
          if (width && height) {
            canvas.width = width
            canvas.height = height
            const context = canvas.getContext('2d', { willReadFrequently: true })
            if (context) {
              context.drawImage(video, 0, 0, width, height)
              const image = context.getImageData(0, 0, width, height)
              const result = jsQR(image.data, image.width, image.height, {
                inversionAttempts: 'dontInvert',
              })
              if (result?.data) {
                detectedRef.current = true
                if (typeof navigator.vibrate === 'function') navigator.vibrate?.(40)
                onDetected(result.data.trim())
                return
              }
            }
          }
        }
        rafRef.current = window.setTimeout(tick, DECODE_INTERVAL_MS)
      }
      tick()
    }

    void start()

    return () => {
      cancelled = true
      stop()
    }
  }, [onDetected, onUnavailable, stop])

  return (
    <div className="space-y-3">
      <div
        className="relative rounded-lg overflow-hidden bg-black"
        style={{ aspectRatio: '4 / 3' }}
      >
        <video
          ref={videoRef}
          data-testid="barcode-video"
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />
        {phase === 'scanning' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="rounded-lg"
              style={{ width: '78%', height: '42%', boxShadow: '0 0 0 2px rgba(255,255,255,0.85) inset' }}
            />
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      <p
        className="text-sm text-center"
        style={{ color: phase === 'blocked' ? '#E53935' : '#757575' }}
        role={phase === 'blocked' ? 'alert' : undefined}
      >
        {phase === 'starting' ? 'Starting the camera…' : message}
      </p>
    </div>
  )
}

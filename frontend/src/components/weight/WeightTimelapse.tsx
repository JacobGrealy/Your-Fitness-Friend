import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WeightLog } from '@/types'
import { weightPhotoUrl } from '@/utils/photoUrl'

interface WeightTimelapseProps {
  logs: WeightLog[]
  /** Milliseconds each frame is shown while playing. */
  frameMs?: number
}

/**
 * Weight-photo timelapse (FF-0028).
 *
 * Deliberately lazy: collapsed by default, and nothing is fetched until it is
 * opened — the Progress page should not pull a year of photos because a section
 * exists. Only the **next** frame is ever preloaded, so playing does not stall on
 * a slow connection and does not download the whole series up front either.
 */
export default function WeightTimelapse({ logs, frameMs = 900 }: WeightTimelapseProps) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const preloaded = useRef<string | null>(null)

  const frames = useMemo(
    () =>
      logs
        .filter((log) => !!log.photo_url)
        .slice()
        .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()),
    [logs]
  )

  const total = frames.length
  const current = total > 0 ? frames[Math.min(index, total - 1)] : null
  const nextFrame = total > 0 ? frames[(Math.min(index, total - 1) + 1) % total] : null

  // Preload exactly one frame ahead.
  useEffect(() => {
    if (!open || !nextFrame?.photo_url) return
    const src = weightPhotoUrl(nextFrame.photo_url)
    if (preloaded.current === src) return
    preloaded.current = src
    const img = new Image()
    img.src = src
  }, [open, nextFrame])

  const step = useCallback(
    (delta: number) => {
      setIndex((prev) => {
        if (total === 0) return 0
        return (prev + delta + total) % total
      })
    },
    [total]
  )

  useEffect(() => {
    if (!playing || !open || total < 2) return
    const timer = window.setInterval(() => step(1), frameMs)
    return () => window.clearInterval(timer)
  }, [playing, open, total, frameMs, step])

  // Nothing to show: the section does not exist rather than being an empty shell.
  if (total < 2) return null

  const meta = current
    ? {
        date: new Date(current.recorded_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        weight: `${current.weight.toFixed(1)} lbs`,
      }
    : null

  return (
    <div className="bg-white rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <span className="text-sm font-medium" style={{ color: '#212121' }}>
          Timelapse
          <span className="ml-2 text-xs font-normal" style={{ color: '#757575' }}>
            {total} photos
          </span>
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="#757575"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {open && current && meta && (
        <div className="px-4 pb-4">
          <div className="relative">
            <img
              key={current.id}
              src={weightPhotoUrl(current.photo_url as string)}
              alt={`${meta.weight} on ${meta.date}`}
              className="w-full aspect-square object-cover rounded-lg bg-[#f2f2f2]"
            />
            <span
              className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
              style={{ background: 'rgba(0,0,0,0.55)' }}
            >
              {Math.min(index, total - 1) + 1} / {total}
            </span>
          </div>

          <div className="flex items-center justify-between mt-3">
            <button
              type="button"
              onClick={() => step(-1)}
              className="px-3 py-2 rounded-lg text-sm font-medium"
              style={{ color: '#185ADB' }}
              aria-label="Previous photo"
            >
              ‹ Prev
            </button>

            <div className="text-center">
              <p className="text-sm font-bold" style={{ color: '#212121' }}>{meta.weight}</p>
              <p className="text-[11px]" style={{ color: '#757575' }}>{meta.date}</p>
            </div>

            <button
              type="button"
              onClick={() => setPlaying((prev) => !prev)}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: '#185ADB' }}
              aria-label={playing ? 'Pause timelapse' : 'Play timelapse'}
            >
              {playing ? '❚❚ Pause' : '▶ Play'}
            </button>

            <button
              type="button"
              onClick={() => step(1)}
              className="px-3 py-2 rounded-lg text-sm font-medium"
              style={{ color: '#185ADB' }}
              aria-label="Next photo"
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

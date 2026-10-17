import { useMemo, useState } from 'react'
import type { WeightLog } from '@/types'

interface ThenAndNowProps {
  logs: WeightLog[]
}

const photoSrc = (photoUrl: string) => `${window.location.origin}/api/weight/uploads/${photoUrl}`

const label = (log: WeightLog) => ({
  date: new Date(log.recorded_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }),
  weight: `${log.weight.toFixed(1)} lbs`,
})

/**
 * "Then and Now" — the earliest and latest weigh-ins that have a photo (FF-0027).
 *
 * Collapsed by default: it is a comparison to open deliberately, not something
 * that pushes the weight trend off the first screen. Renders nothing until there
 * are two *different* photo days, since a comparison of one photo with itself is
 * worse than no section at all.
 */
export default function ThenAndNow({ logs }: ThenAndNowProps) {
  const [open, setOpen] = useState(false)

  const pair = useMemo(() => {
    const withPhotos = logs
      .filter((log) => !!log.photo_url)
      .slice()
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())

    if (withPhotos.length < 2) return null
    const first = withPhotos[0]
    const last = withPhotos[withPhotos.length - 1]
    if (first.id === last.id) return null
    // Same day, two entries: nothing has changed between them.
    if (new Date(first.recorded_at).toDateString() === new Date(last.recorded_at).toDateString()) return null
    return { first, last }
  }, [logs])

  if (!pair) return null

  return (
    <div className="bg-white rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <span className="text-sm font-medium" style={{ color: '#212121' }}>Then and Now</span>
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

      {open && (
        <div className="grid grid-cols-2 gap-3 px-4 pb-4">
          {([
            ['Then', pair.first],
            ['Now', pair.last],
          ] as const).map(([caption, log]) => {
            const meta = label(log)
            return (
              <figure key={caption} className="text-center">
                <figcaption className="text-xs font-semibold mb-1" style={{ color: '#185ADB' }}>
                  {caption}
                </figcaption>
                <img
                  src={photoSrc(log.photo_url as string)}
                  alt={`${caption}: ${meta.weight} on ${meta.date}`}
                  className="w-full aspect-square object-cover rounded-lg bg-[#f2f2f2]"
                  loading="lazy"
                />
                <p className="text-xs font-bold mt-1" style={{ color: '#212121' }}>{meta.weight}</p>
                <p className="text-[11px]" style={{ color: '#757575' }}>{meta.date}</p>
              </figure>
            )
          })}
        </div>
      )}
    </div>
  )
}

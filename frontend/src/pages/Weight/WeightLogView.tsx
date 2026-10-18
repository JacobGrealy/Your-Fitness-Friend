import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { useWeightStore } from '@/store/weightStore'
import Loading from '@/components/common/Loading'
import Modal from '@/components/common/Modal'
import { localDateOf } from '@/utils/localDate'
import { weightPhotoUrl } from '@/utils/photoUrl'
import { formatWeight } from '@/utils/formatters'

const TEXT = '#212121'
const GREY = '#757575'
const BLUE = '#185ADB'

/**
 * A saved weigh-in, read-only (FF-0074).
 *
 * Tapping a history row used to drop straight into the edit form, so reviewing an old
 * entry put live number inputs under your thumb and buried the photo under a "Tap to
 * change photo" overlay. This screen shows the entry and nothing else; Edit is an
 * explicit step from here.
 *
 * Strictly read-only: the only request it makes on mount is the fetch itself. Nothing
 * here can change an entry by being looked at — that is the point of the ticket.
 */
export default function WeightLogView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { fetchLog, deleteLog, isLoading } = useWeightStore()

  const [log, setLog] = useState<Awaited<ReturnType<typeof fetchLog>>>(null)
  const [notFound, setNotFound] = useState(false)
  const [photoBroken, setPhotoBroken] = useState(false)
  const [enlarged, setEnlarged] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!id) {
      setNotFound(true)
      return
    }
    let cancelled = false
    fetchLog(id)
      .then((entry) => {
        if (cancelled) return
        if (entry) {
          setLog(entry)
        } else {
          setNotFound(true)
        }
      })
      .catch(() => { if (!cancelled) setNotFound(true) })
    return () => { cancelled = true }
  }, [id, fetchLog])

  const handleDelete = useCallback(async () => {
    if (!id) return
    await deleteLog(id)
    setConfirmDelete(false)
    navigate('/weight/history')
  }, [id, deleteLog, navigate])

  if (notFound) {
    return (
      <div className="p-4">
        <p style={{ color: GREY }}>That weigh-in is no longer here.</p>
        <button
          type="button"
          onClick={() => navigate('/weight/history')}
          className="mt-3 text-sm font-medium"
          style={{ color: BLUE }}
        >
          ← Back to Weight History
        </button>
      </div>
    )
  }

  if (!log) {
    return (
      <div className="p-4 flex justify-center py-12">
        <Loading text="Loading entry…" />
      </div>
    )
  }

  const hasPhoto = Boolean(log.photo_url) && !photoBroken
  // The stored timestamp is UTC; the day the user recorded is the local one (FF-0059).
  const dayLabel = format(parseISO(localDateOf(log.recorded_at)), 'EEEE, MMM d, yyyy')

  return (
    <div className="p-4 space-y-4" style={{ backgroundColor: '#f2f2f2' }}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm font-medium px-2 py-1 rounded-lg"
          style={{ color: GREY }}
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold" style={{ color: TEXT }}>Weigh-in</h1>
      </div>

      <div className="bg-white rounded-lg p-4">
        <p className="text-3xl font-bold" style={{ color: TEXT }}>{formatWeight(log.weight)}</p>
        <p className="text-sm mt-1" style={{ color: GREY }}>{dayLabel}</p>
      </div>

      <div className="bg-white rounded-lg p-4">
        <p className="text-xs uppercase tracking-wide mb-2" style={{ color: GREY }}>Photo</p>
        {hasPhoto ? (
          <button
            type="button"
            onClick={() => setEnlarged(true)}
            className="block w-full"
            aria-label="Enlarge photo"
          >
            <img
              src={weightPhotoUrl(log.photo_url as string)}
              alt="Weigh-in photo"
              className="w-full max-h-[320px] object-contain rounded-lg"
              // The serve route answers a missing file with a JSON 404, which would
              // otherwise render as a broken-image icon (FF-0074).
              onError={() => setPhotoBroken(true)}
            />
          </button>
        ) : (
          // Deliberately quiet and distinct from the notes empty state, so the screen
          // still reads as a complete entry rather than a broken one.
          <p className="text-sm" style={{ color: GREY }}>No photo for this entry.</p>
        )}
      </div>

      <div className="bg-white rounded-lg p-4">
        <p className="text-xs uppercase tracking-wide mb-2" style={{ color: GREY }}>Notes</p>
        {log.notes ? (
          <p className="text-sm whitespace-pre-wrap" style={{ color: TEXT }}>{log.notes}</p>
        ) : (
          <p className="text-sm" style={{ color: GREY }}>No notes for this entry.</p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => navigate(`/weight/history/${log.id}/edit`)}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
          style={{ background: BLUE }}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="px-4 py-3 rounded-xl text-sm font-medium border bg-white"
          style={{ borderColor: '#e0e0e0', color: '#c62828' }}
        >
          Delete
        </button>
      </div>

      {enlarged && (
        <div
          role="dialog"
          aria-label="Enlarged photo"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.9)' }}
          onClick={() => setEnlarged(false)}
        >
          <img
            src={weightPhotoUrl(log.photo_url as string)}
            alt="Weigh-in photo enlarged"
            className="max-w-full max-h-full object-contain"
          />
          <button
            type="button"
            aria-label="Close enlarged photo"
            className="absolute top-4 right-4 text-white text-2xl leading-none"
            onClick={() => setEnlarged(false)}
          >
            ✕
          </button>
        </div>
      )}

      <Modal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete Weight Log"
        submitLabel="Delete"
        onSubmit={handleDelete}
        submitDisabled={isLoading}
        submitLoading={isLoading}
      >
        <p style={{ color: GREY }}>
          Are you sure you want to delete this weight log? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}

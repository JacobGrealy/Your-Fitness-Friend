import { useEffect, useState } from 'react'
import PhotoSourceChooser from '@/components/common/PhotoSourceChooser'
import Modal from '@/components/common/Modal'

export interface ExercisePhotoDraft { file: File | null; remove: boolean }
export const emptyExercisePhoto: ExercisePhotoDraft = { file: null, remove: false }
export function ExercisePhotoViewer({ src, onClose }: { src: string; onClose: () => void }) {
  return <Modal isOpen onClose={onClose} title="Exercise photo"><img src={src} alt="Exercise session" className="w-full max-h-[70vh] object-contain" /><button type="button" className="mt-4 w-full py-2 text-mfp-blue font-medium" onClick={onClose}>Close photo</button></Modal>
}
export default function ExercisePhotoField({ value, onChange, initialUrl = null }: {
  value: ExercisePhotoDraft; onChange: (draft: ExercisePhotoDraft) => void; initialUrl?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!value.file) { setPreview(null); return }
    const url = URL.createObjectURL(value.file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [value.file])
  const shown = preview || (!value.remove ? initialUrl : null)
  return <div className="space-y-2">
    <p className="text-sm font-medium">Session photo (optional)</p>
    {shown && <button type="button" aria-label="View exercise photo" onClick={() => setViewing(true)}><img src={shown} alt="Selected exercise photo" className="w-28 h-28 object-cover rounded-lg border border-mfp-border" /></button>}
    {error && <p role="alert" className="text-sm text-mfp-error">{error}</p>}
    <div className="flex gap-4 text-sm"><button type="button" className="text-mfp-blue underline" onClick={() => setOpen(true)}>{shown ? 'Replace photo' : 'Add photo'}</button>
      {shown && <button type="button" className="text-mfp-error underline" onClick={() => { onChange({ file: null, remove: !!initialUrl }); setViewing(false); setError('') }}>Remove photo</button>}
    </div>
    <p className="text-xs text-mfp-textSecondary">Changes are saved with the session. Repeated sessions start without a photo.</p>
    <PhotoSourceChooser open={open} title="Exercise photo" onClose={() => setOpen(false)} accept="image/jpeg,image/png,image/gif,image/webp" onSelect={file => {
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) { setError('Choose a JPEG, PNG, GIF or WebP photo.'); return }
      if (file.size > 10 * 1024 * 1024) { setError('Photo must be at most 10 MB.'); return }
      setError(''); onChange({ file, remove: false })
    }} />
    {viewing && shown && <ExercisePhotoViewer src={shown} onClose={() => setViewing(false)} />}
  </div>
}

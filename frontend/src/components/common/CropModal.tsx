import { useState, useCallback, useRef } from 'react'
import Cropper, { Point } from 'react-easy-crop'

interface CropModalProps {
  isOpen: boolean
  onCropComplete: (croppedFile: File) => void
  onClose: () => void
}

function cropImageToCircle(
  imageSrc: string,
  croppedAreaPixels: { x: number; y: number; width: number; height: number },
  size: number
): Promise<File> {
  return new Promise((resolve) => {
    const image = new Image()
    image.src = imageSrc
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        size,
        size
      )

      ctx.globalCompositeOperation = 'destination-in'
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
      ctx.fill()

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' })
          resolve(file)
        }
      }, 'image/jpeg', 0.9)
    }
  })
}

export default function CropModal({ isOpen, onCropComplete, onClose }: CropModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [image, setImage] = useState<string | null>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [cropping, setCropping] = useState(false)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setImage(url)
    }
  }, [])

  const onCropCompleteHandler = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleConfirm = async () => {
    if (!image || !croppedAreaPixels) return
    setCropping(true)
    try {
      const croppedFile = await cropImageToCircle(image, croppedAreaPixels, 256)
      onCropComplete(croppedFile)
    } finally {
      setCropping(false)
    }
  }

  const handleClose = () => {
    if (image) {
      URL.revokeObjectURL(image)
    }
    setImage(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setCropping(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-xl w-full max-w-md mx-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-[#212121]">Crop Photo</h3>
          <button
            type="button"
            onClick={handleClose}
            className="text-[#757575] hover:text-[#212121] text-xl"
          >
            {'\u00D7'}
          </button>
        </div>

        <div className="p-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {!image ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-12 border-2 border-dashed border-gray-300 rounded-lg text-[#757575] hover:bg-gray-50 transition-colors"
            >
              <div className="flex flex-col items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-medium">Choose a photo</span>
              </div>
            </button>
          ) : (
            <div className="relative" style={{ height: '300px' }}>
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropCompleteHandler}
                cropShape="round"
              />
            </div>
          )}

          {image && (
            <div className="mt-4">
              <label className="block text-sm text-[#757575] mb-1">Zoom</label>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 p-4 border-t border-gray-200">
          {!image ? (
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 text-base font-medium bg-gray-100 text-[#212121] rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setImage(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                    fileInputRef.current.click()
                  }
                }}
                className="flex-1 py-2.5 text-base font-medium bg-gray-100 text-[#212121] rounded-lg hover:bg-gray-200 transition-colors"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={cropping}
                className="flex-1 py-2.5 text-base font-medium bg-[#185ADB] text-white rounded-lg hover:bg-[#1550C0] disabled:opacity-50 transition-colors"
              >
                {cropping ? 'Cropping...' : 'Crop'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

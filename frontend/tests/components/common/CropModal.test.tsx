import { render, screen, act } from '@testing-library/react'
import { useEffect } from 'react'
import CropModal from '@/components/common/CropModal'

// react-easy-crop needs layout APIs jsdom does not have; the stub reports a crop
// area immediately so the confirm button becomes usable.
jest.mock('react-easy-crop', () => ({
  __esModule: true,
  default: ({ image, onCropComplete }: { image: string; onCropComplete: (a: unknown, b: unknown) => void }) => {
    useEffect(() => {
      onCropComplete({ x: 0, y: 0, width: 10, height: 10 }, { x: 0, y: 0, width: 256, height: 256 })
    }, [onCropComplete])
    return <div data-testid="cropper" data-image={image} />
  },
}))

const photo = () => new File(['pixels'], 'photo.png', { type: 'image/png' })

describe('CropModal (FF-0010: one file picker, not two)', () => {
  beforeEach(() => {
    // jsdom has no object-URL implementation
    Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:cropping') })
    Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: jest.fn() })
  })

  it('does not render a file input of its own', () => {
    const { container } = render(
      <CropModal isOpen file={photo()} onCropComplete={jest.fn()} onClose={jest.fn()} />
    )

    expect(container.querySelector('input[type="file"]')).toBeNull()
  })

  it('crops the file it was handed', () => {
    render(<CropModal isOpen file={photo()} onCropComplete={jest.fn()} onClose={jest.fn()} />)

    const cropper = screen.getByTestId('cropper')
    expect(cropper).toHaveAttribute('data-image', 'blob:cropping')
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
  })

  it('revokes the object URL when it closes', () => {
    const { rerender } = render(
      <CropModal isOpen file={photo()} onCropComplete={jest.fn()} onClose={jest.fn()} />
    )

    act(() => {
      rerender(<CropModal isOpen={false} file={null} onCropComplete={jest.fn()} onClose={jest.fn()} />)
    })

    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('renders nothing when closed', () => {
    render(<CropModal isOpen={false} file={photo()} onCropComplete={jest.fn()} onClose={jest.fn()} />)

    expect(screen.queryByTestId('cropper')).toBeNull()
  })
})

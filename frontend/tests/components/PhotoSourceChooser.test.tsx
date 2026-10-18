import { fireEvent, render, screen } from '@testing-library/react'
import PhotoSourceChooser from '@/components/common/PhotoSourceChooser'

// FF-0078: every photo upload offers camera or gallery. The barcode scanner is the
// exception and has no file input at all.
//
// The whole point is the difference between the two inputs: `capture` is what sends
// Android straight to the camera and hides the gallery, so the camera input must carry
// it and the gallery input must not.

describe('PhotoSourceChooser (FF-0078)', () => {
  it('offers both sources in the sheet', () => {
    render(<PhotoSourceChooser open onClose={jest.fn()} onSelect={jest.fn()} />)

    expect(screen.getByRole('button', { name: 'Take photo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choose from gallery' })).toBeInTheDocument()
  })

  it('puts capture on the camera input only', () => {
    render(<PhotoSourceChooser open onClose={jest.fn()} onSelect={jest.fn()} />)

    const camera = screen.getByTestId('photo-input-camera')
    const gallery = screen.getByTestId('photo-input-gallery')

    expect(camera).toHaveAttribute('capture', 'environment')
    // Without this assertion the bug can come back silently: capture on the gallery
    // input removes the choice entirely.
    expect(gallery).not.toHaveAttribute('capture')
  })

  it('hands the picked file to the page and closes, whichever source was used', () => {
    const onSelect = jest.fn()
    const onClose = jest.fn()
    render(<PhotoSourceChooser open onClose={onClose} onSelect={onSelect} />)

    const file = new File(['x'], 'shot.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByTestId('photo-input-gallery'), { target: { files: [file] } })

    expect(onSelect).toHaveBeenCalledWith(file)
    expect(onClose).toHaveBeenCalled()
  })

  it('accepts the same file twice in a row', () => {
    const onSelect = jest.fn()
    render(<PhotoSourceChooser open onClose={jest.fn()} onSelect={onSelect} />)

    const input = screen.getByTestId('photo-input-camera')
    const file = new File(['x'], 'same.jpg', { type: 'image/jpeg' })
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.change(input, { target: { files: [file] } })

    // The input is cleared after each pick, so a repeat still fires a change event.
    expect(onSelect).toHaveBeenCalledTimes(2)
  })

  it('keeps the inputs mounted while the sheet is closed', () => {
    render(<PhotoSourceChooser open={false} onClose={jest.fn()} onSelect={jest.fn()} />)

    // A page (or a test) can still drive them directly, and switching screens does not
    // lose the mounted element.
    expect(screen.getByTestId('photo-input-camera')).toBeInTheDocument()
    expect(screen.getByTestId('photo-input-gallery')).toBeInTheDocument()
  })

  it('renders both options inline when asked, with no sheet', () => {
    render(<PhotoSourceChooser inline onSelect={jest.fn()} />)

    expect(screen.getByTestId('photo-source-inline')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Camera/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Gallery/ })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('passes a narrower accept through for the avatar', () => {
    render(
      <PhotoSourceChooser inline accept="image/jpeg,image/png,image/webp" onSelect={jest.fn()} />
    )

    expect(screen.getByTestId('photo-input-gallery')).toHaveAttribute(
      'accept',
      'image/jpeg,image/png,image/webp'
    )
  })

  it('cancels without selecting anything', () => {
    const onSelect = jest.fn()
    const onClose = jest.fn()
    render(<PhotoSourceChooser open onClose={onClose} onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
    expect(onSelect).not.toHaveBeenCalled()
  })
})

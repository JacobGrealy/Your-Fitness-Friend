import { render, screen, fireEvent } from '@testing-library/react'
import ExercisePhotoField from '@/components/exercise/ExercisePhotoField'
const onChange = jest.fn()
beforeEach(() => { jest.clearAllMocks(); URL.createObjectURL = jest.fn(() => 'blob:test'); URL.revokeObjectURL = jest.fn() })

test('offers camera/gallery and selects a draft without uploading', () => {
  render(<ExercisePhotoField value={{ file: null, remove: false }} onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: 'Add photo' }))
  expect(screen.getByRole('button', { name: 'Take photo' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Choose from gallery' })).toBeInTheDocument()
  const file = new File(['photo'], 'workout.jpg', { type: 'image/jpeg' })
  fireEvent.change(screen.getByTestId('photo-input-gallery'), { target: { files: [file] } })
  expect(onChange).toHaveBeenCalledWith({ file, remove: false })
})

test('removing a stored photo records intent; viewing has explicit close', () => {
  render(<ExercisePhotoField value={{ file: null, remove: false }} onChange={onChange} initialUrl="/api/exercise/log/1/photo" />)
  fireEvent.click(screen.getByRole('button', { name: 'View exercise photo' }))
  expect(screen.getByRole('dialog', { name: 'Exercise photo' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Close photo' }))
  fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }))
  expect(onChange).toHaveBeenCalledWith({ file: null, remove: true })
})

test('invalid file retains the previous selection', () => {
  render(<ExercisePhotoField value={{ file: null, remove: false }} onChange={onChange} />)
  fireEvent.change(screen.getByTestId('photo-input-gallery'), { target: { files: [new File(['bad'], 'bad.txt', { type: 'text/plain' })] } })
  expect(screen.getByRole('alert')).toHaveTextContent('Choose a JPEG')
  expect(onChange).not.toHaveBeenCalled()
})

import { render, screen, fireEvent } from '@testing-library/react'
import ThumbnailImage from '@/components/common/ThumbnailImage'
import { thumbnailUrl } from '@/utils/photoUrl'

test('requests a small image lazily and falls back once to unchanged original', () => {
  const onError = jest.fn()
  render(<ThumbnailImage src="/api/food/uploads/meal.jpg?v=2" alt="Meal" onError={onError} />)
  const image = screen.getByAltText('Meal')
  expect(image).toHaveAttribute('src', '/api/food/uploads/meal.jpg?v=2&thumbnail=1')
  expect(image).toHaveAttribute('loading', 'lazy')
  fireEvent.error(image)
  expect(image).toHaveAttribute('src', '/api/food/uploads/meal.jpg?v=2')
  expect(onError).not.toHaveBeenCalled()
  fireEvent.error(image)
  expect(onError).toHaveBeenCalledTimes(1)
})

test('new photo resets failed derivative state', () => {
  const { rerender } = render(<ThumbnailImage src="/api/exercise/log/1/photo" alt="Exercise" />)
  fireEvent.error(screen.getByAltText('Exercise'))
  rerender(<ThumbnailImage src="/api/exercise/log/2/photo" alt="Exercise" />)
  expect(screen.getByAltText('Exercise')).toHaveAttribute('src', '/api/exercise/log/2/photo?thumbnail=1')
})

test('reserves the same thumbnail box through loading, success and fallback failure', () => {
  const { rerender } = render(<ThumbnailImage src="/api/food/uploads/meal.jpg" alt="Meal" className="w-10 h-10 rounded" />)
  const image = screen.getByAltText('Meal')
  const box = image.parentElement!
  expect(box).toHaveClass('w-10', 'h-10')
  expect(box).toHaveAttribute('aria-busy', 'true')
  expect(screen.getByRole('status', { name: 'Loading photo' })).toBeInTheDocument()
  fireEvent.load(image)
  expect(box).toHaveAttribute('aria-busy', 'false')
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(box).toHaveClass('w-10', 'h-10')
  rerender(<ThumbnailImage src="/api/food/uploads/other.jpg" alt="Meal" className="w-10 h-10 rounded" />)
  const other = screen.getByAltText('Meal')
  fireEvent.error(other); fireEvent.error(other)
  const fallback = screen.getByRole('img', { name: 'Meal — photo unavailable' })
  expect(fallback.parentElement).toHaveClass('w-10', 'h-10')
  expect(fallback.parentElement).toHaveAttribute('aria-busy', 'false')
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})

test.each([{ alt: '' }, { alt: 'Meal', 'aria-hidden': true as const }])('decorative thumbnail %j hides its wrapper and never announces loading or failure', props => {
  const { container } = render(<ThumbnailImage src="/api/food/uploads/meal.jpg" className="w-10 h-10" {...props} />)
  const box = container.firstElementChild!
  expect(box).toHaveAttribute('aria-hidden', 'true')
  expect(box).toHaveClass('w-10', 'h-10')
  expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
  const image = container.querySelector('img')!
  fireEvent.error(image); fireEvent.error(image)
  expect(box).toHaveClass('w-10', 'h-10')
  expect(box).toHaveAttribute('aria-hidden', 'true')
  expect(box.textContent).toBe('—')
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
})

test('does not modify external, temporary, or unrelated URLs', () => {
  for (const url of ['https://external.example/photo.jpg', 'blob:photo', 'data:image/jpeg;base64,xx', '/api/food/logs']) expect(thumbnailUrl(url)).toBe(url)
})

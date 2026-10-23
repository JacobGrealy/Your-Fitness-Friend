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

test('does not modify external, temporary, or unrelated URLs', () => {
  for (const url of ['https://external.example/photo.jpg', 'blob:photo', 'data:image/jpeg;base64,xx', '/api/food/logs']) expect(thumbnailUrl(url)).toBe(url)
})

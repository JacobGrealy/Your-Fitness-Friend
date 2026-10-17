import { render, screen, fireEvent } from '@testing-library/react'
import ThenAndNow from '@/components/weight/ThenAndNow'
import type { WeightLog } from '@/types'

// FF-0027: Then and Now compares the earliest and latest weigh-ins that have a
// photo, collapsed by default.

const log = (id: string, date: string, weight: number, photo: string | null): WeightLog => ({
  id,
  user_id: '1',
  weight,
  recorded_at: `${date}T12:00:00`,
  notes: null,
  photo_url: photo,
})

const withPhotos = [
  log('3', '2026-09-01', 205, 'weight_photos/first.jpg'),
  log('2', '2026-09-20', 198, null),
  log('1', '2026-10-15', 190, 'weight_photos/latest.jpg'),
]

describe('ThenAndNow (FF-0027)', () => {
  it('starts collapsed and opens on demand', () => {
    render(<ThenAndNow logs={withPhotos} />)

    expect(screen.getByText('Then and Now')).toBeInTheDocument()
    expect(screen.queryAllByRole('img')).toHaveLength(0)

    fireEvent.click(screen.getByText('Then and Now'))

    expect(screen.getAllByRole('img')).toHaveLength(2)
  })

  it('compares the first and last photo day, not the middle entries', () => {
    render(<ThenAndNow logs={withPhotos} />)
    fireEvent.click(screen.getByText('Then and Now'))

    const [then, now] = screen.getAllByRole('img')
    expect(then).toHaveAttribute('src', expect.stringContaining('weight_photos/first.jpg'))
    expect(now).toHaveAttribute('src', expect.stringContaining('weight_photos/latest.jpg'))
    expect(screen.getByText('205.0 lbs')).toBeInTheDocument()
    expect(screen.getByText('190.0 lbs')).toBeInTheDocument()
  })

  it('describes each photo for a screen reader', () => {
    render(<ThenAndNow logs={withPhotos} />)
    fireEvent.click(screen.getByText('Then and Now'))

    expect(screen.getByAltText(/then: 205\.0 lbs/i)).toBeInTheDocument()
    expect(screen.getByAltText(/now: 190\.0 lbs/i)).toBeInTheDocument()
  })

  it('renders nothing with fewer than two photo days', () => {
    const { container, rerender } = render(
      <ThenAndNow logs={[log('1', '2026-10-15', 190, 'weight_photos/only.jpg')]} />
    )
    expect(container).toBeEmptyDOMElement()

    rerender(<ThenAndNow logs={[log('1', '2026-10-15', 190, 'a.jpg'), log('2', '2026-10-15', 188, 'b.jpg')]} />)
    // same day twice is not a comparison
    expect(container).toBeEmptyDOMElement()
  })
})

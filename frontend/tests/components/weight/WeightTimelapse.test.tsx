import { render, screen, fireEvent, act } from '@testing-library/react'
import WeightTimelapse from '@/components/weight/WeightTimelapse'
import type { WeightLog } from '@/types'

// FF-0028: a lazy timelapse over the weight photos.

const log = (id: string, date: string, weight: number, photo: string | null): WeightLog => ({
  id,
  user_id: '1',
  weight,
  recorded_at: `${date}T12:00:00`,
  notes: null,
  photo_url: photo,
})

const frames = [
  log('3', '2026-10-01', 195, 'weight_photos/c.jpg'),
  log('1', '2026-08-01', 210, 'weight_photos/a.jpg'),
  log('2', '2026-09-01', 202, 'weight_photos/b.jpg'),
]

describe('WeightTimelapse (FF-0028)', () => {
  const preloads: string[] = []

  beforeEach(() => {
    preloads.length = 0
    // jsdom has no image loader; record what the component asks for instead.
    ;(global as any).Image = class {
      set src(value: string) {
        preloads.push(value)
      }
    }
  })

  it('stays collapsed and fetches nothing until opened', () => {
    render(<WeightTimelapse logs={frames} />)

    expect(screen.getByText('Timelapse')).toBeInTheDocument()
    expect(screen.getByText('3 photos')).toBeInTheDocument()
    expect(screen.queryAllByRole('img')).toHaveLength(0)
    expect(preloads).toHaveLength(0)
  })

  it('starts at the oldest photo and steps forward through the series', () => {
    render(<WeightTimelapse logs={frames} />)
    fireEvent.click(screen.getByText('Timelapse'))

    expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('weight_photos/a.jpg'))
    expect(screen.getByText('1 / 3')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Next photo'))
    expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('weight_photos/b.jpg'))
    expect(screen.getByText('2 / 3')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Previous photo'))
    expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('weight_photos/a.jpg'))
  })

  it('wraps around the ends', () => {
    render(<WeightTimelapse logs={frames} />)
    fireEvent.click(screen.getByText('Timelapse'))

    fireEvent.click(screen.getByLabelText('Previous photo'))
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
  })

  it('preloads exactly one frame ahead', () => {
    render(<WeightTimelapse logs={frames} />)
    fireEvent.click(screen.getByText('Timelapse'))

    expect(preloads).toHaveLength(1)
    expect(preloads[0]).toContain('weight_photos/b.jpg')
  })

  it('advances on its own while playing', () => {
    jest.useFakeTimers()
    render(<WeightTimelapse logs={frames} frameMs={500} />)
    fireEvent.click(screen.getByText('Timelapse'))

    fireEvent.click(screen.getByLabelText('Play timelapse'))
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(screen.getByText('2 / 3')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Pause timelapse'))
    act(() => {
      jest.advanceTimersByTime(2000)
    })
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    jest.useRealTimers()
  })

  it('renders nothing with fewer than two photos', () => {
    const { container } = render(<WeightTimelapse logs={[log('1', '2026-10-01', 195, 'a.jpg')]} />)
    expect(container).toBeEmptyDOMElement()
  })
})

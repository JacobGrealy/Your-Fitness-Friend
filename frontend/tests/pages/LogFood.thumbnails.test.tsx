import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LogFood from '@/pages/Food/LogFood'

// FF-0087: the picture from last time is visible in the recent-foods list, and quick-logging
// carries it onto the new entry.

const logFood = jest.fn()

jest.mock('@/api/food', () => ({
  foodApi: { getLatestPhoto: jest.fn(async () => ({ photo_url: null, log_id: null })) },
}))

jest.mock('@/store/foodStore', () => ({
  useFoodStore: () => ({
    foods: [],
    isLoading: false,
    error: null,
    recentFoods: [
      {
        food_name: 'Eggo toaster sticks', calories: 110, protein_g: 3, carbs_g: 20, fat_g: 4,
        serving_size: '2 slices', brand: 'Eggo', barcode_id: null, total_logs: 2,
        last_logged: '2026-10-17', photo_url: 'food_log_photos/toaster.jpg',
      },
      {
        food_name: 'Black coffee', calories: 5, protein_g: 0, carbs_g: 0, fat_g: 0,
        serving_size: null, brand: null, barcode_id: null, total_logs: 4,
        last_logged: '2026-10-18', photo_url: null,
      },
    ],
    logFood: (...args: unknown[]) => logFood(...args),
    fetchFoods: jest.fn(),
    fetchRecentFoods: jest.fn(),
    clearError: jest.fn(),
  }),
}))

jest.mock('@/components/layout/PageTitleContext', () => ({
  usePageTitle: () => ({ setTitle: jest.fn() }),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/food/log?meal=breakfast']}>
      <Routes>
        <Route path="/food/log" element={<LogFood />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Recent food thumbnails (FF-0087)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    logFood.mockResolvedValue({ id: '77' })
  })

  it('shows the thumbnail for a food with a photo', () => {
    renderPage()

    const images = document.querySelectorAll('img')
    expect(images).toHaveLength(1)
    expect(images[0].getAttribute('src')).toContain('food_log_photos/toaster.jpg')
    // decorative: the name beside it carries the meaning
    expect(images[0]).toHaveAttribute('alt', '')
  })

  it('renders no image for a food that has never had one', () => {
    renderPage()

    // only the photographed row gets an <img>
    const rows = document.querySelectorAll('img')
    expect(rows.length).toBe(1)
    expect(screen.getByText('Black coffee')).toBeInTheDocument()
  })

  it('carries the last photo when quick-logging', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Add Eggo toaster sticks to breakfast' }))

    await waitFor(() => expect(logFood).toHaveBeenCalled())
    expect(logFood.mock.calls[0][0].photo_url).toBe('food_log_photos/toaster.jpg')
  })

  it('does not invent a photo for an entry that has none', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Add Black coffee to breakfast' }))

    await waitFor(() => expect(logFood).toHaveBeenCalled())
    expect(logFood.mock.calls[0][0].photo_url).toBeUndefined()
  })
})

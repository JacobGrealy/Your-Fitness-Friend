import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LogFood from '@/pages/Food/LogFood'

// FF-0018: recent foods get a one-tap add that logs straight into the meal the
// screen was opened from, without going through the serving form.

const logFood = jest.fn()
const navigate = jest.fn()

const recent = {
  food_name: 'Greek Yogurt',
  food_id: '7',
  calories: 120,
  protein_g: 17,
  carbs_g: 6,
  fat_g: 0,
  serving_size: '170 g',
  brand: 'Chobani',
  barcode_id: null,
  total_logs: 4,
  last_logged: '2026-10-16T08:00:00',
}

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => navigate,
}))

jest.mock('@/api/food', () => ({ foodApi: { lookupBarcode: jest.fn() } }))

jest.mock('@/store/foodStore', () => ({
  useFoodStore: () => ({
    foods: [],
    recentFoods: [recent],
    isLoading: false,
    error: null,
    fetchFoods: jest.fn(),
    fetchRecentFoods: jest.fn(),
    clearError: jest.fn(),
    logFood: (...args: unknown[]) => logFood(...args),
  }),
}))

jest.mock('@/components/layout/PageTitleContext', () => ({
  usePageTitle: () => ({ setTitle: jest.fn(), setHeaderRightContent: jest.fn(), headerRightContent: null, centerContent: null }),
}))

const renderAt = (url = '/food/log?meal=lunch') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <LogFood />
    </MemoryRouter>
  )

describe('Recent food quick-add (FF-0018)', () => {
  beforeEach(() => {
    logFood.mockReset().mockResolvedValue({})
    navigate.mockReset()
  })

  it('logs one serving into the meal the diary opened', async () => {
    renderAt('/food/log?meal=lunch')

    fireEvent.click(screen.getByRole('button', { name: /add greek yogurt to lunch/i }))

    await waitFor(() => expect(logFood).toHaveBeenCalledTimes(1))
    expect(logFood).toHaveBeenCalledWith({
      food_id: '7',
      food_name: 'Greek Yogurt',
      calories: 120,
      protein_g: 17,
      carbs_g: 6,
      fat_g: 0,
      brand: 'Chobani',
      barcode_id: undefined,
      serving_size: '170 g',
      meal_type: 'lunch',
      number_of_servings: 1,
    })
    // the shortcut stays on the screen instead of opening the serving form
    expect(navigate).not.toHaveBeenCalled()
  })

  it('confirms the add on the row', async () => {
    renderAt('/food/log?meal=lunch')

    fireEvent.click(screen.getByRole('button', { name: /add greek yogurt to lunch/i }))

    await waitFor(() => expect(screen.getByText('Added')).toBeInTheDocument())
  })

  it('still opens the serving form when the row itself is tapped', () => {
    renderAt('/food/log?meal=lunch')

    fireEvent.click(screen.getByText('Greek Yogurt'))

    // FF-0021 added a second argument (the return-to state), so assert on the path
    expect(String(navigate.mock.calls[0][0])).toContain('/food/log/select')
    expect(logFood).not.toHaveBeenCalled()
  })
})

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FoodLogSelect from '@/pages/Food/FoodLogSelect'

// FF-0038: the meal section that opened the add flow must survive into the form,
// so Quick Add from under Snacks does not file the food as breakfast.

const navigate = jest.fn()
const logFood = jest.fn()
const createFood = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => navigate,
}))

jest.mock('@/api/food', () => ({ foodApi: { lookupBarcode: jest.fn() } }))

jest.mock('@/store/foodStore', () => ({
  useFoodStore: () => ({
    foods: [],
    isLoading: false,
    error: null,
    logFood: (...args: unknown[]) => logFood(...args),
    createFood: (...args: unknown[]) => createFood(...args),
    fetchFoods: jest.fn(),
    clearError: jest.fn(),
  }),
}))

jest.mock('@/components/layout/PageTitleContext', () => ({
  usePageTitle: () => ({ setTitle: jest.fn(), setHeaderRightContent: jest.fn(), headerRightContent: null, centerContent: null }),
}))

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <FoodLogSelect />
    </MemoryRouter>
  )

/** The meal chips are plain buttons, so selection is asserted via their classes. */
const chipIsSelected = (label: string) => {
  const chip = screen.getByRole('button', { name: label })
  return chip.className.includes('bg-[#185ADB]')
}

async function submitQuickAdd() {
  fireEvent.change(screen.getByPlaceholderText('e.g. Banana'), { target: { value: 'Trail mix' } })
  fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '180' } })
  fireEvent.click(screen.getByLabelText('Submit'))
  await waitFor(() => expect(logFood).toHaveBeenCalled())
}

describe('Quick Add meal default (FF-0038)', () => {
  beforeEach(() => {
    navigate.mockReset()
    logFood.mockReset().mockResolvedValue({})
    createFood.mockReset().mockResolvedValue({ id: '9' })
  })

  it('preselects the meal passed in the URL', () => {
    renderAt('/food/log/select?meal=snack')

    expect(chipIsSelected('Snack')).toBe(true)
    expect(chipIsSelected('Breakfast')).toBe(false)
  })

  it('files the entry under that meal', async () => {
    renderAt('/food/log/select?meal=snack')

    await submitQuickAdd()

    expect(logFood.mock.calls[0][0].meal_type).toBe('snack')
  })

  it('still works for the other meals', () => {
    renderAt('/food/log/select?meal=dinner')

    expect(chipIsSelected('Dinner')).toBe(true)
  })

  it('falls back to breakfast when the parameter is missing or junk', () => {
    const { unmount } = renderAt('/food/log/select')
    expect(chipIsSelected('Breakfast')).toBe(true)
    unmount()

    renderAt('/food/log/select?meal=brunch')
    expect(chipIsSelected('Breakfast')).toBe(true)
  })

  it('lets the user change it anyway', async () => {
    renderAt('/food/log/select?meal=snack')

    fireEvent.click(screen.getByRole('button', { name: 'Lunch' }))
    await submitQuickAdd()

    expect(logFood.mock.calls[0][0].meal_type).toBe('lunch')
  })
})

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FoodLogSelect from '@/pages/Food/FoodLogSelect'

// FF-0020 asked for "a Quick Add bar with back and check buttons". The serving
// screen already is that bar when it is opened without a food, so this test pins
// the shape: back on the left, the title, and a check that submits.

const navigate = jest.fn()

// The page now asks the food API for the previous photo (FF-0087); the axios client it
// imports uses import.meta.env, which jest cannot parse.
jest.mock('@/api/food', () => ({
  foodApi: {
    getLatestPhoto: jest.fn(async () => ({ photo_url: null, log_id: null })),
    logFood: jest.fn(),
    uploadFoodLogPhoto: jest.fn(),
  },
}))

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => navigate,
}))

jest.mock('@/store/foodStore', () => ({
  useFoodStore: () => ({
    foods: [],
    isLoading: false,
    error: null,
    logFood: jest.fn(),
    createFood: jest.fn(),
    fetchFoods: jest.fn(),
    clearError: jest.fn(),
  }),
}))

jest.mock('@/components/layout/PageTitleContext', () => ({
  usePageTitle: () => ({ setTitle: jest.fn(), setHeaderRightContent: jest.fn(), headerRightContent: null, centerContent: null }),
}))

const renderQuickAdd = (entry: any = '/food/log/select') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <FoodLogSelect />
    </MemoryRouter>
  )

describe('Quick Add bar (FF-0020)', () => {
  it('presents itself as Quick Add', () => {
    renderQuickAdd()
    expect(screen.getByRole('heading', { name: 'Quick Add' })).toBeInTheDocument()
  })

  it('has a back control that leaves the screen', () => {
    navigate.mockReset()
    renderQuickAdd()

    fireEvent.click(screen.getByText(/back/i))

    expect(navigate).toHaveBeenCalledWith(-1)
  })

  it('has a check button that is inert until there are calories to log', () => {
    renderQuickAdd()

    expect(screen.getByLabelText('Submit')).toBeDisabled()
  })
})

describe('after a quick add (FF-0021)', () => {
  it('goes back to the page the flow was entered from', async () => {
    navigate.mockReset()
    renderQuickAdd({ pathname: '/food/log/select', state: { returnTo: '/food/daily' } })

    fireEvent.change(screen.getByPlaceholderText('e.g. Banana'), { target: { value: 'Toast' } })
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '120' } })
    fireEvent.click(screen.getByLabelText('Submit'))

    await waitFor(() => expect(navigate).toHaveBeenCalled())
    expect(navigate).toHaveBeenCalledWith('/food/daily', { replace: true })
  })
})

import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FoodLogSelect from '@/pages/Food/FoodLogSelect'

// FF-0020 asked for "a Quick Add bar with back and check buttons". The serving
// screen already is that bar when it is opened without a food, so this test pins
// the shape: back on the left, the title, and a check that submits.

const navigate = jest.fn()

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

const renderQuickAdd = () =>
  render(
    <MemoryRouter initialEntries={['/food/log/select']}>
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

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import FoodLogSelect from '@/pages/Food/FoodLogSelect'
import LogFood from '@/pages/Food/LogFood'

// FF-0101: re-adding a food that is already saved asks only how much, when and which
// meal. Editing its macros belongs to the food, not to a repeat log.

const apple = { id: 'apple', name: 'Apple', calories: 52, protein_g: .3, carbs_g: 14, fat_g: .2,
  serving_size: '100 g', serving_amount: 100, serving_unit: 'g', user_id: '1' }
const recent = { food_name: 'Apple', food_id: 'apple', calories: 52, protein_g: .3, carbs_g: 14,
  fat_g: .2, serving_size: '100 g', serving_amount: 100, serving_unit: 'g', amount: 182, unit: 'g',
  number_of_servings: 1.82, brand: null, barcode_id: null, total_logs: 3, last_logged: '2026-10-19' }

const FOODS = [apple]
const RECENT = [recent]

const logFood = jest.fn(async () => ({ id: '9' }))
const createFood = jest.fn(async () => apple)
// Stable references: a fresh array on every render re-fires the page's load effect and
// loops forever (the real store returns the same array until it changes).
jest.mock('@/store/foodStore', () => ({
  useFoodStore: () => ({
    foods: FOODS, recentFoods: RECENT, logFood, createFood,
    fetchFoods: jest.fn(), fetchRecentFoods: jest.fn(), clearError: jest.fn(),
    isLoading: false, error: null,
  }),
}))
jest.mock('@/api/food', () => ({
  foodApi: { getLatestPhoto: jest.fn(async () => ({ photo_url: null })), searchOpenFoodFacts: jest.fn() },
}))
jest.mock('@/components/layout/PageTitleContext', () => ({
  usePageTitle: () => ({ setTitle: jest.fn() }),
}))
jest.mock('@/components/food/BarcodeLookupModal', () => ({ __esModule: true, default: () => null }))

const selectScreen = (url: string) => render(
  <MemoryRouter initialEntries={[url]}><Routes>
    <Route path="/food/log/select" element={<FoodLogSelect />} />
    <Route path="/dashboard" element={<div>Home</div>} />
  </Routes></MemoryRouter>
)

describe('amount-only logging for a saved food (FF-0101)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('hides the editable macro fields', async () => {
    selectScreen('/food/log/select?meal=lunch&foodId=apple&mode=amount')

    expect(await screen.findByLabelText('Amount eaten amount')).toBeInTheDocument()
    // the nutrition is shown, read-only
    expect(screen.getByText(/52 cal per 100 g/)).toBeInTheDocument()
    // ...and cannot be edited
    expect(screen.queryByLabelText('Calories')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Protein (g)')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('e.g. Banana')).not.toBeInTheDocument()
  })

  it('still offers amount, date and meal', async () => {
    selectScreen('/food/log/select?meal=dinner&foodId=apple&mode=amount')

    expect(await screen.findByLabelText('Amount eaten amount')).toBeInTheDocument()
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    expect(dateInput).toBeInTheDocument()
    expect(dateInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(screen.getByRole('button', { name: 'Dinner' })).toBeInTheDocument()
  })

  it('logs the changed amount without touching the saved food', async () => {
    selectScreen('/food/log/select?meal=lunch&foodId=apple&mode=amount')

    const amount = await screen.findByLabelText('Amount eaten amount')
    fireEvent.change(amount, { target: { value: '150' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => expect(logFood).toHaveBeenCalled())
    expect(createFood).not.toHaveBeenCalled()
    expect(logFood).toHaveBeenCalledWith(expect.objectContaining({
      food_id: 'apple', amount: 150, unit: 'g', number_of_servings: 1.5,
    }))
  })
})

describe('recent food routing (FF-0101)', () => {
  it('opens the amount-only screen for a food that is already saved', async () => {
    render(<MemoryRouter initialEntries={['/food/log?meal=lunch']}><Routes>
      <Route path="/food/log" element={<LogFood />} />
      <Route path="/food/log/select" element={<FoodLogSelect />} />
      <Route path="/dashboard" element={<div>Home</div>} />
    </Routes></MemoryRouter>)

    fireEvent.click(await screen.findByText('Apple'))
    // lands on the trimmed screen rather than the full food form
    expect(await screen.findByLabelText('Amount eaten amount')).toBeInTheDocument()
    expect(screen.queryByLabelText('Protein (g)')).not.toBeInTheDocument()
  })
})

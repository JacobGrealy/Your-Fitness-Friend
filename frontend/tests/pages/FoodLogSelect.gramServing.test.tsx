import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import FoodLogSelect from '@/pages/Food/FoodLogSelect'

/**
 * FF-0134: an external food whose package serving is a real mass must arrive with
 * that mass as its editable reference, so logging a weighed portion scales from the
 * serving the nutrition was written for — not from an assumed 100 g.
 */
const bar = { id: 'off:4000000000000', name: 'Review Bar', calories: 160, protein_g: 4,
  carbs_g: 16, fat_g: 8, serving_size: '1 bar (40 g)', serving_amount: 40, serving_unit: 'g',
  barcode_id: '4000000000000' }
const externalFood = { ...bar, token: 'signed-token' }
const logFood = jest.fn(async () => ({ id: '55' }))
const createFood = jest.fn()
const fetchFoods = jest.fn()
const clearError = jest.fn()
jest.mock('@/store/foodStore', () => ({ useFoodStore: () => ({
  foods: [], logFood, createFood, fetchFoods, clearError, isLoading: false, error: null,
}) }))
jest.mock('@/api/food', () => ({ foodApi: { getLatestPhoto: jest.fn(async () => ({ photo_url: null })) } }))
jest.mock('@/components/layout/PageTitleContext', () => ({ usePageTitle: () => ({ setTitle: jest.fn() }) }))

it('prefills a detected gram serving and halves the nutrition at 20 g', async () => {
  render(
    <MemoryRouter
      initialEntries={[{ pathname: '/food/log/select', state: { externalFood }, search: '?meal=lunch' }]}
    >
      <Routes>
        <Route path="/food/log/select" element={<FoodLogSelect />} />
      </Routes>
    </MemoryRouter>,
  )

  const reference = await screen.findByLabelText('Serving Size amount')
  expect(reference).toHaveValue(40)
  expect(screen.getByLabelText('Serving Size unit')).toHaveTextContent('g')
  const amount = screen.getByLabelText('Amount eaten amount')
  expect(amount).toHaveValue(40)
  // The prefilled portion is the detected serving, so its numbers are the serving's.
  expect(screen.getByText(/160 cal/)).toBeInTheDocument()

  fireEvent.change(amount, { target: { value: '20' } })
  expect(screen.getByText(/80 cal/)).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
  await waitFor(() => expect(logFood).toHaveBeenCalled())
  // Half a serving, on the same 40 g reference: 80 kcal and half each macro.
  expect(logFood).toHaveBeenCalledWith(expect.objectContaining({
    amount: 20, unit: 'g', number_of_servings: 0.5,
    calories: 80, protein_g: 2, carbs_g: 8, fat_g: 4,
    calories_per_serving: 160, serving_amount: 40, serving_unit: 'g',
  }))
  // The imported reference came from the provider; nothing is rewritten client-side.
  expect(createFood).not.toHaveBeenCalled()
})

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import FoodLogSelect from '@/pages/Food/FoodLogSelect'

const food = { id: 'apple', name: 'Apple', calories: 52, protein_g: .3, carbs_g: 14, fat_g: .2,
  serving_size: '100 g', serving_amount: 100, serving_unit: 'g' }
const foods = [food]
const logFood = jest.fn(async () => ({ id: '99' }))
const createFood = jest.fn(async () => food)
const fetchFoods = jest.fn()
const clearError = jest.fn()
jest.mock('@/store/foodStore', () => ({ useFoodStore: () => ({
  foods, logFood, createFood, fetchFoods, clearError, isLoading: false, error: null,
}) }))
jest.mock('@/api/food', () => ({ foodApi: { getLatestPhoto: jest.fn(async () => ({ photo_url: null })) } }))
jest.mock('@/components/layout/PageTitleContext', () => ({ usePageTitle: () => ({ setTitle: jest.fn() }) }))

it('logs 182 g against a saved 100 g reference without changing reference nutrition', async () => {
  render(<MemoryRouter initialEntries={['/food/log/select/apple?meal=lunch']}><Routes>
    <Route path="/food/log/select/:foodId" element={<FoodLogSelect />} />
  </Routes></MemoryRouter>)
  const amount = await screen.findByLabelText('Amount eaten amount')
  expect(screen.getByLabelText('Serving Size amount')).toHaveValue(100)
  fireEvent.change(amount, { target: { value: '182' } })
  expect(screen.getByText(/94.64 cal/)).toBeInTheDocument()
  const units = screen.getByLabelText('Amount eaten unit')
  expect(units).toHaveTextContent('oz')
  expect(units).not.toHaveTextContent('ml')
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
  await waitFor(() => expect(logFood).toHaveBeenCalled())
  expect(createFood).toHaveBeenCalledWith(expect.objectContaining({ calories: 52, serving_amount: 100, serving_unit: 'g' }))
  expect(logFood).toHaveBeenCalledWith(expect.objectContaining({ amount: 182, unit: 'g',
    number_of_servings: 1.82, calories_per_serving: 52, carbs_g: 25.48 }))
})

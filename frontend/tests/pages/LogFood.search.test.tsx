import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LogFood from '@/pages/Food/LogFood'
import FoodLogSelect from '@/pages/Food/FoodLogSelect'

const local = { id:'1', name:'My apple', calories:52, protein_g:.3, carbs_g:14, fat_g:.2,
  serving_amount:100, serving_unit:'g', serving_size:'100 g', barcode_id:'0123456789012' }
const remote = { ...local, name:'Orchard apple', barcode_id:'9999999999999', token:'signed-reference', source:'openfoodfacts' }
const foods = [local]
const recentFoods: unknown[] = []
const searchOpenFoodFacts = jest.fn()
const fetchFoods = jest.fn()
const fetchRecentFoods = jest.fn()
const clearError = jest.fn()
const createFood = jest.fn()
const logFood = jest.fn(async () => ({ id:'42' }))
jest.mock('@/api/food', () => ({ foodApi: {
  searchOpenFoodFacts: (...args: unknown[]) => searchOpenFoodFacts(...args),
  getLatestPhoto: jest.fn(async () => ({ photo_url:null })),
} }))
jest.mock('@/store/foodStore', () => ({ useFoodStore: () => ({
  foods, recentFoods, fetchFoods, fetchRecentFoods, clearError, createFood, logFood,
  isLoading:false, error:null,
}) }))
jest.mock('@/components/layout/PageTitleContext', () => ({ usePageTitle: () => ({setTitle:jest.fn()}) }))
jest.mock('@/components/food/BarcodeLookupModal', () => ({ __esModule:true, default: () => null }))

function mount() {
  return render(<MemoryRouter initialEntries={['/food/log?meal=lunch']}><Routes>
    <Route path="/food/log" element={<LogFood />} />
    <Route path="/food/log/select" element={<FoodLogSelect />} />
    <Route path="/food/daily" element={<div>Diary destination</div>} />
  </Routes></MemoryRouter>)
}
const type = (value: string) => fireEvent.change(screen.getByLabelText('Search foods'), { target:{ value } })
const search = () => fireEvent.click(screen.getByRole('button', { name:'Search' }))

beforeEach(() => {
  jest.clearAllMocks()
  searchOpenFoodFacts.mockResolvedValue({ results:[remote], page:1, has_more:false, omitted:0 })
})

it('shows local matches as you type but requests external results only on Search', async () => {
  mount()
  type('apple')
  await screen.findByText('My apple')
  expect(searchOpenFoodFacts).not.toHaveBeenCalled()
  search()
  const remoteName = await screen.findByText('Orchard apple')
  expect(searchOpenFoodFacts).toHaveBeenCalledWith('apple', 1)
  expect(screen.getByText('My apple').compareDocumentPosition(remoteName) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(screen.getByRole('button', {name:'Quick Add'})).toBeInTheDocument()
})

it('deduplicates external products already in the local database', async () => {
  searchOpenFoodFacts.mockResolvedValue({results:[{...remote, name:'Same external apple', barcode_id:'123456789012'}], has_more:false, omitted:0})
  mount(); type('apple'); search()
  await screen.findByText('No additional foods with complete nutrition found.')
  expect(screen.queryByText('Same external apple')).not.toBeInTheDocument()
  expect(await screen.findByText('My apple')).toBeInTheDocument()
})

it('preserves local matches during a provider outage', async () => {
  searchOpenFoodFacts.mockRejectedValue({response:{data:{error:'Provider temporarily unavailable'}}})
  mount(); type('apple'); search()
  expect(await screen.findByRole('alert')).toHaveTextContent('Provider temporarily unavailable')
  expect(await screen.findByText('My apple')).toBeInTheDocument()
})

it('ignores an old response after the user changes the query', async () => {
  let resolve!: (value: unknown) => void
  searchOpenFoodFacts.mockImplementationOnce(() => new Promise(r => { resolve=r }))
  mount(); type('apple'); search()
  await waitFor(() => expect(searchOpenFoodFacts).toHaveBeenCalled())
  type('grapes')
  resolve({results:[remote], has_more:false, omitted:0})
  await waitFor(() => expect(screen.queryByText('Searching Open Food Facts…')).not.toBeInTheDocument())
  expect(screen.queryByText('Orchard apple')).not.toBeInTheDocument()
})

it('reuses the existing logging form and imports only on logging 182 g', async () => {
  mount(); type('apple')
  fireEvent.keyDown(screen.getByLabelText('Search foods'), { key:'Enter' })
  fireEvent.click(await screen.findByText('Orchard apple'))
  const amount = await screen.findByLabelText('Amount eaten amount')
  expect(createFood).not.toHaveBeenCalled()
  expect(logFood).not.toHaveBeenCalled()
  fireEvent.change(amount,{target:{value:'182'}})
  fireEvent.click(screen.getByRole('button',{name:'Submit'}))
  await waitFor(() => expect(logFood).toHaveBeenCalledWith(expect.objectContaining({
    external_food_token:'signed-reference', amount:182, unit:'g', meal_type:'lunch',
    number_of_servings:1.82, calories_per_serving:52,
  })))
  expect(createFood).not.toHaveBeenCalled()
})

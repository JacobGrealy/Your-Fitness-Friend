import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import EditFoodLog from '@/pages/Food/EditFoodLog'
import EditFoodDetails from '@/pages/Food/EditFoodDetails'
import { useFoodStore } from '@/store/foodStore'

// FF-0086: the entry's edit screen is about the LOG (how much of it you ate), and the
// food's own details live one step away. Changing the serving count must move the totals.

const apiGetFoodLog = jest.fn()
const apiUpdateFoodLog = jest.fn()

jest.mock('@/api/food', () => ({
  foodApi: {
    getFoodLog: (...args: unknown[]) => apiGetFoodLog(...args),
    updateFoodLog: (...args: unknown[]) => apiUpdateFoodLog(...args),
    uploadFoodLogPhoto: jest.fn(async () => ({ photo_url: 'meal_photos/x.jpg' })),
    deleteFoodLogPhoto: jest.fn(async () => ({})),
    deleteFoodLog: jest.fn(async () => ({})),
    getFoodLogs: jest.fn(async () => ({ logs: [], total: 0 })),
    getDailySummary: jest.fn(async () => ({})),
  },
}))

const LOG = {
  id: 'food-9',
  food_name: 'Eggo french toaster sticks',
  calories: 110, protein_g: 3, carbs_g: 20, fat_g: 4,
  calories_per_serving: 110, protein_per_serving: 3,
  carbs_per_serving: 20, fat_per_serving: 4,
  number_of_servings: 1,
  serving_size: '2 slices (90 g)',
  brand: 'Eggo',
  barcode_id: null,
  date: '2026-10-18', meal_type: 'breakfast', photo_url: null,
}

function renderLogScreen() {
  return render(
    <MemoryRouter initialEntries={['/food/log/food-9/edit']}>
      <Routes>
        <Route path="/food/log/:id/edit" element={<EditFoodLog />} />
        <Route path="/food/log/:id/food" element={<EditFoodDetails />} />
      </Routes>
    </MemoryRouter>
  )
}

const servingsInput = () => screen.getByLabelText('Number of servings') as HTMLInputElement

describe('EditFoodLog serving screen (FF-0086)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    apiGetFoodLog.mockResolvedValue({ ...LOG })
    apiUpdateFoodLog.mockResolvedValue({ ...LOG })
    useFoodStore.setState({ foodLogs: [], isLoading: false, error: null, uploadedPhotoUrl: null })
  })

  it('shows the log totals for its serving count', async () => {
    renderLogScreen()
    await waitFor(() => expect(servingsInput().value).toBe('1'))
    expect(screen.getByText('110 kcal')).toBeInTheDocument()
  })

  it('rescales the totals as the count changes, before saving', async () => {
    renderLogScreen()
    await waitFor(() => expect(servingsInput().value).toBe('1'))

    fireEvent.change(servingsInput(), { target: { value: '2' } })
    // The reported bug, on screen: 2 servings of a 110 kcal food is 220.
    expect(await screen.findByText('220 kcal')).toBeInTheDocument()
  })

  it('offers quick selections that set the count', async () => {
    renderLogScreen()
    await waitFor(() => expect(servingsInput().value).toBe('1'))

    fireEvent.click(screen.getByRole('button', { name: '½' }))

    expect(servingsInput().value).toBe('0.5')
    expect(await screen.findByText('55 kcal')).toBeInTheDocument()
  })

  it('sends per-serving values plus the count, so the server does the maths', async () => {
    renderLogScreen()
    await waitFor(() => expect(servingsInput().value).toBe('1'))
    fireEvent.change(servingsInput(), { target: { value: '1.5' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(apiUpdateFoodLog).toHaveBeenCalled())
    const payload = apiUpdateFoodLog.mock.calls[0][1]
    expect(payload.number_of_servings).toBe(1.5)
    expect(payload.calories_per_serving).toBe(110)
    // totals are the server's business now
    expect(payload).not.toHaveProperty('calories')
  })

  it('keeps the food properties off this screen and one step away', async () => {
    renderLogScreen()
    await waitFor(() => expect(servingsInput().value).toBe('1'))

    expect(screen.queryByLabelText(/per serving/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /edit food details/i }))

    expect(await screen.findByText('Food details')).toBeInTheDocument()
    expect(screen.getByLabelText('Calories per serving')).toBeInTheDocument()
  })
})

describe('EditFoodDetails (FF-0086)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    apiGetFoodLog.mockResolvedValue({ ...LOG })
    apiUpdateFoodLog.mockResolvedValue({ ...LOG })
    useFoodStore.setState({ foodLogs: [], isLoading: false, error: null, uploadedPhotoUrl: null })
  })

  function renderFoodScreen() {
    return render(
      <MemoryRouter initialEntries={['/food/log/food-9/food']}>
        <Routes>
          <Route path="/food/log/:id/food" element={<EditFoodDetails />} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('edits macros per serving and offers no serving count at all', async () => {
    renderFoodScreen()

    const calories = await screen.findByLabelText('Calories per serving')
    expect((calories as HTMLInputElement).value).toBe('110')
    // A serving count is a log property: it must not appear here.
    expect(screen.queryByLabelText('Number of servings')).not.toBeInTheDocument()
    expect(screen.queryByText(/number of servings/i)).not.toBeInTheDocument()
  })

  it('sends the edited per-serving values', async () => {
    renderFoodScreen()
    const calories = await screen.findByLabelText('Calories per serving')

    fireEvent.change(calories, { target: { value: '120' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(apiUpdateFoodLog).toHaveBeenCalled())
    const payload = apiUpdateFoodLog.mock.calls[0][1]
    expect(payload.calories_per_serving).toBe(120)
    expect(payload).not.toHaveProperty('number_of_servings')
    expect(payload).not.toHaveProperty('calories')
  })

  it('works for an entry with no food behind it, editing its own snapshot', async () => {
    apiGetFoodLog.mockResolvedValue({
      ...LOG, food_id: null, calories_per_serving: null, protein_per_serving: null,
      carbs_per_serving: null, fat_per_serving: null,
    })

    renderFoodScreen()

    // Falls back to the stored totals for a single serving.
    const calories = await screen.findByLabelText('Calories per serving')
    expect((calories as HTMLInputElement).value).toBe('110')
  })
})

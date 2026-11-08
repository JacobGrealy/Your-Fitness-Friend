import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import FoodLogSelect from '@/pages/Food/FoodLogSelect'

// FF-0087: a photo can be attached while logging, and the last one is offered by default.

const getLatestPhoto = jest.fn()
const uploadFoodLogPhoto = jest.fn()
const logFood = jest.fn()
const createFood = jest.fn()

jest.mock('@/api/food', () => ({
  foodApi: {
    getLatestPhoto: (...args: unknown[]) => getLatestPhoto(...args),
  },
}))

jest.mock('@/store/foodStore', () => ({
  useFoodStore: () => ({
    foods: [],
    isLoading: false,
    logFood: (...args: unknown[]) => logFood(...args),
    uploadFoodLogPhoto: (...args: unknown[]) => uploadFoodLogPhoto(...args),
    createFood: (...args: unknown[]) => createFood(...args),
    fetchFoods: jest.fn(),
    error: null,
    clearError: jest.fn(),
  }),
}))

jest.mock('@/components/layout/PageTitleContext', () => ({
  usePageTitle: () => ({ setTitle: jest.fn() }),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/food/log/select?meal=lunch&name=Eggo%20toaster%20sticks&calories=110']}>
      <Routes>
        <Route path="/food/log/select" element={<FoodLogSelect />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('FoodLogSelect photo at creation (FF-0087)', () => {
  beforeAll(() => {
    Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:preview') })
    Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: jest.fn() })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    createFood.mockResolvedValue({ id: '42' })
    logFood.mockResolvedValue({ id: '99' })
    uploadFoodLogPhoto.mockResolvedValue({ photo_url: 'food_log_photos/new.jpg' })
  })

  it('keeps Saving visible through creation, logging and photo attachment, without duplicate writes', async () => {
    let finishFood!: (value: unknown) => void
    let finishLog!: (value: unknown) => void
    let finishPhoto!: (value: unknown) => void
    createFood.mockReturnValueOnce(new Promise(done => { finishFood = done }))
    logFood.mockReturnValueOnce(new Promise(done => { finishLog = done }))
    uploadFoodLogPhoto.mockReturnValueOnce(new Promise(done => { finishPhoto = done }))
    getLatestPhoto.mockResolvedValue({ photo_url: null })
    renderPage()
    await screen.findByRole('button', { name: 'Add photo' })
    const file = new File(['x'], 'lunch.jpg', { type: 'image/jpeg' })
    fireEvent.change(document.querySelector('[data-testid="photo-input-gallery"]')!, { target: { files: [file] } })
    const submit = screen.getByRole('button', { name: 'Submit' })
    fireEvent.click(submit); fireEvent.click(submit)
    await screen.findByRole('button', { name: 'Saving food' })
    expect(createFood).toHaveBeenCalledTimes(1)
    expect(logFood).not.toHaveBeenCalled()
    await act(async () => finishFood({ id: '42' }))
    expect(submit).toBeDisabled()
    expect(logFood).toHaveBeenCalledTimes(1)
    await act(async () => finishLog({ id: '99' }))
    expect(submit).toBeDisabled()
    expect(screen.getByText('Saving…')).toBeInTheDocument()
    expect(uploadFoodLogPhoto).toHaveBeenCalledTimes(1)
    await act(async () => finishPhoto('new.jpg'))
  })

  it('retries a failed attachment on the saved log instead of creating another log', async () => {
    getLatestPhoto.mockResolvedValue({ photo_url: null })
    uploadFoodLogPhoto.mockRejectedValueOnce(new Error('Offline'))
    renderPage()
    await screen.findByRole('button', { name: 'Add photo' })
    fireEvent.change(document.querySelector('[data-testid="photo-input-gallery"]')!, { target: { files: [new File(['x'], 'lunch.jpg', { type: 'image/jpeg' })] } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    await waitFor(() => expect(uploadFoodLogPhoto).toHaveBeenCalledTimes(1))
    expect(await screen.findByRole('alert')).toHaveTextContent('Food logged; photo attachment failed')
    expect(screen.getByPlaceholderText('e.g. Banana')).toBeDisabled()
    expect(screen.getByLabelText('Date')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Lunch', exact: true })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Retry photo' }))
    await waitFor(() => expect(uploadFoodLogPhoto).toHaveBeenCalledTimes(2))
    expect(uploadFoodLogPhoto).toHaveBeenLastCalledWith('99', expect.any(File))
    expect(logFood).toHaveBeenCalledTimes(1)
    expect(createFood).toHaveBeenCalledTimes(1)
  })

  it('offers the photo from the last log', async () => {
    getLatestPhoto.mockResolvedValue({ photo_url: 'food_log_photos/last.jpg', log_id: 12 })

    renderPage()

    expect(await screen.findByAltText('Photo from your last log')).toBeInTheDocument()
    expect(screen.getByText(/saving copies it onto this entry/i)).toBeInTheDocument()
  })

  it('shows nothing when the food has never been photographed', async () => {
    getLatestPhoto.mockResolvedValue({ photo_url: null, log_id: null })

    renderPage()

    expect(await screen.findByRole('button', { name: 'Add photo' })).toBeInTheDocument()
    expect(screen.queryByAltText('Photo from your last log')).not.toBeInTheDocument()
  })

  it('sends the carried photo so the server can copy it', async () => {
    getLatestPhoto.mockResolvedValue({ photo_url: 'food_log_photos/last.jpg', log_id: 12 })

    renderPage()
    await screen.findByAltText('Photo from your last log')
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => expect(logFood).toHaveBeenCalled())
    expect(logFood.mock.calls[0][0].photo_url).toBe('food_log_photos/last.jpg')
  })

  it('uploads a freshly picked photo to the log it just created', async () => {
    getLatestPhoto.mockResolvedValue({ photo_url: null, log_id: null })

    renderPage()
    await screen.findByRole('button', { name: 'Add photo' })

    // pick a file through the chooser's gallery input
    const input = document.querySelector('[data-testid="photo-input-gallery"]') as HTMLInputElement
    const file = new File(['x'], 'lunch.jpg', { type: 'image/jpeg' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(await screen.findByAltText('Selected photo')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => expect(uploadFoodLogPhoto).toHaveBeenCalledWith('99', file))
    // a picked file is not also sent as a carried path
    expect(logFood.mock.calls[0][0].photo_url).toBeUndefined()
  })
})

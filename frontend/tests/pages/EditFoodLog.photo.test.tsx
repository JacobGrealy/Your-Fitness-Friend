import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import EditFoodLog from '@/pages/Food/EditFoodLog'
import { useFoodStore } from '@/store/foodStore'

// FF-0075: the store's uploadedPhotoUrl is cross-page state, and using it as a control-
// flow guard cancelled uploads. Attaching a photo to two entries in a row lost the
// second one, silently, because a value from the first screen made `!uploadedPhotoUrl`
// false and the upload was skipped entirely.

const apiGetFoodLogById = jest.fn()
const apiUpdateFoodLog = jest.fn()
const apiUploadFoodLogPhoto = jest.fn()

jest.mock('@/api/food', () => ({
  foodApi: {
    getFoodLog: (...args: unknown[]) => apiGetFoodLogById(...args),
    updateFoodLog: (...args: unknown[]) => apiUpdateFoodLog(...args),
    uploadFoodLogPhoto: (...args: unknown[]) => apiUploadFoodLogPhoto(...args),
    deleteFoodLogPhoto: jest.fn(async () => ({})),
    getFoodLogs: jest.fn(async () => ({ logs: [], total: 0 })),
    getDailySummary: jest.fn(async () => ({})),
  },
}))

const LOG = {
  id: 'food-1',
  food_name: 'Greek Yogurt',
  calories: 90,
  protein_g: 9,
  carbs_g: 6,
  fat_g: 0,
  number_of_servings: 1,
  serving_size: '170 g',
  brand: 'Fage',
  barcode_id: null,
  date: '2026-10-17',
  meal_type: 'breakfast',
  photo_url: 'meal_photos/own-photo.jpg',
}

function renderEdit() {
  return render(
    <MemoryRouter initialEntries={['/food/log/food-1/edit']}>
      <Routes>
        <Route path="/food/log/:id/edit" element={<EditFoodLog />} />
        <Route path="/food/daily" element={<p>diary</p>} />
      </Routes>
    </MemoryRouter>
  )
}

const pickFile = () => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, {
    target: { files: [new File(['x'], 'meal.jpg', { type: 'image/jpeg' })] },
  })
}

describe('EditFoodLog photo handling (FF-0075)', () => {
  beforeAll(() => {
    Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:preview') })
    Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: jest.fn() })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    apiGetFoodLogById.mockResolvedValue({ ...LOG })
    apiUpdateFoodLog.mockResolvedValue({ ...LOG })
    apiUploadFoodLogPhoto.mockResolvedValue({ photo_url: 'meal_photos/fresh.jpg' })
    useFoodStore.setState({
      // The stale value that cancelled the upload: another log's photo from earlier.
      uploadedPhotoUrl: 'meal_photos/some-other-log.jpg',
      foodLogs: [],
      isLoading: false,
      error: null,
    })
  })

  it('still uploads a picked file when the store holds another log\u2019s URL', async () => {
    renderEdit()
    await screen.findByAltText('Current photo')

    pickFile()
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    // The regression: this used to be skipped because !uploadedPhotoUrl was false.
    await waitFor(() => expect(apiUploadFoodLogPhoto).toHaveBeenCalledTimes(1))
    expect(apiUploadFoodLogPhoto.mock.calls[0][0]).toBe('food-1')
  })

  it('uploads exactly once when the store value is null', async () => {
    useFoodStore.setState({ uploadedPhotoUrl: null })
    renderEdit()
    await screen.findByAltText('Current photo')

    pickFile()
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(apiUploadFoodLogPhoto).toHaveBeenCalledTimes(1))
  })

  it('stays on the page and does not claim success when the upload fails', async () => {
    apiUploadFoodLogPhoto.mockRejectedValue(new Error('upload failed'))
    renderEdit()
    await screen.findByAltText('Current photo')

    pickFile()
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(apiUploadFoodLogPhoto).toHaveBeenCalled())
    // updateFoodLog must not run and the form must not navigate away.
    await waitFor(() => expect(useFoodStore.getState().error).toBeTruthy())
    expect(apiUpdateFoodLog).not.toHaveBeenCalled()
    expect(screen.queryByText('diary')).not.toBeInTheDocument()
  })

  it("renders the entry's own photo even when the store holds a stale URL", async () => {
    renderEdit()

    const img = await screen.findByAltText('Current photo')
    expect(img).toHaveAttribute('src', expect.stringContaining('own-photo.jpg'))
  })

  it('shows the newly uploaded photo instead of the words "Photo uploaded"', async () => {
    renderEdit()
    await screen.findByAltText('Current photo')

    pickFile()
    fireEvent.click(screen.getByRole('button', { name: /upload now/i }))

    await waitFor(() => expect(apiUploadFoodLogPhoto).toHaveBeenCalled())
    // The text-only confirmation hid the photo the user had just attached.
    expect(screen.queryByText('Photo uploaded')).not.toBeInTheDocument()
    expect(await screen.findByText(/Photo attached/)).toBeInTheDocument()
  })
})

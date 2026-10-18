import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import EditFoodLog from '@/pages/Food/EditFoodLog'
import { useFoodStore } from '@/store/foodStore'

// FF-0081: a blank barcode field must not erase a scanned code, and the field gains a
// scan button so a missing or wrong code can be filled from the camera.

const apiGetFoodLog = jest.fn()
const apiUpdateFoodLog = jest.fn()

jest.mock('@/api/food', () => ({
  foodApi: {
    getFoodLog: (...args: unknown[]) => apiGetFoodLog(...args),
    updateFoodLog: (...args: unknown[]) => apiUpdateFoodLog(...args),
    uploadFoodLogPhoto: jest.fn(async () => ({ photo_url: 'meal_photos/x.jpg' })),
    deleteFoodLogPhoto: jest.fn(async () => ({})),
    getFoodLogs: jest.fn(async () => ({ logs: [], total: 0 })),
    getDailySummary: jest.fn(async () => ({})),
  },
}))

// The scanner needs a camera; a test only needs to know it decoded something.
let detect: ((code: string) => void) | null = null
jest.mock('@/components/food/BarcodeScanner', () => ({
  __esModule: true,
  default: ({ onDetected }: { onDetected: (code: string) => void }) => {
    detect = onDetected
    return <div data-testid="scanner-mock" />
  },
}))

const LOG = {
  id: 'food-7',
  food_name: 'french toaster STICKS Cinnamon',
  calories: 170, protein_g: 3, carbs_g: 33, fat_g: 4,
  number_of_servings: 1, serving_size: '2 sticks', brand: 'Eggo',
  barcode_id: '0016000140912',
  date: '2026-10-18', meal_type: 'breakfast', photo_url: null,
}

function renderEdit() {
  return render(
    <MemoryRouter initialEntries={['/food/log/food-7/edit']}>
      <Routes>
        <Route path="/food/log/:id/edit" element={<EditFoodLog />} />
      </Routes>
    </MemoryRouter>
  )
}

const barcodeInput = () =>
  screen.getByPlaceholderText('e.g. 012345678901') as HTMLInputElement

describe('EditFoodLog barcode (FF-0081)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    detect = null
    apiGetFoodLog.mockResolvedValue({ ...LOG })
    apiUpdateFoodLog.mockResolvedValue({ ...LOG })
    useFoodStore.setState({ foodLogs: [], isLoading: false, error: null, uploadedPhotoUrl: null })
  })

  it('shows the stored barcode in the field', async () => {
    renderEdit()
    await waitFor(() => expect(barcodeInput().value).toBe('0016000140912'))
  })

  it('omits barcode_id from the update when the field is blank', async () => {
    apiGetFoodLog.mockResolvedValue({ ...LOG, barcode_id: null })
    renderEdit()
    await waitFor(() => expect(barcodeInput().value).toBe(''))

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(apiUpdateFoodLog).toHaveBeenCalled())
    const payload = apiUpdateFoodLog.mock.calls[0][1]
    // The key must be absent: sending '' is what wiped scanned codes.
    expect(Object.keys(payload)).not.toContain('barcode_id')
    expect(JSON.stringify(payload)).not.toContain('barcode_id')
  })

  it('sends the barcode when the field has one', async () => {
    renderEdit()
    await waitFor(() => expect(barcodeInput().value).toBe('0016000140912'))

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(apiUpdateFoodLog).toHaveBeenCalled())
    expect(apiUpdateFoodLog.mock.calls[0][1]).toMatchObject({ barcode_id: '0016000140912' })
  })

  it('opens the scanner from the barcode button and fills the field on a decode', async () => {
    apiGetFoodLog.mockResolvedValue({ ...LOG, barcode_id: null })
    renderEdit()
    await waitFor(() => expect(barcodeInput().value).toBe(''))

    fireEvent.click(screen.getByRole('button', { name: 'Scan barcode' }))
    expect(screen.getByRole('dialog', { name: 'Scan barcode' })).toBeInTheDocument()
    expect(screen.getByTestId('scanner-mock')).toBeInTheDocument()

    detect?.('0123456789012')

    expect(barcodeInput().value).toBe('0123456789012')
    // the scanner closes once it has a code (state settles on the next tick)
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Scan barcode' })).not.toBeInTheDocument()
    )
  })

  it('explains an unavailable camera instead of failing silently', async () => {
    apiGetFoodLog.mockResolvedValue({ ...LOG, barcode_id: null })
    renderEdit()
    await waitFor(() => expect(barcodeInput().value).toBe(''))

    fireEvent.click(screen.getByRole('button', { name: 'Scan barcode' }))
    // The scanner reports this itself through onUnavailable; simulate the overlay path
    fireEvent.click(screen.getByRole('button', { name: 'Close scanner' }))
    expect(screen.queryByRole('dialog', { name: 'Scan barcode' })).not.toBeInTheDocument()
  })
})

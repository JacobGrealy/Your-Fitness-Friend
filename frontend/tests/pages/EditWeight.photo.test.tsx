import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import EditWeight from '@/pages/Weight/EditWeight'
import { useWeightStore } from '@/store/weightStore'

// FF-0073: a weight entry's photo was destroyed by saving, hidden by cross-page store
// state, and orphaned when a file was picked and saved in one step. These tests pin the
// three save outcomes separately, because the bug was one expression covering all three.

// Mock the API module, not the store: the real store is what we want exercised, and
// @/api/weight is what drags in the axios client's import.meta.env.
const apiUpdateLog = jest.fn()
const apiUploadPhoto = jest.fn()
const apiGetLog = jest.fn()

jest.mock('@/api/weight', () => ({
  weightApi: {
    getLog: (...args: unknown[]) => apiGetLog(...args),
    getLogs: jest.fn(async () => ({ logs: [], total: 0 })),
    getStatistics: jest.fn(async () => ({})),
    updateLog: (...args: unknown[]) => apiUpdateLog(...args),
    uploadPhoto: (...args: unknown[]) => apiUploadPhoto(...args),
  },
}))

const LOG = {
  id: 'log-1',
  weight: 180.4,
  recorded_at: '2026-10-17T12:00:00',
  notes: 'morning',
  photo_url: 'abc123.jpg',
}

function renderEdit() {
  return render(
    <MemoryRouter initialEntries={['/weight/history/log-1/edit']}>
      <Routes>
        <Route path="/weight/history/:id/edit" element={<EditWeight />} />
      </Routes>
    </MemoryRouter>
  )
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: /save/i }))

describe('EditWeight photo handling (FF-0073)', () => {
  beforeAll(() => {
    // jsdom has no object URLs; the preview path needs them to exist.
    Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:preview') })
    Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: jest.fn() })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    apiUploadPhoto.mockResolvedValue({ photo_url: 'new-upload.jpg' })
    apiUpdateLog.mockResolvedValue(undefined)
    apiGetLog.mockResolvedValue({ ...LOG })
    useWeightStore.setState({
      // Stale cross-page state: an upload from an earlier screen in this session. The
      // page must not let it decide what to render or what to save.
      uploadedPhotoUrl: '/api/weight/uploads/someone-elses.jpg',
      logs: [],
      isLoading: false,
      error: null,
    })
  })

  it('shows the entry photo on mount even though the store holds a stale upload', async () => {
    renderEdit()

    const img = await screen.findByAltText('Current photo')
    expect(img).toHaveAttribute('src', expect.stringContaining('abc123.jpg'))
    expect(screen.queryByText('Tap to take a photo')).not.toBeInTheDocument()
  })

  it('omits photo_url entirely when the photo was not touched', async () => {
    renderEdit()
    await screen.findByAltText('Current photo')

    submit()

    await waitFor(() => expect(apiUpdateLog).toHaveBeenCalled())
    const payload = apiUpdateLog.mock.calls[0][1]
    // The key must be absent — both in the object and in what goes over the wire.
    // Sending null here is what erased photos.
    expect(Object.keys(payload)).not.toContain('photo_url')
    expect(JSON.stringify(payload)).not.toContain('photo_url')
    expect(payload).toMatchObject({ weight: 180.4 })
  })

  it('sends null only when the photo was explicitly removed', async () => {
    renderEdit()
    await screen.findByAltText('Current photo')

    fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }))
    submit()

    await waitFor(() => expect(apiUpdateLog).toHaveBeenCalled())
    expect(apiUpdateLog.mock.calls[0][1]).toMatchObject({ photo_url: null })
  })

  it('uploads a picked file during save and attaches the returned URL', async () => {
    renderEdit()
    await screen.findByAltText('Current photo')

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['x'], 'weigh-in.jpg', { type: 'image/jpeg' })
    fireEvent.change(input, { target: { files: [file] } })

    submit()

    await waitFor(() => expect(apiUpdateLog).toHaveBeenCalled())
    expect(apiUploadPhoto).toHaveBeenCalled()
    // The URL that came back, not the pre-upload value from a stale closure.
    expect(apiUpdateLog.mock.calls[0][1]).toMatchObject({ photo_url: 'new-upload.jpg' })
  })

  it('abandons the save when the upload fails, rather than writing a null photo', async () => {
    apiUploadPhoto.mockRejectedValue(new Error('upload failed'))
    renderEdit()
    await screen.findByAltText('Current photo')

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'big.jpg', { type: 'image/jpeg' })] },
    })

    submit()

    await waitFor(() => expect(apiUploadPhoto).toHaveBeenCalled())
    await waitFor(() => expect(useWeightStore.getState().error).toBeTruthy())
    expect(apiUpdateLog).not.toHaveBeenCalled()
  })
})

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import WeightLogView from '@/pages/Weight/WeightLogView'
import { useWeightStore } from '@/store/weightStore'

// FF-0074: tapping a history row shows the entry, read-only, with Edit as an explicit
// step. These tests pin the reading, the photo's failure paths, and the promise that
// merely looking at an entry cannot change it.

const apiGetLog = jest.fn()
const apiDeleteLog = jest.fn()
const apiUpdateLog = jest.fn()

jest.mock('@/api/weight', () => ({
  weightApi: {
    getLog: (...args: unknown[]) => apiGetLog(...args),
    getLogs: jest.fn(async () => ({ logs: [], total: 0 })),
    getStatistics: jest.fn(async () => ({})),
    deleteLog: (...args: unknown[]) => apiDeleteLog(...args),
    updateLog: (...args: unknown[]) => apiUpdateLog(...args),
  },
}))

const LOG = {
  id: 'log-9',
  weight: 176.4,
  // 23:30 UTC on the 17th is the 17th locally only if UTC... it is deliberately late
  // so a UTC-based render would show a different day than localDateOf.
  recorded_at: '2026-10-17T23:30:00',
  notes: 'after the gym',
  photo_url: 'weight_photos/abc.jpg',
}

function renderView() {
  return render(
    <MemoryRouter initialEntries={['/weight/history/log-9']}>
      <Routes>
        <Route path="/weight/history/:id" element={<WeightLogView />} />
        <Route path="/weight/history/:id/edit" element={<p>edit form</p>} />
        <Route path="/weight/history" element={<p>history list</p>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('WeightLogView (FF-0074)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    apiGetLog.mockResolvedValue({ ...LOG })
    apiDeleteLog.mockResolvedValue(undefined)
    useWeightStore.setState({ logs: [], isLoading: false, error: null, uploadedPhotoUrl: null })
  })

  it('shows the weight, the local day and the notes', async () => {
    renderView()

    expect(await screen.findByText('176.4 lbs')).toBeInTheDocument()
    // Rendered from localDateOf, so the day the user recorded is the day shown.
    expect(screen.getByText(/Oct 17, 2026/)).toBeInTheDocument()
    expect(screen.getByText('after the gym')).toBeInTheDocument()
  })

  it('shows the photo at a size worth looking at, and enlarges on tap', async () => {
    renderView()

    const img = await screen.findByAltText('Weigh-in photo')
    expect(img).toHaveAttribute('src', expect.stringContaining('/api/weight/uploads/weight_photos/abc.jpg'))
    expect(img).not.toHaveAttribute('src', expect.stringContaining('/api/api'))

    fireEvent.click(screen.getByRole('button', { name: 'Enlarge photo' }))
    expect(screen.getByRole('dialog', { name: 'Enlarged photo' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close enlarged photo' }))
    expect(screen.queryByRole('dialog', { name: 'Enlarged photo' })).not.toBeInTheDocument()
  })

  it('hides the photo block when the file 404s, instead of a broken image', async () => {
    renderView()

    const img = await screen.findByAltText('Weigh-in photo')
    fireEvent.error(img)

    expect(screen.queryByAltText('Weigh-in photo')).not.toBeInTheDocument()
    expect(screen.getByText('No photo for this entry.')).toBeInTheDocument()
  })

  it('keeps the photo empty state distinct from the notes one', async () => {
    apiGetLog.mockResolvedValue({ ...LOG, photo_url: null, notes: '' })
    renderView()

    expect(await screen.findByText('No photo for this entry.')).toBeInTheDocument()
    expect(screen.getByText('No notes for this entry.')).toBeInTheDocument()
  })

  it('sends no mutating request just because the entry was opened', async () => {
    renderView()
    await screen.findByText('176.4 lbs')

    expect(apiGetLog).toHaveBeenCalledWith('log-9')
    expect(apiDeleteLog).not.toHaveBeenCalled()
    expect(apiUpdateLog).not.toHaveBeenCalled()
  })

  it('treats Edit as an explicit step', async () => {
    renderView()
    await screen.findByText('176.4 lbs')

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(await screen.findByText('edit form')).toBeInTheDocument()
  })

  it('asks before deleting, then returns to the history list', async () => {
    renderView()
    await screen.findByText('176.4 lbs')

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByText(/cannot be undone/)).toBeInTheDocument()
    expect(apiDeleteLog).not.toHaveBeenCalled()      // not until confirmed

    // Two buttons say "Delete" now: the page action and the modal's confirm.
    const buttons = screen.getAllByRole('button', { name: 'Delete' })
    fireEvent.click(buttons[buttons.length - 1])
    await waitFor(() => expect(apiDeleteLog).toHaveBeenCalledWith('log-9'))
    expect(await screen.findByText('history list')).toBeInTheDocument()
  })

  it('explains when the entry is gone rather than rendering an empty shell', async () => {
    apiGetLog.mockResolvedValue(null)
    renderView()

    expect(await screen.findByText('That weigh-in is no longer here.')).toBeInTheDocument()
  })
})

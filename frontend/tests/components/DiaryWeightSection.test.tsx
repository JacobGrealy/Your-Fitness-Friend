import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DiaryWeightSection from '@/components/food/DiaryWeightSection'
import { weightApi } from '@/api/weight'
jest.mock('@/api/weight', () => ({ weightApi: { getLogsByDate: jest.fn(), deleteLog: jest.fn() } }))
jest.mock('@/store/authStore', () => ({ useAuthStore: (s: any) => s({ user: { id: 7 } }) }))
const api = weightApi as jest.Mocked<typeof weightApi>

const entry = (over: Record<string, unknown> = {}) => ({
  id: '12',
  user_id: '',
  weight: 180.5,
  recorded_at: '2026-10-21T00:00:00',
  notes: null as string | null,
  photo_url: null as string | null,
  ...over,
})

beforeEach(() => {
  jest.clearAllMocks()
  api.getLogsByDate.mockResolvedValue([entry()] as any)
})
const show = (date = '2026-10-21') => render(<MemoryRouter><DiaryWeightSection date={date} /></MemoryRouter>)

// FF-0137: the diary gained a Weight section so a weigh-in can be logged from the day
// being looked at, with the same shape as the Hydration and Medication sections.

test('shows the day weight, an editable row and a link that logs against the same day', async () => {
  show()
  expect(screen.getByText('Loading weight…')).toBeInTheDocument()
  const edit = await screen.findByRole('link', { name: 'Edit weight 180.5 lbs' })
  expect(edit).toHaveAttribute('href', '/weight/history/12/edit')
  // Header summary and the row both read "180.5 lbs"; the summary lives in the header.
  expect(screen.getByRole('button', { name: 'Weight section' })).toHaveTextContent('180.5 lbs')
  expect(screen.getByRole('link', { name: '+ Log Weight' })).toHaveAttribute('href', '/weight/log?date=2026-10-21')
  expect(api.getLogsByDate).toHaveBeenCalledWith('2026-10-21')
})

test('renders notes and the stored photo for an entry', async () => {
  api.getLogsByDate.mockResolvedValue([entry({ notes: 'After the gym', photo_url: 'weight_photos/x.jpg' })] as any)
  show()
  expect(await screen.findByText('After the gym')).toBeInTheDocument()
  const image = document.querySelector('img')
  expect(image).toHaveAttribute('src', expect.stringContaining('/api/weight/uploads/weight_photos/x.jpg'))
  // The derivative request, not the full-size original: diary image rows use thumbnail=1.
  expect(image?.getAttribute('src')).toContain('thumbnail=1')
})

test('an empty day says so and the header carries no weight', async () => {
  api.getLogsByDate.mockResolvedValue([])
  show()
  expect(await screen.findByText('No weight logged for this day.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Weight section' })).toHaveTextContent('—')
  expect(screen.getByRole('link', { name: '+ Log Weight' })).toBeInTheDocument()
})

test('several weigh-ins on one day are listed newest first and summarised by count', async () => {
  api.getLogsByDate.mockResolvedValue([
    entry({ id: '11', weight: 181.2 }),
    entry({ id: '13', weight: 180.4 }),
  ] as any)
  show()
  await screen.findByRole('link', { name: 'Edit weight 180.4 lbs' })
  expect(screen.getByRole('button', { name: 'Weight section' })).toHaveTextContent('2 entries')
  const weights = screen.getAllByRole('link', { name: /^Edit weight / }).map(link => link.getAttribute('aria-label'))
  expect(weights).toEqual(['Edit weight 180.4 lbs', 'Edit weight 181.2 lbs'])
})

test('a failed load explains itself and Retry asks again', async () => {
  api.getLogsByDate.mockRejectedValueOnce({ response: { data: { error: 'Weight unavailable' } } })
  show()
  expect(await screen.findByRole('alert')).toHaveTextContent('Weight unavailable')
  expect(screen.queryByText('No weight logged for this day.')).not.toBeInTheDocument()
  api.getLogsByDate.mockResolvedValue([entry()] as any)
  fireEvent.click(screen.getByRole('button', { name: 'Retry weight' }))
  expect(await screen.findByRole('link', { name: 'Edit weight 180.5 lbs' })).toBeInTheDocument()
})

test('delete asks first, then removes exactly that entry and its header weight', async () => {
  api.deleteLog.mockResolvedValue({} as any)
  show()
  fireEvent.click(await screen.findByRole('button', { name: 'Delete weight 180.5 lbs' }))
  expect(screen.getByText('Delete this weigh-in? This cannot be undone.')).toBeInTheDocument()
  expect(api.deleteLog).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }))
  await waitFor(() => expect(api.deleteLog).toHaveBeenCalledWith('12'))
  expect(await screen.findByText('No weight logged for this day.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Weight section' })).toHaveTextContent('—')
})

test('a failed delete keeps the row and explains why', async () => {
  api.deleteLog.mockRejectedValueOnce({ response: { data: { error: 'Weight log not found' } } })
  show()
  fireEvent.click(await screen.findByRole('button', { name: 'Delete weight 180.5 lbs' }))
  fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Weight log not found')
  expect(screen.getByRole('link', { name: 'Edit weight 180.5 lbs' })).toBeInTheDocument()
})

test('date visits hide the populated old day immediately and reject out-of-order results/errors', async () => {
  let resolveB!: (value: any) => void, rejectA!: (cause: any) => void
  const view = (date: string) => <MemoryRouter><DiaryWeightSection date={date} /></MemoryRouter>
  const rendered = render(view('2026-10-21'))
  await screen.findByRole('link', { name: 'Edit weight 180.5 lbs' })
  api.getLogsByDate.mockReturnValueOnce(new Promise(resolve => { resolveB = resolve })).mockReturnValueOnce(new Promise((_, reject) => { rejectA = reject }))
  rendered.rerender(view('2026-10-22'))
  expect(screen.getByText('Loading weight…')).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Edit weight 180.5 lbs' })).not.toBeInTheDocument()
  rendered.rerender(view('2026-10-21'))
  rendered.rerender(view('2026-10-23'))
  await screen.findByRole('link', { name: 'Edit weight 180.5 lbs' })
  await act(async () => {
    resolveB([entry({ id: '99', weight: 999 })])
    rejectA(new Error('old visit'))
  })
  expect(screen.getByRole('button', { name: 'Weight section' })).toHaveTextContent('180.5 lbs')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Edit weight 999 lbs' })).not.toBeInTheDocument()
})

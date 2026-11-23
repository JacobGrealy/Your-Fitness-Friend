import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LogWeight from '@/pages/Weight/LogWeight'

// FF-0137: the diary's Weight section links here with the day being viewed, so the form
// must default to that day. Before this the form always wanted today, which would have
// filed a weigh-in from a past diary day on the wrong date.

const apiGetLogsByDate = jest.fn(async () => [] as any[])
const apiLogWeight = jest.fn(async (payload: any) => payload)

jest.mock('@/api/weight', () => ({
  weightApi: {
    getLogs: jest.fn(async () => []),
    getLogsByDate: (...args: unknown[]) => apiGetLogsByDate(...(args as [])),
    getStatistics: jest.fn(async () => ({})),
    logWeight: (...args: unknown[]) => apiLogWeight(...(args as [any])),
    uploadPhoto: jest.fn(),
  },
}))
jest.mock('@/components/layout/PageTitleContext', () => ({
  usePageTitle: () => ({ setTitle: jest.fn(), setCenterContent: jest.fn() }),
}))

const dateInput = () => document.querySelector('input[type="date"]') as HTMLInputElement
const show = (path = '/weight/log') => render(<MemoryRouter initialEntries={[path]}><LogWeight /></MemoryRouter>)

beforeEach(() => { jest.clearAllMocks() })

test('a date query parameter prefills the form and is what gets saved', async () => {
  show('/weight/log?date=2026-10-05')
  expect(dateInput().value).toBe('2026-10-05')
  fireEvent.change(screen.getByPlaceholderText('e.g. 180.5'), { target: { value: '181.2' } })
  fireEvent.click(screen.getByRole('button', { name: 'Log Weight' }))
  await waitFor(() => expect(apiLogWeight).toHaveBeenCalledWith(expect.objectContaining({ weight: 181.2, date: '2026-10-05' })))
  // The duplicate guard asked about the same day, so Replace targets the right entry.
  expect(apiGetLogsByDate).toHaveBeenCalledWith('2026-10-05')
})

test('without a usable date the form still defaults to today', async () => {
  show('/weight/log?date=not-a-date')
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  expect(dateInput().value).toBe(today)
})

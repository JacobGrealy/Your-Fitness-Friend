import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DiaryHydrationSection from '@/components/food/DiaryHydrationSection'
import { hydrationApi } from '@/api/hydration'
jest.mock('@/api/hydration', () => ({ hydrationError: () => 'Request failed', hydrationApi: { list: jest.fn(), remove: jest.fn() } }))
jest.mock('@/store/authStore', () => ({ useAuthStore: (s: any) => s({ user: { id: 7 } }) }))
const api = hydrationApi as jest.Mocked<typeof hydrationApi>
beforeEach(() => { jest.clearAllMocks(); api.list.mockResolvedValue({ date: '2026-10-21', total_oz: 24, logs: [{ id: 1, amount_oz: 24, logged_at: '2026-10-21T08:45', date: '2026-10-21', notes: 'Finished bottle' }] }) })
const show = () => render(<MemoryRouter><DiaryHydrationSection date="2026-10-21" /></MemoryRouter>)

test('renders dated total, water entry and separate edit/delete controls', async () => {
  show()
  expect(await screen.findByText('Water · 24 fl oz')).toBeInTheDocument()
  expect(screen.getByText('24 fl oz', { exact: true })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Edit hydration at 08:45' })).toHaveAttribute('href', '/hydration/log/1')
  expect(screen.getByRole('link', { name: '+ Log Hydration' })).toHaveAttribute('href', '/hydration/log?date=2026-10-21')
  expect(api.list).toHaveBeenCalledWith('2026-10-21')
})

test('delete requires confirmation and updates daily ounces total', async () => {
  api.remove.mockResolvedValue({})
  show()
  fireEvent.click(await screen.findByRole('button', { name: 'Delete hydration at 08:45' }))
  expect(api.remove).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }))
  await waitFor(() => expect(api.remove).toHaveBeenCalledWith(1))
  expect(await screen.findByText('No water logged for this day.')).toBeInTheDocument()
  expect(screen.getByText('0 fl oz')).toBeInTheDocument()
})

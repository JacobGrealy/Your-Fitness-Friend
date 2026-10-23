import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import LogHydration from '@/pages/Health/LogHydration'
import { hydrationApi } from '@/api/hydration'
const navigate = jest.fn()
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useNavigate: () => navigate }))
jest.mock('@/api/hydration', () => ({ hydrationError: (e: any) => e.response?.data?.error || 'Error', hydrationApi: { options: jest.fn(), get: jest.fn(), save: jest.fn() } }))
jest.mock('@/store/authStore', () => ({ useAuthStore: (s: any) => s({ user: { id: 7 } }) }))
jest.mock('@/components/layout/PageTitleContext', () => ({ usePageTitle: () => ({ setTitle: jest.fn() }) }))
const api = hydrationApi as jest.Mocked<typeof hydrationApi>
beforeEach(() => { jest.clearAllMocks(); api.options.mockResolvedValue({ default_amount_oz: 24, unit: 'US fl oz' }) })
const show = (url = '/hydration/log?date=2026-10-21') => render(<MemoryRouter initialEntries={[url]}><Routes><Route path="/hydration/log" element={<LogHydration />} /><Route path="/hydration/log/:id" element={<LogHydration />} /></Routes></MemoryRouter>)

test('loads own last amount and selected diary date, then saves water intake', async () => {
  api.options.mockResolvedValue({ default_amount_oz: 12.5, unit: 'US fl oz' })
  api.save.mockResolvedValue({ date: '2026-10-21' } as any)
  show()
  expect(await screen.findByLabelText('Water (fl oz)')).toHaveValue(12.5)
  expect((screen.getByLabelText('Date and time') as HTMLInputElement).value).toMatch(/^2026-10-21T/)
  fireEvent.click(screen.getByRole('button', { name: 'Log hydration' }))
  await waitFor(() => expect(api.save).toHaveBeenCalledWith(expect.objectContaining({ amount_oz: 12.5, notes: '' }), undefined))
  expect(navigate).toHaveBeenCalledWith('/food/daily?date=2026-10-21')
})

test('edit uses original amount/time, never latest default', async () => {
  api.get.mockResolvedValue({ amount_oz: 8, logged_at: '2026-10-20T09:15', notes: 'Small glass' } as any)
  show('/hydration/log/7')
  expect(await screen.findByLabelText('Water (fl oz)')).toHaveValue(8)
  expect(screen.getByLabelText('Date and time')).toHaveValue('2026-10-20T09:15')
  expect(api.options).not.toHaveBeenCalled()
})

test('failed save preserves input and reports server error', async () => {
  api.save.mockRejectedValue({ response: { data: { error: 'Offline' } } })
  show()
  await screen.findByLabelText('Water (fl oz)')
  fireEvent.change(screen.getByLabelText('Notes (optional)'), { target: { value: 'Bottle number two' } })
  fireEvent.click(screen.getByRole('button', { name: 'Log hydration' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Offline')
  expect(screen.getByLabelText('Water (fl oz)')).toHaveValue(24)
  expect(screen.getByLabelText('Notes (optional)')).toHaveValue('Bottle number two')
  expect(navigate).not.toHaveBeenCalled()
})

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import LogHealth from '@/pages/Health/LogHealth'
import { healthApi } from '@/api/health'
const navigate = jest.fn()
const setTitle = jest.fn()
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useNavigate: () => navigate }))
jest.mock('@/components/layout/PageTitleContext', () => ({ usePageTitle: () => ({ setTitle }) }))
jest.mock('@/store/authStore', () => ({ useAuthStore: (selector: any) => selector({ user: { id: 7 } }) }))
jest.mock('@/api/health', () => ({ healthError: (e: any) => e?.response?.data?.error || 'Error', healthApi: { options: jest.fn(), get: jest.fn(), save: jest.fn() } }))
const api = healthApi as jest.Mocked<typeof healthApi>
beforeEach(() => { jest.clearAllMocks(); api.options.mockResolvedValue({ medication: 'Wegovy pill', dose_options_mg: [1.5, 4, 9, 25], default_dose_mg: 1.5 }) })
const show = (path: string) => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/health/log/:kind" element={<LogHealth />} /><Route path="/health/log/:kind/:id" element={<LogHealth />} /></Routes></MemoryRouter>)

test.each([1.5, 4, 9, 25])('uses backend default %s and offers all strengths', async dose => {
  api.options.mockResolvedValue({ medication: 'Wegovy pill', dose_options_mg: [1.5, 4, 9, 25], default_dose_mg: dose })
  show('/health/log/medication')
  expect(await screen.findByLabelText(/Dose \(mg\)/)).toHaveValue(String(dose))
  expect(screen.getAllByRole('option')).toHaveLength(4)
})

test('bowel form has no dose, defaults local time and saves notes', async () => {
  api.save.mockResolvedValue({ date: '2026-10-22' } as any)
  show('/health/log/bowel')
  const notes = await screen.findByLabelText('Notes (optional)')
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  fireEvent.change(notes, { target: { value: 'Comfortable' } })
  fireEvent.click(screen.getByRole('button', { name: 'Log bowel movement' }))
  await waitFor(() => expect(api.save).toHaveBeenCalledWith(expect.objectContaining({ kind: 'bowel', notes: 'Comfortable' }), undefined))
  expect(api.save.mock.calls[0][0]).not.toHaveProperty('dose_mg')
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/food/daily?date=2026-10-22'))
})

test('failed medication save keeps entered dose and notes', async () => {
  api.save.mockRejectedValue({ response: { data: { error: 'Offline' } } })
  show('/health/log/medication')
  const select = await screen.findByLabelText(/Dose \(mg\)/)
  fireEvent.change(select, { target: { value: '4' } })
  fireEvent.change(screen.getByLabelText('Notes (optional)'), { target: { value: 'Took before breakfast' } })
  fireEvent.click(screen.getByRole('button', { name: 'Log medication' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Offline')
  expect(select).toHaveValue('4')
  expect(screen.getByLabelText('Notes (optional)')).toHaveValue('Took before breakfast')
  expect(navigate).not.toHaveBeenCalled()
})

test('editing uses recorded dose not current default', async () => {
  api.get.mockResolvedValue({ kind: 'medication', dose_mg: 9, logged_at: '2026-10-21T08:45', notes: 'Old note' } as any)
  show('/health/log/medication/2')
  expect(await screen.findByLabelText(/Dose \(mg\)/)).toHaveValue('9')
  expect(screen.getByLabelText('Date and time taken')).toHaveValue('2026-10-21T08:45')
})

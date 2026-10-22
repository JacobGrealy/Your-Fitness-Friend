import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DiaryHealthSections from '@/components/food/DiaryHealthSections'
import { healthApi } from '@/api/health'
jest.mock('@/api/diaryCopy', () => ({ copyDiary: jest.fn() }))
jest.mock('@/store/authStore', () => ({ useAuthStore: (s: any) => s({ user: { id: 7 } }) }))
jest.mock('@/api/health', () => ({ healthError: () => 'Request failed', healthApi: { list: jest.fn(), remove: jest.fn() } }))
const api = healthApi as jest.Mocked<typeof healthApi>
const entries: any[] = [{ id: 1, kind: 'medication', logged_at: '2026-10-22T08:30', dose_mg: 4, notes: 'Morning pill' }, { id: 2, kind: 'bowel', logged_at: '2026-10-22T10:00', notes: 'Normal' }]
beforeEach(() => { jest.clearAllMocks(); api.list.mockResolvedValue(entries) })
const show = (date: string) => <MemoryRouter><DiaryHealthSections date={date} /></MemoryRouter>

test('dated entries show dose/time/notes and food-style edit/delete controls', async () => {
  render(show('2026-10-22'))
  expect(await screen.findByText('Wegovy pill · 4 mg')).toBeInTheDocument()
  expect(screen.getByText('Morning pill')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Edit medication at 08:30' })).toHaveAttribute('href', '/health/log/medication/1')
  expect(screen.getByRole('link', { name: 'Edit bowel movement at 10:00' })).toHaveAttribute('href', '/health/log/bowel/2')
  expect(api.list).toHaveBeenCalledWith('2026-10-22')
})

test('confirmed deletion removes only the selected health entry', async () => {
  api.remove.mockResolvedValue({} as any)
  render(show('2026-10-22'))
  fireEvent.click(await screen.findByRole('button', { name: 'Delete medication at 08:30' }))
  expect(api.remove).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }))
  await waitFor(() => expect(screen.queryByText('Wegovy pill · 4 mg')).not.toBeInTheDocument())
  expect(screen.getByText('Normal')).toBeInTheDocument()
})

test('old-day results are discarded after date changes', async () => {
  let resolve!: (entries: any) => void
  api.list.mockReturnValueOnce(new Promise(r => { resolve = r })).mockResolvedValueOnce([])
  const view = render(show('2026-10-22'))
  view.rerender(show('2026-10-21'))
  await screen.findByText('No medication logged for this day.')
  resolve(entries)
  await waitFor(() => expect(screen.queryByText('Wegovy pill · 4 mg')).not.toBeInTheDocument())
})

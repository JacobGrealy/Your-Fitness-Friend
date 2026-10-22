import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DiaryExerciseSection from '@/components/food/DiaryExerciseSection'
import { exerciseApi } from '@/api/exercise'

jest.mock('@/api/exercise', () => ({ exerciseApi: { getExerciseLogs: jest.fn(), deleteExerciseLog: jest.fn() } }))
jest.mock('@/store/authStore', () => ({ useAuthStore: (selector: any) => selector({ user: { id: 7 } }) }))
const api = exerciseApi as jest.Mocked<typeof exerciseApi>
const onTotal = jest.fn()
const log: any = { id: '1', exercise_name: 'Walking Pad / Treadmill', activity_id: 'treadmill_walking', duration: 87, calories_burned: 400.123, details: { speed_mph: 1.4, incline_percent: 9, distance_miles: 2.03 } }
beforeEach(() => { jest.clearAllMocks() })
const view = (date: string) => <MemoryRouter><DiaryExerciseSection date={date} onTotal={onTotal} /></MemoryRouter>

test('loads selected day, displays walking details and updates exercise total', async () => {
  api.getExerciseLogs.mockResolvedValue([log])
  render(view('2026-10-21'))
  expect(await screen.findByText('Walking Pad / Treadmill')).toBeInTheDocument()
  expect(screen.getByText(/87 min.*1.4 mph.*9% incline/)).toBeInTheDocument()
  expect(screen.getByText(/400.12 cal · Active/)).toBeInTheDocument()
  expect(api.getExerciseLogs).toHaveBeenCalledWith({ start_date: '2026-10-21', end_date: '2026-10-21' })
  expect(onTotal).toHaveBeenLastCalledWith({ date: '2026-10-21', total: 400.12 })
  expect(screen.getByRole('link', { name: 'Edit Walking Pad / Treadmill' })).toHaveAttribute('href', '/exercise/log?activity=treadmill_walking&edit=1')
})

test('diary thumbnail opens a full-size viewer separately from editing', async () => {
  api.getExerciseLogs.mockResolvedValue([{ ...log, photo_endpoint: '/api/exercise/log/1/photo' }])
  render(view('2026-10-21'))
  fireEvent.click(await screen.findByRole('button', { name: 'View photo for Walking Pad / Treadmill' }))
  expect(screen.getByRole('dialog', { name: 'Exercise photo' })).toBeInTheDocument()
  expect(screen.getByAltText('Exercise session')).toHaveAttribute('src', '/api/exercise/log/1/photo')
  fireEvent.click(screen.getByRole('button', { name: 'Close photo' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('X confirms deletion and refreshes daily calories without editing', async () => {
  api.getExerciseLogs.mockResolvedValue([log])
  api.deleteExerciseLog.mockResolvedValue({})
  render(view('2026-10-21'))
  fireEvent.click(await screen.findByRole('button', { name: 'Delete Walking Pad / Treadmill' }))
  expect(api.deleteExerciseLog).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }))
  await waitFor(() => expect(screen.queryByText('Walking Pad / Treadmill')).not.toBeInTheDocument())
  expect(api.deleteExerciseLog).toHaveBeenCalledWith('1')
  expect(onTotal).toHaveBeenLastCalledWith({ date: '2026-10-21', total: 0 })
})

test('failed delete keeps the exercise and shows an actionable error', async () => {
  api.getExerciseLogs.mockResolvedValue([log])
  api.deleteExerciseLog.mockRejectedValue({ response: { data: { error: 'Offline' } } })
  render(view('2026-10-21'))
  fireEvent.click(await screen.findByRole('button', { name: 'Delete Walking Pad / Treadmill' }))
  fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Offline')
  expect(screen.getByText('Walking Pad / Treadmill')).toBeInTheDocument()
})

test('date changes discard a previous day response', async () => {
  let resolve!: (logs: any) => void
  api.getExerciseLogs.mockReturnValueOnce(new Promise(r => { resolve = r })).mockResolvedValueOnce([])
  const rendered = render(view('2026-10-21'))
  rendered.rerender(view('2026-10-20'))
  await screen.findByText('No exercise logged for this day.')
  resolve([log])
  await waitFor(() => expect(screen.queryByText('Walking Pad / Treadmill')).not.toBeInTheDocument())
  expect(onTotal).toHaveBeenLastCalledWith({ date: '2026-10-20', total: 0 })
})

test('failed reads show retry instead of pretending no exercise', async () => {
  api.getExerciseLogs.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([log])
  render(view('2026-10-21'))
  expect(await screen.findByRole('alert')).toBeInTheDocument()
  expect(screen.queryByText('No exercise logged for this day.')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Retry exercise' }))
  expect(await screen.findByText('Walking Pad / Treadmill')).toBeInTheDocument()
})

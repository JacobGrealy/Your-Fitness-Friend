import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TreadmillSessionForm from '@/pages/Exercise/TreadmillSessionForm'
import { exerciseApi } from '@/api/exercise'

const navigate = jest.fn()
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useNavigate: () => navigate }))
jest.mock('@/api/exercise', () => ({ exerciseApi: { estimateSession: jest.fn(), saveSession: jest.fn(), getExerciseLog: jest.fn() } }))
jest.mock('@/store/exerciseStore', () => ({ useExerciseStore: { getState: () => ({ fetchExerciseLogs: jest.fn() }) } }))
const api = exerciseApi as jest.Mocked<typeof exerciseApi>
const estimate: any = { calories_burned: 100, active_calories: 100, gross_calories: 130, distance_miles: 1.25, distance_km: 2.01, weight_lbs: 200, weight_source: 'profile', method: 'acsm_walking_v1', warnings: ['Estimate only'] }
const show = (query = '') => render(<MemoryRouter initialEntries={['/exercise/log?activity=treadmill_walking' + query]}><TreadmillSessionForm userId="1" /></MemoryRouter>)
const fill = () => {
  fireEvent.change(screen.getByLabelText('Time (minutes)'), { target: { value: '30' } })
  fireEvent.change(screen.getByLabelText('Speed (mph)'), { target: { value: '2.5' } })
}
beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); api.estimateSession.mockResolvedValue(estimate) })

test('arms-supported checkbox defaults off and is sent to preview and save', async () => {
  api.saveSession.mockResolvedValue({ details: {} } as any)
  show(); fill()
  const checkbox = screen.getByRole('checkbox', { name: /Arms supported/ })
  expect(checkbox).not.toBeChecked()
  fireEvent.click(checkbox)
  await waitFor(() => expect(api.estimateSession).toHaveBeenCalledWith(expect.objectContaining({ arms_supported: true }), undefined))
  fireEvent.click(screen.getByRole('button', { name: 'Log walking session' }))
  await waitFor(() => expect(api.saveSession).toHaveBeenCalledWith(expect.objectContaining({ arms_supported: true }), undefined))
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/food/daily'))
})

test.each(['edit', 'repeat'])('loads supported checkbox for %s', async mode => {
  api.getExerciseLog.mockResolvedValue({ activity_id: 'treadmill_walking', duration: 45, date: '2026-10-21', details: { speed_mph: 2, incline_percent: 5, arms_supported: true } } as any)
  show(`&${mode}=7`)
  await waitFor(() => expect(screen.getByRole('checkbox', { name: /Arms supported/ })).toBeChecked())
})

test('walking has relevant fields and deterministic preview', async () => {
  show(); fill()
  expect(screen.queryByText('Sets (optional)')).not.toBeInTheDocument()
  await waitFor(() => expect(screen.getByText(/100/)).toBeInTheDocument())
  expect(screen.getByText(/profile weight fallback/)).toBeInTheDocument()
  expect(api.estimateSession).toHaveBeenCalledWith(expect.objectContaining({ speed: 2.5, duration_minutes: 30, incline_percent: 0 }), undefined)
})

test('failed save retains time and error', async () => {
  api.saveSession.mockRejectedValue({ response: { data: { error: 'Try again later' } } })
  show(); fill()
  fireEvent.click(screen.getByRole('button', { name: 'Log walking session' }))
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Try again later'))
  expect(screen.getByLabelText('Time (minutes)')).toHaveValue(30)
  expect(navigate).not.toHaveBeenCalled()
})

test('new session remembers speed and incline, never duration', () => {
  localStorage.setItem('awefit.exercise:1:treadmill', JSON.stringify({ speed_mph: 2.5, incline_percent: 3, duration: 99 }))
  show()
  expect(screen.getByLabelText('Speed (mph)')).toHaveValue(2.5)
  expect(screen.getByLabelText('Time (minutes)')).toHaveValue(null)
})

test('repeat starts today without duration, notes or override', async () => {
  api.getExerciseLog.mockResolvedValue({ activity_id: 'treadmill_walking', duration: 45, date: '2020-01-01', notes: 'Old', details: { speed_mph: 2, incline_percent: 5, calorie_override: 100 } } as any)
  show('&repeat=7')
  await waitFor(() => expect(screen.getByLabelText('Speed (mph)')).toHaveValue(2))
  expect(screen.getByLabelText('Time (minutes)')).toHaveValue(null)
  expect(screen.getByLabelText('Session notes')).toHaveValue('')
})

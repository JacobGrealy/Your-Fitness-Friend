import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import StrengthSessionForm from '@/pages/Exercise/StrengthSessionForm'
import { exerciseApi } from '@/api/exercise'
const navigate = jest.fn()
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useNavigate: () => navigate }))
jest.mock('@/api/exercise', () => ({ exerciseApi: { getStrengthLibrary: jest.fn(), getLatest: jest.fn(), getExerciseLog: jest.fn(), estimateStrength: jest.fn(), saveSession: jest.fn() } }))
const api = exerciseApi as jest.Mocked<typeof exerciseApi>
const library: any[] = [{ id: 'builtin:bench_press', name: 'Bench Press', equipment: 'barbell' }, { id: 'builtin:push_up', name: 'Push-up', equipment: 'bodyweight' }]
const previous: any = { activity_id: 'strength_training', date: '2026-10-21', duration: 40, photo_endpoint: '/api/exercise/log/1/photo', notes: 'Yesterday', details: { exercises: [{ exercise_id: 'builtin:bench_press', name: 'Bench Press', equipment: 'barbell', sets: [{ reps: 10, weight_lbs: 95 }] }], effort: 'moderate', calorie_override: 100 } }
beforeEach(() => { jest.clearAllMocks(); api.getStrengthLibrary.mockResolvedValue(library); api.getLatest.mockResolvedValue(null); api.estimateStrength.mockResolvedValue({ calories_burned: null, warnings: ['Add duration to estimate'] } as any) })
const show = (query = '') => render(<MemoryRouter initialEntries={['/exercise/log?activity=strength_training' + query]}><StrengthSessionForm /></MemoryRouter>)

async function addBench() {
  fireEvent.click(await screen.findByRole('button', { name: '+ Add exercise' }))
  fireEvent.change(screen.getByLabelText('Reps for exercise 1 set 1'), { target: { value: '10' } })
  fireEvent.change(screen.getByLabelText('Load for exercise 1 set 1'), { target: { value: '95' } })
}

test('records multiple exercises and variable sets, bodyweight has no load', async () => {
  api.saveSession.mockResolvedValue({ date: '2026-10-22' } as any)
  show(); await addBench()
  fireEvent.click(screen.getByRole('button', { name: 'Add set to exercise 1' }))
  fireEvent.change(screen.getByLabelText('Reps for exercise 1 set 2'), { target: { value: '8' } })
  fireEvent.change(screen.getByLabelText('Load for exercise 1 set 2'), { target: { value: '105' } })
  fireEvent.change(screen.getByLabelText('Add an exercise'), { target: { value: 'builtin:push_up' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Add exercise' }))
  fireEvent.change(screen.getByLabelText('Reps for exercise 2 set 1'), { target: { value: '15' } })
  expect(screen.queryByLabelText('Load for exercise 2 set 1')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Log strength workout' }))
  await waitFor(() => expect(api.saveSession).toHaveBeenCalled())
  const payload = api.saveSession.mock.calls[0][0] as any
  expect(payload.duration_minutes).toBeNull()
  expect(payload.exercises[0].sets).toEqual([{ reps: 10, weight_lbs: 95 }, { reps: 8, weight_lbs: 105 }])
  expect(payload.exercises[1].sets).toEqual([{ reps: 15, weight_lbs: null }])
  expect(navigate).toHaveBeenCalledWith('/food/daily?date=2026-10-22')
})

test('previous workout copies only exercises and effort, not duration or photo', async () => {
  api.getLatest.mockResolvedValue(previous)
  show()
  fireEvent.click(await screen.findByRole('button', { name: 'Use previous workout’s exercises & sets' }))
  expect(screen.getByLabelText('Load for exercise 1 set 1')).toHaveValue(95)
  expect(screen.getByLabelText('Session time (minutes, optional)')).toHaveValue(null)
  expect(screen.queryByAltText('Selected exercise photo')).not.toBeInTheDocument()
})

test('failed save retains sets and server message', async () => {
  api.saveSession.mockRejectedValue({ response: { data: { error: 'Offline' } } })
  show(); await addBench()
  fireEvent.click(screen.getByRole('button', { name: 'Log strength workout' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Offline')
  expect(screen.getByLabelText('Load for exercise 1 set 1')).toHaveValue(95)
  expect(navigate).not.toHaveBeenCalled()
})

test.each(['edit', 'repeat'])('%s restores sets; only edit restores photo/duration', async mode => {
  api.getExerciseLog.mockResolvedValue(previous)
  show(`&${mode}=1`)
  expect(await screen.findByLabelText('Reps for exercise 1 set 1')).toHaveValue(10)
  if (mode === 'edit') {
    expect(screen.getByLabelText('Session time (minutes, optional)')).toHaveValue(40)
    expect(screen.getByAltText('Selected exercise photo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Repeat this workout as a new session' })).toHaveAttribute('href', '/exercise/log?activity=strength_training&repeat=1')
  } else {
    expect(screen.getByLabelText('Session time (minutes, optional)')).toHaveValue(null)
    expect(screen.queryByAltText('Selected exercise photo')).not.toBeInTheDocument()
  }
})

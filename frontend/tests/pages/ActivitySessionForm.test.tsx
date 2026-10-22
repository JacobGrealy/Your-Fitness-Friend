import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ActivitySessionForm from '@/pages/Exercise/ActivitySessionForm'
import { exerciseApi } from '@/api/exercise'
import type { ActivityId } from '@/types'
const navigate = jest.fn()
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useNavigate: () => navigate }))
jest.mock('@/api/exercise', () => ({ exerciseApi: { getExerciseLog: jest.fn(), estimateActivity: jest.fn(), saveSession: jest.fn() } }))
const api = exerciseApi as jest.Mocked<typeof exerciseApi>
const estimate: any = { calories_burned: 100, gross_calories: 130, distance_miles: null, weight_lbs: 200, weight_source: 'profile', method: 'compendium_activity_2024_v1', warnings: ['Estimate only'] }
beforeEach(() => { jest.clearAllMocks(); api.estimateActivity.mockResolvedValue(estimate) })
const show = (id: ActivityId, query = '') => render(<MemoryRouter initialEntries={['/exercise/log?activity=' + id + query]}><ActivitySessionForm activityId={id} userId="7" /></MemoryRouter>)
const time = () => fireEvent.change(screen.getByLabelText('Time (minutes)'), { target: { value: '30' } })

test.each(['stretching', 'yoga'] as ActivityId[])('%s is duration-based, without distance, incline or lifting fields', async id => {
  show(id); time()
  expect(screen.queryByLabelText('Distance / pace units')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Incline (% grade)')).not.toBeInTheDocument()
  expect(screen.queryByLabelText(/Reps/)).not.toBeInTheDocument()
  if (id === 'yoga') expect(screen.getByLabelText('Yoga style')).toBeInTheDocument()
  await waitFor(() => expect(api.estimateActivity).toHaveBeenCalledWith(expect.objectContaining({ activity_id: id, duration_minutes: 30 }), undefined))
})

test('stationary bike uses measured watts, not resistance or speed', async () => {
  show('stationary_cycling'); time()
  fireEvent.change(screen.getByLabelText(/Measured power/), { target: { value: '100' } })
  expect(screen.getByLabelText('Effort without measured power')).toBeDisabled()
  expect(screen.queryByLabelText(/Resistance/)).not.toBeInTheDocument()
  await waitFor(() => expect(api.estimateActivity).toHaveBeenCalledWith(expect.objectContaining({ power_watts: 100 }), undefined))
})

test('outdoor distance and pace switch units without reinterpreting old values', async () => {
  show('outdoor_running'); time()
  fireEvent.change(screen.getByLabelText('Distance (mi)'), { target: { value: '3' } })
  await waitFor(() => expect(api.estimateActivity).toHaveBeenCalledWith(expect.objectContaining({ distance: 3, distance_unit: 'mi' }), undefined))
  fireEvent.change(screen.getByLabelText('Distance / pace units'), { target: { value: 'pace_km' } })
  expect(screen.getByLabelText('Pace (min/km)')).toHaveValue(null)
  fireEvent.change(screen.getByLabelText('Pace (min/km)'), { target: { value: '6' } })
  await waitFor(() => expect(api.estimateActivity).toHaveBeenLastCalledWith(expect.objectContaining({ pace: 6, pace_unit: 'min/km' }), undefined))
})

test('treadmill running sends grade and speed', async () => {
  show('treadmill_running'); time()
  fireEvent.change(screen.getByLabelText('Speed (mph)'), { target: { value: '6' } })
  fireEvent.change(screen.getByLabelText('Incline (% grade)'), { target: { value: '5' } })
  await waitFor(() => expect(api.estimateActivity).toHaveBeenCalledWith(expect.objectContaining({ speed: 6, incline_percent: 5 }), undefined))
})

test('failed save preserves duration and notes', async () => {
  api.saveSession.mockRejectedValue({ response: { data: { error: 'Offline' } } })
  show('stretching'); time()
  fireEvent.change(screen.getByLabelText('Session notes'), { target: { value: 'Evening mobility' } })
  fireEvent.click(screen.getByRole('button', { name: 'Log activity' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Offline')
  expect(screen.getByLabelText('Time (minutes)')).toHaveValue(30)
  expect(navigate).not.toHaveBeenCalled()
})

test.each(['edit', 'repeat'])('%s restores activity data; repeats omit duration and photo', async mode => {
  api.getExerciseLog.mockResolvedValue({ activity_id: 'yoga', date: '2026-10-21', duration: 40, notes: 'Yesterday', photo_endpoint: '/api/exercise/log/1/photo', details: { power_watts: null, distance_miles: null, yoga_style: 'vinyasa', effort: 'moderate' } } as any)
  show('yoga', `&${mode}=1`)
  expect(await screen.findByLabelText('Yoga style')).toHaveValue('vinyasa')
  expect(screen.getByLabelText('Time (minutes)')).toHaveValue(mode === 'edit' ? 40 : null)
  if (mode === 'edit') expect(screen.getByAltText('Selected exercise photo')).toBeInTheDocument()
  else expect(screen.queryByAltText('Selected exercise photo')).not.toBeInTheDocument()
})

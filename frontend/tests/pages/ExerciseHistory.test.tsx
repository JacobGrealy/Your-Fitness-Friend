import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ExerciseHistory from '@/pages/Exercise/ExerciseHistory'
import { exerciseApi } from '@/api/exercise'
const setTitle = jest.fn()
jest.mock('@/components/layout/PageTitleContext', () => ({ usePageTitle: () => ({ setTitle }) }))
jest.mock('@/store/authStore', () => ({ useAuthStore: (selector: any) => selector({ user: { id: '7' } }) }))
jest.mock('@/api/exercise', () => ({ exerciseApi: { getExerciseLogs: jest.fn(), deleteExerciseLog: jest.fn() } }))
const api = exerciseApi as jest.Mocked<typeof exerciseApi>
const log: any = { id: '7', activity_id: 'treadmill_walking', exercise_name: 'Walking', duration: 30, date: '2026-10-21', calories_burned: 100, details: { speed_mph: 2.5, incline_percent: 3, distance_miles: 1.25, weight_lbs: 200, warnings: [] } }
beforeEach(() => { jest.clearAllMocks(); api.getExerciseLogs.mockResolvedValue([log]) })
const show = () => render(<MemoryRouter><ExerciseHistory /></MemoryRouter>)

test('shows typed details and edit/repeat links; sends inclusive filters', async () => {
  show()
  expect(await screen.findByText(/2.5 mph/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Edit session' })).toHaveAttribute('href', '/exercise/log?activity=treadmill_walking&edit=7')
  expect(screen.getByRole('link', { name: 'Repeat activity' })).toHaveAttribute('href', '/exercise/log?activity=treadmill_walking&repeat=7')
  fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-01-01' } })
  await waitFor(() => expect(api.getExerciseLogs).toHaveBeenLastCalledWith(expect.objectContaining({ start_date: '2026-01-01' })))
})

test('failed delete stays open and keeps session', async () => {
  api.deleteExerciseLog.mockRejectedValue({ response: { data: { error: 'Offline' } } })
  show()
  fireEvent.click(await screen.findByRole('button', { name: 'Delete session' }))
  fireEvent.click(screen.getAllByRole('button', { name: 'Delete session' })[1])
  expect(await screen.findByRole('alert')).toHaveTextContent('Offline')
  expect(screen.getByText('Walking')).toBeInTheDocument()
})

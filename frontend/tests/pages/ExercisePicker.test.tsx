import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LogExercise from '@/pages/Exercise/LogExercise'
import { exerciseApi } from '@/api/exercise'
const setTitle = jest.fn()
jest.mock('@/components/layout/PageTitleContext', () => ({ usePageTitle: () => ({ setTitle }) }))
jest.mock('@/store/authStore', () => ({ useAuthStore: (selector: any) => selector({ user: { id: '7' } }) }))
jest.mock('@/store/exerciseStore', () => ({ useExerciseStore: jest.fn() }))
jest.mock('@/api/exercise', () => ({ exerciseApi: { getCatalog: jest.fn() } }))
jest.mock('@/pages/Exercise/TreadmillSessionForm', () => () => <p>Walking session form</p>)
const api = exerciseApi as jest.Mocked<typeof exerciseApi>
beforeEach(() => { jest.clearAllMocks(); localStorage.clear() })
const show = () => render(<MemoryRouter><LogExercise /></MemoryRouter>)

test('built-in walking is available without any saved exercises', async () => {
  api.getCatalog.mockResolvedValue([{ id: 'treadmill_walking', name: 'Walking Pad / Treadmill', category: 'cardio', tracking_format: 'treadmill' }])
  show()
  fireEvent.click(await screen.findByRole('button', { name: /cardio Walking Pad/ }))
  expect(screen.getByText('Walking session form')).toBeInTheDocument()
})

test('favorites are persisted under authenticated identity', async () => {
  api.getCatalog.mockResolvedValue([{ id: 'treadmill_walking', name: 'Walking', category: 'cardio', tracking_format: 'treadmill' }])
  show()
  fireEvent.click(await screen.findByRole('button', { name: 'Favorite Walking' }))
  expect(localStorage.getItem('awefit.exercise:7:favorites')).toContain('treadmill_walking')
})

test('catalog failure is an error with retry, not empty library', async () => {
  api.getCatalog.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([])
  show()
  expect(await screen.findByRole('alert')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Retry activities' }))
  await waitFor(() => expect(screen.getByText('No built-in activities available.')).toBeInTheDocument())
})

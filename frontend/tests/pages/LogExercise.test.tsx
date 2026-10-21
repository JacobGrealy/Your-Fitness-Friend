import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LogExercise from '@/pages/Exercise/LogExercise'

const navigate = jest.fn()
const fetchSavedExercises = jest.fn()
const logExercise = jest.fn()
const setTitle = jest.fn()
const state: any = { savedExercises: [], fetchSavedExercises, logExercise, error: null, isLoading: false }
jest.mock('@/store/exerciseStore', () => ({ useExerciseStore: () => state }))
jest.mock('@/components/layout/PageTitleContext', () => ({ usePageTitle: () => ({ setTitle }) }))
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useNavigate: () => navigate }))

beforeEach(() => {
  jest.clearAllMocks()
  Object.assign(state, { savedExercises: [], error: null, isLoading: false })
})
const show = () => render(<MemoryRouter><LogExercise /></MemoryRouter>)

test('fetches on opening and offers library when empty', () => {
  show()
  expect(fetchSavedExercises).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('link', { name: /add an exercise/i })).toHaveAttribute('href', '/exercise/library')
})

test('shows loading and retryable request errors distinctly', () => {
  state.isLoading = true
  const view = show()
  expect(screen.getByRole('status')).toHaveTextContent('Loading exercises')
  state.isLoading = false
  state.error = 'Network unavailable'
  view.rerender(<MemoryRouter><LogExercise /></MemoryRouter>)
  expect(screen.getByRole('alert')).toHaveTextContent('Network unavailable')
  fireEvent.click(screen.getByRole('button', { name: /retry loading/i }))
  expect(fetchSavedExercises).toHaveBeenCalledTimes(2)
})

test.each([false, true])('navigates only on confirmed success: %s', async success => {
  state.savedExercises = [{ id: '1', name: 'Walking' }]
  logExercise.mockResolvedValue(success)
  show()
  fireEvent.change(screen.getByRole('combobox', { name: 'Exercise' }), { target: { value: '1' } })
  const duration = screen.getByPlaceholderText('e.g. 30')
  fireEvent.change(duration, { target: { value: '30' } })
  fireEvent.click(screen.getByRole('button', { name: 'Log Exercise' }))
  await waitFor(() => expect(logExercise).toHaveBeenCalled())
  if (success) expect(navigate).toHaveBeenCalledWith(-1)
  else {
    expect(navigate).not.toHaveBeenCalled()
    expect(duration).toHaveValue(30)
  }
})

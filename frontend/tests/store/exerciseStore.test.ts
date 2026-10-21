import { useExerciseStore } from '@/store/exerciseStore'
import { useAuthStore } from '@/store/authStore'
import { exerciseApi } from '@/api/exercise'

jest.mock('@/api/auth', () => ({ authApi: {} }))
jest.mock('@/api/exercise', () => ({ exerciseApi: {
  getSavedExercises: jest.fn(), getExerciseLogs: jest.fn(), logExercise: jest.fn(),
  saveExercise: jest.fn(), deleteSavedExercise: jest.fn(), deleteExerciseLog: jest.fn(),
} }))
const api = exerciseApi as jest.Mocked<typeof exerciseApi>
const login = (id: string) => useAuthStore.setState({ isAuthenticated: true, user: { id } as any })

beforeEach(() => {
  jest.clearAllMocks()
  useAuthStore.setState({ isAuthenticated: false, user: null })
  login('1')
  api.getSavedExercises.mockResolvedValue([])
  api.getExerciseLogs.mockResolvedValue([])
})

test('no request on module import; anonymous fetch does not call API', async () => {
  expect(api.getSavedExercises).not.toHaveBeenCalled()
  useAuthStore.setState({ isAuthenticated: false, user: null })
  await useExerciseStore.getState().fetchSavedExercises()
  expect(api.getSavedExercises).not.toHaveBeenCalled()
})

test('failed log returns false and preserves server error', async () => {
  api.logExercise.mockRejectedValue({ response: { data: { error: 'Weight required' } } })
  expect(await useExerciseStore.getState().logExercise({ exercise_id: '1', duration_minutes: 20 })).toBe(false)
  expect(useExerciseStore.getState().error).toBe('Weight required')
  expect(useExerciseStore.getState().isLoading).toBe(false)
})

test('successful log returns true and refreshes history', async () => {
  api.logExercise.mockResolvedValue({} as any)
  expect(await useExerciseStore.getState().logExercise({ exercise_id: '1', duration_minutes: 20 })).toBe(true)
  expect(api.getExerciseLogs).toHaveBeenCalledTimes(1)
})

test('account transition clears data and discards pending result', async () => {
  let resolve!: (value: any) => void
  api.getSavedExercises.mockReturnValue(new Promise(r => { resolve = r }))
  const request = useExerciseStore.getState().fetchSavedExercises()
  login('2')
  resolve([{ id: '1', name: 'Private exercise' }])
  await request
  expect(useExerciseStore.getState().savedExercises).toEqual([])
  expect(useExerciseStore.getState().isLoading).toBe(false)
})

test('delete normalizes numeric IDs and failure retains data', async () => {
  useExerciseStore.setState({ exerciseLogs: [{ id: 4 }] as any })
  api.deleteExerciseLog.mockRejectedValueOnce(new Error('offline'))
  expect(await useExerciseStore.getState().deleteExerciseLog('4')).toBe(false)
  expect(useExerciseStore.getState().exerciseLogs).toHaveLength(1)
  api.deleteExerciseLog.mockResolvedValue({})
  expect(await useExerciseStore.getState().deleteExerciseLog('4')).toBe(true)
  expect(useExerciseStore.getState().exerciseLogs).toEqual([])
})

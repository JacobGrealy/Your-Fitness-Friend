import { exerciseApi } from '@/api/exercise'
import { api } from '@/api/client'
jest.mock('@/api/client', () => ({ api: { get: jest.fn(), delete: jest.fn() } }))

test('normalizes saved IDs from backend JSON', async () => {
  ;(api.get as jest.Mock).mockResolvedValue({ data: [{ id: 3, name: 'Walk' }] })
  expect((await exerciseApi.getSavedExercises())[0].id).toBe('3')
})

test('normalizes history duration and passes dates', async () => {
  ;(api.get as jest.Mock).mockResolvedValue({ data: [{ id: 4, duration_min: 30 }] })
  expect(await exerciseApi.getExerciseLogs({ start_date: '2026-10-01' })).toEqual([{ id: '4', duration_min: 30, duration: 30 }])
  expect(api.get).toHaveBeenLastCalledWith('/exercise/logs', { params: { start_date: '2026-10-01' } })
})

test('deletion uses canonical backend URL', async () => {
  ;(api.delete as jest.Mock).mockResolvedValue({ data: {} })
  await exerciseApi.deleteExerciseLog('4')
  expect(api.delete).toHaveBeenCalledWith('/exercise/4')
})

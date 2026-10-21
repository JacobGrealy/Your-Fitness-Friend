import { exerciseApi } from '@/api/exercise'
import { api } from '@/api/client'
jest.mock('@/api/client', () => ({ api: { get: jest.fn(), delete: jest.fn(), post: jest.fn(), put: jest.fn() } }))

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

test('typed edit preview sends owned log identity for weight snapshot', async () => {
  ;(api.post as jest.Mock).mockResolvedValue({ data: {} })
  const data: any = { activity_id: 'treadmill_walking', date: '2026-10-01', duration_minutes: 30 }
  await exerciseApi.estimateSession(data, '7')
  expect(api.post).toHaveBeenLastCalledWith('/exercise/estimate', { ...data, log_id: '7' })
})

test('initial photo is one atomic multipart save, not JSON encoded FormData', async () => {
  ;(api.post as jest.Mock).mockResolvedValue({ data: { id: 8, duration_min: 30 } })
  const data: any = { activity_id: 'treadmill_walking', date: '2026-10-01', duration_minutes: 30 }
  const file = new File(['image'], 'image.jpg', { type: 'image/jpeg' })
  const result = await exerciseApi.saveSession(data, undefined, file)
  const [url, body, config] = (api.post as jest.Mock).mock.calls.at(-1)
  expect(url).toBe('/exercise/log')
  expect(body.get('data')).toBe(JSON.stringify(data))
  expect(body.get('photo')).toBe(file)
  expect(config.headers['Content-Type']).toBe('multipart/form-data')
  expect(result.id).toBe('8')
})

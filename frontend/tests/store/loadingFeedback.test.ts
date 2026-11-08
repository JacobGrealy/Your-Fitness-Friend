import { useUIStore } from '@/store/uiStore'
import { useFoodStore } from '@/store/foodStore'
import { useWeightStore } from '@/store/weightStore'
import { useDashboardStore } from '@/store/dashboardStore'
import { foodApi } from '@/api/food'
import { weightApi } from '@/api/weight'
import { dashboardApi } from '@/api/dashboard'

jest.mock('@/api/food', () => ({ foodApi: { getDailyTotals: jest.fn(), getFoodLogs: jest.fn(), getFoods: jest.fn(), getRecentFoods: jest.fn(), logFood: jest.fn() } }))
jest.mock('@/api/weight', () => ({ weightApi: { getLogs: jest.fn(), getStatistics: jest.fn(), getTrend: jest.fn(), updateLog: jest.fn() } }))
jest.mock('@/api/dashboard', () => ({ dashboardApi: { getDailySummary: jest.fn(), getWeightTrend: jest.fn() } }))
const deferred = () => { let resolve!: (value: any) => void; let reject!: (reason: unknown) => void; const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }

beforeEach(async () => {
  await Promise.resolve() // settle import-time reads
  jest.clearAllMocks()
  useFoodStore.setState({ diaryDate: null, logsDate: null, totalsDate: null, logsError: null, totalsError: null, error: null })
})

test('superseded food search failure cannot replace newer success with an error', async () => {
  const old = deferred(), latest = deferred()
  ;(foodApi.getFoods as jest.Mock).mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
  const first = useFoodStore.getState().fetchFoods({ search: 'old' } as any)
  const second = useFoodStore.getState().fetchFoods({ search: 'new' } as any)
  latest.resolve([{ id: 'new' }]); await second
  old.reject(new Error('old failure')); await first
  expect(useFoodStore.getState()).toMatchObject({ foods: [{ id: 'new' }], error: null, isLoading: false })
})

test('successful weight write preserves refresh failure through statistics without inviting another write', async () => {
  const stats = deferred()
  ;(weightApi.updateLog as jest.Mock).mockResolvedValueOnce({})
  ;(weightApi.getLogs as jest.Mock).mockRejectedValueOnce(new Error('offline'))
  ;(weightApi.getStatistics as jest.Mock).mockReturnValueOnce(stats.promise)
  const operation = useWeightStore.getState().updateLog('1', { weight: 180 })
  for (let i = 0; i < 8; i++) await Promise.resolve()
  expect(useWeightStore.getState().isLoading).toBe(true)
  expect(useWeightStore.getState().error).toBe('Failed to fetch weight logs')
  stats.resolve({}); await operation
  expect(useWeightStore.getState().error).toContain('Weight saved, but refresh failed')
  expect(useWeightStore.getState().error).toContain('do not submit again')
  expect(useUIStore.getState().toast).toEqual({ type: 'error', message: useWeightStore.getState().error })
  expect(weightApi.updateLog).toHaveBeenCalledTimes(1)
  expect(useWeightStore.getState().isLoading).toBe(false)
})

test('food overlapping reads remain loading until both settle, including failure', async () => {
  const a = deferred(), b = deferred()
  ;(foodApi.getFoods as jest.Mock).mockReturnValueOnce(a.promise)
  ;(foodApi.getRecentFoods as jest.Mock).mockReturnValueOnce(b.promise)
  const first = useFoodStore.getState().fetchFoods(), second = useFoodStore.getState().fetchRecentFoods()
  expect(useFoodStore.getState().isLoading).toBe(true)
  a.resolve([]); await first
  expect(useFoodStore.getState().isLoading).toBe(true)
  b.reject(new Error('offline')); await second
  expect(useFoodStore.getState().isLoading).toBe(false)
})

test('weight and dashboard do not prematurely clear concurrent loading', async () => {
  const a = deferred(), b = deferred(), c = deferred(), d = deferred()
  ;(weightApi.getLogs as jest.Mock).mockReturnValueOnce(a.promise)
  ;(weightApi.getStatistics as jest.Mock).mockReturnValueOnce(b.promise)
  ;(dashboardApi.getDailySummary as jest.Mock).mockReturnValueOnce(c.promise)
  ;(dashboardApi.getWeightTrend as jest.Mock).mockReturnValueOnce(d.promise)
  const first = useWeightStore.getState().fetchLogs(), second = useWeightStore.getState().fetchStatistics()
  const third = useDashboardStore.getState().fetchDailySummary(), fourth = useDashboardStore.getState().fetchWeightTrend()
  a.resolve([]); c.resolve({}); await Promise.all([first, third])
  expect(useWeightStore.getState().isLoading).toBe(true)
  expect(useDashboardStore.getState().isLoading).toBe(true)
  b.resolve({}); d.resolve([]); await Promise.all([second, fourth])
  expect(useWeightStore.getState().isLoading).toBe(false)
  expect(useDashboardStore.getState().isLoading).toBe(false)
})

test('only latest diary date can publish logs, totals or errors after reverse-order responses', async () => {
  const logs = [deferred(), deferred(), deferred()], totals = [deferred(), deferred(), deferred()]
  logs.forEach(value => (foodApi.getFoodLogs as jest.Mock).mockReturnValueOnce(value.promise))
  totals.forEach(value => (foodApi.getDailyTotals as jest.Mock).mockReturnValueOnce(value.promise))
  const requests = ['2026-01-01', '2026-01-02', '2026-01-03'].map(date => Promise.all([useFoodStore.getState().fetchFoodLogs(date), useFoodStore.getState().fetchDailyTotals(date)]))
  logs[2].resolve([{ id: 'C' }]); totals[2].resolve({ total_calories: 300 }); await requests[2]
  logs[1].resolve([{ id: 'B' }]); totals[1].reject(new Error('old failure')); await requests[1]
  logs[0].resolve([{ id: 'A' }]); totals[0].resolve({ total_calories: 100 }); await requests[0]
  expect(useFoodStore.getState()).toMatchObject({ diaryDate: '2026-01-03', logsDate: '2026-01-03', totalsDate: '2026-01-03', foodLogs: [{ id: 'C' }], dailyTotals: { total_calories: 300 }, logsError: null, totalsError: null })
})

test('a write stays pending through its refreshes, which retain the selected historical date', async () => {
  const logs = deferred(), totals = deferred()
  useFoodStore.setState({ diaryDate: '2026-01-03', foods: [] })
  ;(foodApi.logFood as jest.Mock).mockResolvedValueOnce({ id: 'new' })
  ;(foodApi.getFoodLogs as jest.Mock).mockReturnValueOnce(logs.promise)
  ;(foodApi.getDailyTotals as jest.Mock).mockReturnValueOnce(totals.promise)
  const writing = useFoodStore.getState().logFood({ food_name: 'Food', calories: 100, meal_type: 'lunch', date: '2026-01-03' })
  await Promise.resolve()
  expect(useFoodStore.getState().isLoading).toBe(true)
  expect(foodApi.getFoodLogs).toHaveBeenCalledWith({ date: '2026-01-03' })
  logs.resolve([]); await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
  expect(useFoodStore.getState().isLoading).toBe(true)
  totals.resolve({}); await writing
  expect(foodApi.getDailyTotals).toHaveBeenLastCalledWith('2026-01-03')
  expect(useFoodStore.getState().isLoading).toBe(false)
})

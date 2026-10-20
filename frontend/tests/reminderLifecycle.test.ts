import { waitFor } from '@testing-library/react'
import { startReminderSync, affectsReminders, refreshReminderSchedule } from '@/reminderLifecycle'
import { DEFAULT_REMINDERS } from '@/notifications'

const get = jest.fn()
const useInterceptor = jest.fn()
const eject = jest.fn()
const apply = jest.fn()
const available = jest.fn()
const isNative = jest.fn()
const addListener = jest.fn()
const removeListener = jest.fn()
let nativeResume: (value: {isActive: boolean}) => void
let handler: (response: any) => Promise<any>
const settings = { ...DEFAULT_REMINDERS, lunch: { enabled: true, hour: 12, minute: 30 } }
jest.mock('@/api/client', () => ({ api: {
  get: (...args: unknown[]) => get(...args),
  interceptors: { response: {
    use: (...args: unknown[]) => useInterceptor(...args), eject: (...args: unknown[]) => eject(...args),
  } },
} }))
jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => isNative() },
  registerPlugin: () => ({ addListener: (...args: unknown[]) => addListener(...args) }),
}))
jest.mock('@/notifications', () => ({
  ...jest.requireActual('@/notifications'),
  applyReminders: (...args: unknown[]) => apply(...args),
  loadReminders: () => settings,
  remindersAvailable: () => available(),
}))
let stop: (() => void) | undefined
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 9, 20, 9, 0))
  jest.clearAllMocks()
  localStorage.clear()
  isNative.mockReturnValue(true)
  available.mockReturnValue(true)
  apply.mockResolvedValue('scheduled')
  get.mockImplementation(async url => ({ data: url === '/food/log' ? { logs: [] } : [] }))
  useInterceptor.mockImplementation(callback => { handler = callback; return 42 })
  addListener.mockImplementation(async (_event, callback) => {
    nativeResume = callback
    return { remove: removeListener }
  })
})
afterEach(() => { stop?.(); stop = undefined; jest.useRealTimers() })

it.each([
  ['post', '/food/log'], ['put', '/food/log/7'], ['delete', '/food/log/7'],
  ['post', '/food/log/copy'], ['post', '/meals/ai-log'],
  ['post', '/weight/logs'], ['put', '/weight/logs/2'], ['delete', '/weight/logs/2'],
])('reconciles the successful %s %s write path', async (method, url) => {
  stop = startReminderSync('7')
  await waitFor(() => expect(apply).toHaveBeenCalledTimes(1))
  get.mockImplementation(async path => ({data: path === '/food/log'
    ? {logs:[{date:'2026-10-20',meal_type:'lunch'}]} : [{recorded_at:'2026-10-20T00:00:00'}]}))
  const response = { config: {method, url}, data: {} }
  await expect(handler(response)).resolves.toBe(response)
  expect(apply).toHaveBeenLastCalledWith(settings, expect.objectContaining({
    meals: { breakfast: false, lunch: true, dinner: false }, weighIn: true,
  }), true)
})

it('does not react to reads or unrelated writes and cannot turn a saved log into failure', async () => {
  stop = startReminderSync('7')
  await waitFor(() => expect(apply).toHaveBeenCalledTimes(1))
  expect(affectsReminders('get', '/food/log')).toBe(false)
  expect(affectsReminders('post', '/exercise/log')).toBe(false)
  expect(affectsReminders('post', '/food')).toBe(false)
  await handler({config:{method:'get',url:'/food/log'}})
  expect(apply).toHaveBeenCalledTimes(1)
  get.mockRejectedValue(new Error('offline'))
  apply.mockRejectedValue(new Error('native offline'))
  const saved = {config:{method:'post',url:'/food/log'},data:{id:9}}
  await expect(handler(saved)).resolves.toBe(saved)
})

it('reconciles launch, native resume, visibility and local midnight', async () => {
  stop = startReminderSync('7')
  await waitFor(() => expect(apply).toHaveBeenCalledTimes(1))
  nativeResume({isActive:true})
  await waitFor(() => expect(apply).toHaveBeenCalledTimes(2))
  document.dispatchEvent(new Event('visibilitychange'))
  await waitFor(() => expect(apply).toHaveBeenCalledTimes(3))
  jest.setSystemTime(new Date(2026,9,21,0,0))
  jest.advanceTimersByTime(60000)
  await waitFor(() => expect(apply).toHaveBeenCalledTimes(4))
  expect(apply).toHaveBeenLastCalledWith(settings, expect.objectContaining({date:'2026-10-21'}), true)
})

it('detaches every subscription and ignores old responses after account switch', async () => {
  stop = startReminderSync('7')
  await waitFor(() => expect(apply).toHaveBeenCalledTimes(1))
  stop()
  stop = undefined
  expect(eject).toHaveBeenCalledWith(42)
  expect(removeListener).toHaveBeenCalled()
  nativeResume({isActive:true})
  window.dispatchEvent(new Event('focus'))
  await Promise.resolve()
  expect(apply).toHaveBeenCalledTimes(1)
  await expect(refreshReminderSchedule()).resolves.toBe('unsupported')
})

it('does no notification work or extra requests in an ordinary browser', () => {
  isNative.mockReturnValue(false)
  stop = startReminderSync('7')
  expect(get).not.toHaveBeenCalled()
  expect(useInterceptor).not.toHaveBeenCalled()
})

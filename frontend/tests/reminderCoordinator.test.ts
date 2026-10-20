import { createReminderCoordinator } from '@/reminderCoordinator'
import { DEFAULT_REMINDERS } from '@/notifications'

const settings = { ...DEFAULT_REMINDERS,
  breakfast: { enabled: true, hour: 8, minute: 0 },
  lunch: { enabled: true, hour: 12, minute: 30 },
  dinner: { enabled: true, hour: 18, minute: 30 },
  weighIn: { enabled: true, weekday: 2, hour: 9, minute: 0 },
}
let date: string
let active: boolean
let meals: jest.Mock
let weights: jest.Mock
let apply: jest.Mock
function coordinator(userId = '7') {
  return createReminderCoordinator({ userId, isCurrent: () => active, meals, weights,
    today: () => date, settings: () => settings, apply })
}
beforeEach(() => {
  localStorage.clear()
  date = '2026-10-20'
  active = true
  meals = jest.fn().mockResolvedValue([])
  weights = jest.fn().mockResolvedValue([])
  apply = jest.fn().mockResolvedValue('scheduled')
})
const last = () => apply.mock.calls[apply.mock.calls.length - 1][1]

it('suppresses only the meal logged on the local calendar date, including copied/AI logs', async () => {
  meals.mockResolvedValue([
    { date, meal_type: 'lunch' }, { date, meal_type: 'lunch' },
    { date: '2026-10-19', meal_type: 'breakfast' }, { date, meal_type: 'snack' },
  ])
  await coordinator().refresh()
  expect(meals).toHaveBeenCalledWith(date)
  expect(last()).toEqual({ userId: '7', date, meals: { breakfast: false, lunch: true, dinner: false }, weighIn: false })
})

it('suppresses weigh-in for today, not a previous or future weigh-in', async () => {
  const sync = coordinator()
  weights.mockResolvedValue([{ recorded_at: date + 'T00:00:00' }])
  await sync.refresh()
  expect(last().weighIn).toBe(true)
  weights.mockResolvedValue([{ recorded_at: '2026-10-19T23:59:59' }, { recorded_at: '2026-10-21T00:00:00' }])
  await sync.refresh()
  expect(last().weighIn).toBe(false)
})

it('deleting one of two entries keeps suppression; deleting the last restores eligibility', async () => {
  const sync = coordinator()
  meals.mockResolvedValue([{ date, meal_type: 'dinner' }, { date, meal_type: 'dinner' }])
  await sync.refresh()
  expect(last().meals.dinner).toBe(true)
  meals.mockResolvedValue([{ date, meal_type: 'dinner' }])
  await sync.refresh()
  expect(last().meals.dinner).toBe(true)
  meals.mockResolvedValue([])
  await sync.refresh()
  expect(last().meals.dinner).toBe(false)
})

it('does not treat an offline/error response as an empty diary', async () => {
  const sync = coordinator()
  meals.mockResolvedValue([{ date, meal_type: 'breakfast' }])
  weights.mockResolvedValue([{ recorded_at: date + 'T00:00:00' }])
  await sync.refresh()
  meals.mockRejectedValue(new Error('offline'))
  weights.mockRejectedValue(new Error('offline'))
  await sync.refresh()
  expect(last().meals.breakfast).toBe(true)
  expect(last().weighIn).toBe(true)
})

it('unknown status on first launch is omitted so native state can be preserved', async () => {
  meals.mockRejectedValue(new Error('offline'))
  weights.mockRejectedValue(new Error('offline'))
  await coordinator().refresh()
  expect(last()).toEqual({ userId: '7', date })
})

it('completion cache is user- and date-scoped', async () => {
  meals.mockResolvedValue([{ date, meal_type: 'lunch' }])
  await coordinator().refresh()
  meals.mockRejectedValue(new Error('offline'))
  await coordinator('8').refresh()
  expect(last().meals).toBeUndefined()
  date = '2026-10-21'
  await coordinator().refresh()
  expect(last().meals).toBeUndefined()
})

it('discards in-flight status when logging out or changing accounts', async () => {
  let resolve!: (value: unknown[]) => void
  meals.mockImplementation(() => new Promise(r => { resolve = r }))
  const job = coordinator().refresh()
  await Promise.resolve()
  active = false
  resolve([{ date, meal_type: 'lunch' }])
  await job
  expect(apply).not.toHaveBeenCalled()
})

it('rechecks the new local day if midnight happens during the request', async () => {
  meals.mockImplementationOnce(async () => {
    date = '2026-10-21'
    return [{ date: '2026-10-20', meal_type: 'dinner' }]
  }).mockResolvedValue([])
  await coordinator().refresh()
  expect(meals.mock.calls.map(args => args[0])).toEqual(['2026-10-20', '2026-10-21'])
  expect(last().date).toBe('2026-10-21')
  expect(last().meals.dinner).toBe(false)
})

it('serializes concurrent requests so a late old response cannot re-enable a completed meal', async () => {
  let resolve!: (value: unknown[]) => void
  meals.mockImplementationOnce(() => new Promise(r => { resolve = r }))
    .mockResolvedValueOnce([{ date, meal_type: 'breakfast' }])
  const sync = coordinator()
  const first = sync.refresh()
  const second = sync.refresh()
  await Promise.resolve()
  expect(meals).toHaveBeenCalledTimes(1)
  resolve([])
  await Promise.all([first, second])
  expect(last().meals.breakfast).toBe(true)
})

it('settings-only changes reconcile against completion and request permission only interactively', async () => {
  await coordinator().refresh(settings, true)
  expect(apply).toHaveBeenCalledWith(settings, expect.anything(), false)
})

it('turning all reminders off does not need an online server', async () => {
  await coordinator().refresh(DEFAULT_REMINDERS)
  expect(meals).not.toHaveBeenCalled()
  expect(apply).toHaveBeenCalledWith(DEFAULT_REMINDERS, { userId: '7', date }, true)
})

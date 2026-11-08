import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DailyFood from '@/pages/Food/DailyFood'
import { useFoodStore } from '@/store/foodStore'
import { foodApi } from '@/api/food'
import { diaryApi } from '@/api/diary'

jest.mock('@/api/food', () => ({ foodApi: { getFoodLogs: jest.fn(), getDailyTotals: jest.fn(), deleteFoodLog: jest.fn() } }))
jest.mock('@/api/diary', () => ({ diaryApi: { getCompletion: jest.fn(), complete: jest.fn(), undo: jest.fn() } }))
jest.mock('@/components/food/DiaryExerciseSection', () => () => null)
jest.mock('@/components/food/DiaryHealthSections', () => () => null)
jest.mock('@/components/food/DiaryHydrationSection', () => () => null)
jest.mock('@/components/dashboard/CalorieSummaryBar', () => ({ calories }: any) => <div>Selected calories: {calories.consumed}</div>)
const setTitle = jest.fn(), setCenterContent = jest.fn()
jest.mock('@/components/layout/PageTitleContext', () => ({ usePageTitle: () => ({ setTitle, setCenterContent }) }))
// A deterministic date control lets these tests exercise fast A/B/C navigation.
jest.mock('@/components/food/DiaryDateSelector', () => ({ onChange }: any) => <div>{['01', '02', '03'].map(day => <button key={day} onClick={() => onChange(new Date(`2026-01-${day}T12:00:00`))}>Day {day}</button>)}</div>)
const deferred = () => { let resolve!: (value: any) => void; let reject!: (reason: unknown) => void; const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const log = (name: string): any => ({ id: name, food_name: name, calories: 100, protein_g: 1, carbs_g: 2, fat_g: 3, meal_type: 'breakfast' })
jest.mock('@/components/food/ClosedDayPanel', () => ({ onReopen }: any) => <button onClick={onReopen}>Reopen test diary</button>)
jest.mock('@/components/food/CompleteDiaryModal', () => () => <div>Completion celebration</div>)
const completion = { completed: false }
const view = () => render(<MemoryRouter initialEntries={['/food/daily?date=2026-01-01']}><DailyFood /></MemoryRouter>)

beforeEach(async () => {
  await Promise.resolve()
  jest.clearAllMocks()
  useFoodStore.setState({ foodLogs: [], dailyTotals: null, diaryDate: null, logsDate: null, totalsDate: null, logsLoading: false, totalsLoading: false, logsError: null, totalsError: null, error: null })
  ;(foodApi.getFoodLogs as jest.Mock).mockResolvedValue([log('Day A food')])
  ;(foodApi.getDailyTotals as jest.Mock).mockResolvedValue({ total_calories: 100 })
  ;(diaryApi.getCompletion as jest.Mock).mockResolvedValue(completion)
})

test('hides previous foods, totals, completion and actions immediately; reverse-order date reads cannot overwrite C', async () => {
  view()
  await screen.findByText('Day A food')
  const b = { logs: deferred(), totals: deferred(), completion: deferred() }
  const c = { logs: deferred(), totals: deferred(), completion: deferred() }
  ;(foodApi.getFoodLogs as jest.Mock).mockReturnValueOnce(b.logs.promise).mockReturnValueOnce(c.logs.promise)
  ;(foodApi.getDailyTotals as jest.Mock).mockReturnValueOnce(b.totals.promise).mockReturnValueOnce(c.totals.promise)
  ;(diaryApi.getCompletion as jest.Mock).mockReturnValueOnce(b.completion.promise).mockReturnValueOnce(c.completion.promise)
  fireEvent.click(screen.getByText('Day 02'))
  expect(screen.getByText('Loading diary…')).toBeInTheDocument()
  expect(screen.queryByText('Day A food')).not.toBeInTheDocument()
  expect(screen.queryByText('Selected calories: 100')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Complete Diary' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Delete Day A/ })).not.toBeInTheDocument()
  fireEvent.click(screen.getByText('Day 03'))
  await act(async () => { c.logs.resolve([log('Day C food')]); c.totals.resolve({ total_calories: 300 }); c.completion.resolve(completion) })
  expect(await screen.findByText('Day C food')).toBeInTheDocument()
  expect(screen.getByText('Selected calories: 300')).toBeInTheDocument()
  await act(async () => { b.logs.resolve([log('Day B food')]); b.totals.resolve({ total_calories: 200 }); b.completion.resolve({ completed: true }) })
  expect(screen.queryByText('Day B food')).not.toBeInTheDocument()
  expect(screen.getByText('Selected calories: 300')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Complete Diary' })).toBeInTheDocument()
})

test.each(['foods', 'totals', 'completion'])('failed %s read shows Retry rather than empty success', async kind => {
  const method = kind === 'foods' ? foodApi.getFoodLogs : kind === 'totals' ? foodApi.getDailyTotals : diaryApi.getCompletion
  ;(method as jest.Mock).mockRejectedValueOnce(new Error('offline'))
  view()
  await screen.findByRole('button', { name: 'Retry diary' })
  expect(screen.queryByRole('button', { name: 'Complete Diary' })).not.toBeInTheDocument()
  expect(screen.queryByText('0 calories')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Retry diary' }))
  expect(await screen.findByText('Day A food')).toBeInTheDocument()
})

test.each(['complete', 'undo'] as const)('ignores old-visit %s success and error after A-B-A navigation', async action => {
  const old = deferred()
  ;(diaryApi[action] as jest.Mock).mockReturnValueOnce(old.promise)
  if (action === 'undo') (diaryApi.getCompletion as jest.Mock).mockResolvedValue({ completed: true })
  view()
  await screen.findByText('Day A food')
  fireEvent.click(screen.getByRole('button', { name: action === 'complete' ? 'Complete Diary' : 'Reopen test diary' }))
  fireEvent.click(screen.getByText('Day 02'))
  await screen.findByText('Day A food')
  fireEvent.click(screen.getByText('Day 01'))
  await screen.findByText('Day A food')
  await act(async () => old.resolve({ completed: true }))
  expect(screen.queryByText('Completion celebration')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: action === 'complete' ? 'Complete Diary' : 'Reopen test diary' })).toBeInTheDocument()
})

test.each(['complete', 'undo'] as const)('ignores old-visit %s failure after A-B-A navigation', async action => {
  const old = deferred()
  ;(diaryApi[action] as jest.Mock).mockReturnValueOnce(old.promise)
  if (action === 'undo') (diaryApi.getCompletion as jest.Mock).mockResolvedValue({ completed: true })
  view()
  await screen.findByText('Day A food')
  fireEvent.click(screen.getByRole('button', { name: action === 'complete' ? 'Complete Diary' : 'Reopen test diary' }))
  fireEvent.click(screen.getByText('Day 02')); await screen.findByText('Day A food')
  fireEvent.click(screen.getByText('Day 01')); await screen.findByText('Day A food')
  await act(async () => old.reject(new Error('old failure')))
  expect(screen.queryByRole('button', { name: 'Retry diary' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: action === 'complete' ? 'Complete Diary' : 'Reopen test diary' })).toBeInTheDocument()
})

test('delete errors are isolated to their dialog and date visit', async () => {
  const old = deferred()
  ;(foodApi.deleteFoodLog as jest.Mock).mockReturnValueOnce(old.promise)
  view()
  fireEvent.click(await screen.findByRole('button', { name: 'Delete Day A food' }))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete', exact: true }))
  fireEvent.click(screen.getByText('Day 02')); await screen.findByText('Day A food')
  fireEvent.click(screen.getByText('Day 01')); await screen.findByText('Day A food')
  fireEvent.click(screen.getByRole('button', { name: 'Delete Day A food' }))
  await act(async () => old.reject(new Error('stale deletion')))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})

test('delete confirmation remains pending, then retains error and allows explicit retry', async () => {
  const deletion = deferred()
  ;(foodApi.deleteFoodLog as jest.Mock).mockReturnValueOnce(deletion.promise).mockResolvedValueOnce({})
  view()
  fireEvent.click(await screen.findByRole('button', { name: 'Delete Day A food' }))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete', exact: true }))
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).getByRole('button', { name: 'Deleting…' })).toBeDisabled()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  expect(dialog).toBeInTheDocument()
  await act(async () => deletion.reject(new Error('offline')))
  expect(within(dialog).getByRole('alert')).toHaveTextContent('Failed to delete food log')
  expect(within(dialog).getByRole('button', { name: 'Delete', exact: true })).not.toBeDisabled()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete', exact: true }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(foodApi.deleteFoodLog).toHaveBeenCalledTimes(2)
})

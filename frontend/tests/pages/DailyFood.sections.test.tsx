import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DailyFood from '@/pages/Food/DailyFood'

// FF-0137: the Weight section was asked for below the medication section. The sections
// are rendered from one place, so this pins the order rather than trusting a comment.

jest.mock('@/components/layout/PageTitleContext', () => ({
  usePageTitle: () => ({ setTitle: jest.fn(), setCenterContent: jest.fn(), setHeaderRightContent: jest.fn() }),
}))
jest.mock('@/components/food/DiaryDateSelector', () => () => null)
jest.mock('@/store/authStore', () => ({ useAuthStore: (s: any) => s({ user: { id: 7 } }) }))
jest.mock('@/store/foodStore', () => ({
  useFoodStore: () => ({
    foodLogs: [],
    dailyTotals: null,
    logsDate: '2026-10-19', totalsDate: '2026-10-19',
    logsLoading: false, totalsLoading: false,
    logsError: null, totalsError: null,
    fetchFoodLogs: jest.fn(),
    fetchDailyTotals: jest.fn(),
    deleteFoodLog: jest.fn(),
    copyMeal: jest.fn(),
  }),
}))
jest.mock('@/api/diary', () => ({
  diaryApi: {
    getCompletion: jest.fn(async () => ({ completed: false, streaks: null, week: null })),
    complete: jest.fn(),
    undo: jest.fn(),
  },
}))
jest.mock('@/api/diaryCopy', () => ({ copyDiary: jest.fn() }))
jest.mock('@/api/exercise', () => ({ exerciseApi: { getExerciseLogs: jest.fn(async () => []), deleteExerciseLog: jest.fn() } }))
jest.mock('@/api/health', () => ({ healthApi: { list: jest.fn(async () => []) }, healthError: () => 'Request failed' }))
jest.mock('@/api/hydration', () => ({
  hydrationApi: { list: jest.fn(async () => ({ date: '2026-10-19', total_oz: 0, logs: [] })) },
  hydrationError: () => 'Request failed',
}))
jest.mock('@/api/weight', () => ({ weightApi: { getLogsByDate: jest.fn(async () => []), deleteLog: jest.fn() } }))

const section = (name: string) => screen.getByRole('region', { name })

test('the weight section sits below the medication section and keeps the diary order', async () => {
  render(
    <MemoryRouter initialEntries={['/food/daily?date=2026-10-19']}>
      <DailyFood />
    </MemoryRouter>
  )

  const exercise = section('Diary exercise')
  const hydration = section('Diary Hydration')
  const medication = section('Diary Medication')
  const bowel = section('Diary Bowel Movements')
  const weight = section('Diary Weight')

  // compareDocumentPosition is a bitmask; FOLLOWING means the second node comes later.
  const follows = (first: Element, second: Element) =>
    Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)

  expect(follows(exercise, hydration)).toBe(true)
  expect(follows(hydration, medication)).toBe(true)
  expect(follows(medication, bowel)).toBe(true)
  expect(follows(medication, weight)).toBe(true)
  expect(follows(bowel, weight)).toBe(true)
  expect(await screen.findByText('No weight logged for this day.')).toBeInTheDocument()
})

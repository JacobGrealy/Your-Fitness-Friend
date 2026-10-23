import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DailyFood from '@/pages/Food/DailyFood'
jest.mock('@/components/food/DiaryExerciseSection', () => () => null)
jest.mock('@/components/food/DiaryHealthSections', () => () => null)
jest.mock('@/components/food/DiaryHydrationSection', () => () => null)

// FF-0092: the diary row rendered `P:{log.protein_g}g` raw, so the peanut butter entry showed
// 0.7000000000000001. Every macro on this screen now formats to at most 2 decimals.

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}))
jest.mock('@/components/layout/PageTitleContext', () => ({
  usePageTitle: () => ({
    setTitle: jest.fn(),
    setCenterContent: jest.fn(),
    setHeaderRightContent: jest.fn(),
  }),
}))

const noisyLog = {
  id: '85',
  food_id: '30',
  food_name: 'Creamy Peanut Butter',
  calories: 19,
  protein_g: 0.7000000000000001,
  carbs_g: 0.8,
  fat_g: 1.6,
  calories_per_serving: 38,
  protein_per_serving: 7,
  carbs_per_serving: 8,
  fat_per_serving: 16,
  number_of_servings: 1,
  serving_size: '2 tbsp',
  brand: null,
  barcode_id: null,
  date: '2026-10-19',
  meal_type: 'breakfast',
  photo_url: null,
}

jest.mock('@/store/foodStore', () => ({
  useFoodStore: () => ({
    foodLogs: [noisyLog],
    dailyTotals: null,
    isLoading: false,
    error: null,
    fetchFoodLogs: jest.fn(),
    fetchDailyTotals: jest.fn(),
    deleteFoodLog: jest.fn(),
    copyMeal: jest.fn(),
  }),
}))
jest.mock('@/api/diary', () => ({
  diaryApi: {
    getStreaks: jest.fn(async () => null),
    getWeek: jest.fn(async () => null),
    getCompletion: jest.fn(async () => ({ status: 'open', message: '', totals: null, projection: null })),
    completeDay: jest.fn(),
    reopenDay: jest.fn(),
  },
}))

describe('Diary macro display (FF-0092)', () => {
  it('shows at most 2 decimals for a stored noisy value', async () => {
    render(
      <MemoryRouter initialEntries={['/food/daily']}>
        <DailyFood />
      </MemoryRouter>
    )

    const row = await screen.findByText(/Creamy Peanut Butter/)
    expect(row).toBeInTheDocument()

    // the reported symptom must not appear anywhere on the screen
    expect(document.body.textContent).not.toContain('0.7000000000000001')
    expect(document.body.textContent).toContain('P:0.7g')
  })
})

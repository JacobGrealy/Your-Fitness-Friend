import { formatServing } from '@/utils/formatters'

// FF-0029: the serving amount on a diary row.

describe('formatServing', () => {
  it('combines a count with a serving size', () => {
    expect(formatServing(2, '170 g')).toBe('2 × 170 g')
    expect(formatServing(1, '1 cup')).toBe('1 × 1 cup')
  })

  it('keeps decimals that matter and drops the ones that do not', () => {
    expect(formatServing(1.5, '100 g')).toBe('1.5 × 100 g')
    expect(formatServing(2.0, '100 g')).toBe('2 × 100 g')
  })

  it('falls back to whichever half is known', () => {
    expect(formatServing(2, null)).toBe('2 servings')
    expect(formatServing(1, '')).toBe('1 serving')
    expect(formatServing(null, '1 scoop')).toBe('1 scoop')
  })

  it('says nothing when neither is known', () => {
    expect(formatServing(null, null)).toBeNull()
    expect(formatServing(undefined, undefined)).toBeNull()
    expect(formatServing(0, '')).toBeNull()
  })
})

// The diary row uses the formatter; this guards the wiring, since the fields were
// already on FoodLog.to_dict() and only needed rendering (FF-0029).
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DailyFood from '@/pages/Food/DailyFood'

const navigate = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => navigate,
}))

jest.mock('@/store/foodStore', () => ({
  useFoodStore: () => ({
    foodLogs: [
      {
        id: '1', user_id: '1', food_name: 'Greek Yogurt', calories: 120,
        protein_g: 17, carbs_g: 6, fat_g: 0, serving_size: '170 g',
        number_of_servings: 2, photo_url: null, brand: 'Chobani',
        barcode_id: null, food_id: '7', date: '2026-10-17',
        meal_type: 'breakfast', created_at: '2026-10-17T08:00:00',
      },
      {
        id: '2', user_id: '1', food_name: 'Mystery Bite', calories: 50,
        protein_g: 1, carbs_g: 5, fat_g: 2, photo_url: null,
        barcode_id: null, food_id: null, date: '2026-10-17',
        meal_type: 'snack', created_at: '2026-10-17T15:00:00',
      },
    ],
    dailyTotals: { total_calories: 170, calorie_goal: 2000, calories_remaining: 1830 },
    isLoading: false,
    error: null,
    fetchDailyTotals: jest.fn(),
    fetchFoodLogs: jest.fn(),
    deleteFoodLog: jest.fn(),
  }),
}))

jest.mock('@/components/layout/PageTitleContext', () => ({
  usePageTitle: () => ({ setTitle: jest.fn(), setHeaderRightContent: jest.fn(), setCenterContent: jest.fn(), headerRightContent: null, centerContent: null }),
}))

describe('serving amounts on diary rows (FF-0029)', () => {
  it('shows how much was eaten when the log recorded it', () => {
    render(
      <MemoryRouter>
        <DailyFood />
      </MemoryRouter>
    )

    expect(screen.getByText(/2 × 170 g/)).toBeInTheDocument()
  })

  it('omits the serving entirely when the log has none', () => {
    render(
      <MemoryRouter>
        <DailyFood />
      </MemoryRouter>
    )

    const row = screen.getByText('Mystery Bite').closest('[role="button"]') as HTMLElement
    expect(row.textContent).not.toMatch(/×/)
    expect(row.textContent).toMatch(/50 cal/)
  })
})

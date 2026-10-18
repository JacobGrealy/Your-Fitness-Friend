import { useFoodStore } from '@/store/foodStore'
import { foodApi } from '@/api/food'
import { useUIStore } from '@/store/uiStore'

// FF-0065: deleting a custom food is one call the UI has always made. These tests
// pin the behaviour the owner chose: the food goes, diary entries are untouched, and
// the toast says how many entries were kept.

jest.mock('@/api/food', () => ({
  foodApi: {
    deleteFood: jest.fn(),
    fetchFoods: jest.fn(),
    createFood: jest.fn(),
  },
}))

jest.mock('@/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}))

const deleteFood = foodApi.deleteFood as jest.Mock
const showToast = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  useUIStore.setState({ ...useUIStore.getState(), showToast })
  useFoodStore.setState({
    ...useFoodStore.getState(),
    foods: [
      // ids arrive from JSON as numbers even though the type says string
      { id: 21 as unknown as string, name: 'Honey roasted peanuts', calories: 536 },
      { id: 22 as unknown as string, name: 'Cheese', calories: 120 },
    ] as never,
    isLoading: false,
    error: null,
  })
})

describe('deleteFood (FF-0065)', () => {
  it('removes the food from the list', async () => {
    deleteFood.mockResolvedValue({ message: 'Food deleted', id: 21, logs_kept: 0 })

    await useFoodStore.getState().deleteFood('21')

    const names = useFoodStore.getState().foods.map((food) => food.name)
    expect(names).toEqual(['Cheese'])
    expect(showToast).toHaveBeenCalledWith('Food deleted', 'success')
  })

  it('says so when diary entries were kept', async () => {
    deleteFood.mockResolvedValue({ message: 'Food deleted', id: 21, logs_kept: 3 })

    await useFoodStore.getState().deleteFood('21')

    expect(showToast).toHaveBeenCalledWith(
      'Food deleted — 3 diary entries kept their own values',
      'success'
    )
  })

  it('uses the singular for one entry', async () => {
    deleteFood.mockResolvedValue({ message: 'Food deleted', id: 21, logs_kept: 1 })

    await useFoodStore.getState().deleteFood('21')

    expect(showToast).toHaveBeenCalledWith(
      'Food deleted — 1 diary entry kept its own values',
      'success'
    )
  })

  it('matches numeric ids against the string the UI passes', async () => {
    deleteFood.mockResolvedValue({ message: 'Food deleted', id: 21, logs_kept: 0 })

    await useFoodStore.getState().deleteFood('21')

    // If the comparison were type-strict the entry would linger until a refetch.
    expect(useFoodStore.getState().foods).toHaveLength(1)
  })

  it('reports the API error instead of failing silently', async () => {
    deleteFood.mockRejectedValue({ response: { data: { error: 'Food not found' } } })

    await useFoodStore.getState().deleteFood('99')

    expect(showToast).toHaveBeenCalledWith('Food not found', 'error')
    expect(useFoodStore.getState().error).toBe('Food not found')
    // the list is untouched when the delete fails
    expect(useFoodStore.getState().foods).toHaveLength(2)
  })
})

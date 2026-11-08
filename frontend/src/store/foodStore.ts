import { create } from 'zustand'
import { withPendingRequests } from './pendingRequests'
import { foodApi } from '@/api/food'
import type { Food, FoodLog, DailyTotals, FoodCreate, FoodLogCreate, FoodSearch, MacroGoals, FoodRecent, MealType } from '@/types'
import { useUIStore } from './uiStore'
import { RECENT_FOODS_DAYS } from '@/utils/constants'
import { todayLocal } from '@/utils/localDate'

interface FoodState {
  foods: Food[]
  recentFoods: FoodRecent[]
  foodLogs: FoodLog[]
  dailyTotals: DailyTotals | null
  macroGoals: MacroGoals | null
  diaryDate: string | null
  logsDate: string | null
  totalsDate: string | null
  logsLoading: boolean
  totalsLoading: boolean
  logsError: string | null
  totalsError: string | null
  isLoading: boolean
  error: string | null
  fetchFoods: (params?: FoodSearch) => Promise<void>
  fetchRecentFoods: (days?: number) => Promise<void>
  fetchFoodLogs: (date?: string) => Promise<void>
  fetchDailyTotals: (date?: string) => Promise<void>
  fetchMacroGoals: () => Promise<void>
  createFood: (data: FoodCreate) => Promise<Food>
  copyMeal: (
    from: { date: string; mealType: MealType },
    to: { date: string; mealType: MealType; label: string }
  ) => Promise<number>
  logFood: (data: FoodLogCreate) => Promise<FoodLog | void>
  updateFoodLog: (id: string, data: Partial<FoodLogCreate>) => Promise<void>
  getFoodLogById: (id: string) => Promise<FoodLog | null>
  uploadFoodLogPhoto: (id: string, file: File) => Promise<string>
  deleteFoodLogPhoto: (id: string) => Promise<void>
  uploadedPhotoUrl: string | null
  deleteFood: (id: string) => Promise<void>
  deleteFoodLog: (id: string) => Promise<void>
  setMacroGoals: (goals: MacroGoals) => Promise<void>
  clearError: () => void
}

const initialFetch = () => {
  const store = useFoodStore.getState()
  store.fetchDailyTotals()
}

let logsRequest = 0
let totalsRequest = 0
let foodsRequest = 0

export const useFoodStore = create<FoodState>(withPendingRequests<FoodState>((set, get) => ({
  foods: [],
  recentFoods: [],
  foodLogs: [],
  dailyTotals: null,
  macroGoals: null,
  isLoading: false,
  error: null,
  uploadedPhotoUrl: null,
  diaryDate: null, logsDate: null, totalsDate: null,
  logsLoading: false, totalsLoading: false, logsError: null, totalsError: null,

  fetchFoods: async (params?: FoodSearch) => {
    const request = ++foodsRequest
    set({ error: null, ...(params ? { foods: [] } : {}) })
    try {
      const foods = await foodApi.getFoods(params)
      if (request === foodsRequest) set({ foods })
    } catch (error: any) {
      if (request !== foodsRequest) return
      set({
        error: error.response?.data?.message || 'Failed to fetch foods',
      })
    }
  },

  fetchRecentFoods: async (days?: number) => {
    set({ error: null })
    try {
      const daysParam = days ?? RECENT_FOODS_DAYS
      const recentFoods = await foodApi.getRecentFoods(daysParam)
      set({ recentFoods })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch recent foods',
      })
    }
  },

  fetchFoodLogs: async (date?: string) => {
    const selected = date || get().diaryDate || todayLocal()
    const request = ++logsRequest
    set({ diaryDate: selected, logsLoading: true, logsError: null })
    try {
      const foodLogs = await foodApi.getFoodLogs({ date: selected })
      if (request === logsRequest && get().diaryDate === selected) set({ foodLogs, logsDate: selected })
    } catch (error: any) {
      if (request === logsRequest && get().diaryDate === selected) set({ logsError: error.response?.data?.error || 'Failed to load diary foods.' })
    } finally {
      if (request === logsRequest) set({ logsLoading: false })
    }
  },

  fetchDailyTotals: async (date?: string) => {
    const selected = date || get().diaryDate || todayLocal()
    const request = ++totalsRequest
    set({ diaryDate: selected, totalsLoading: true, totalsError: null })
    try {
      const dailyTotals = await foodApi.getDailyTotals(selected)
      if (request === totalsRequest && get().diaryDate === selected) set({ dailyTotals, totalsDate: selected })
    } catch (error: any) {
      if (request === totalsRequest && get().diaryDate === selected) set({ totalsError: error.response?.data?.error || 'Failed to load diary totals.' })
    } finally {
      if (request === totalsRequest) set({ totalsLoading: false })
    }
  },

  fetchMacroGoals: async () => {
    set({ error: null })
    try {
      const macroGoals = await foodApi.getMacroGoals()
      set({ macroGoals })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch macro goals',
      })
    }
  },

  createFood: async (data: FoodCreate) => {
    set({ error: null })
    try {
      const created = await foodApi.createFood(data)
      await get().fetchFoods()
      useUIStore.getState().showToast('Food added successfully', 'success')
      return created
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to add food',
      })
      useUIStore.getState().showToast(error.response?.data?.message || 'Failed to add food', 'error')
      throw error
    }
  },

  copyMeal: async (from, to) => {
    set({ error: null })
    try {
      const result = await foodApi.copyMeal({
        from_date: from.date,
        from_meal_type: from.mealType,
        to_date: to.date,
        to_meal_type: to.mealType,
      })
      await get().fetchFoodLogs()
      await get().fetchDailyTotals()
      useUIStore.getState().showToast(
        `Copied ${result.copied} item${result.copied === 1 ? '' : 's'} to ${to.label}`,
        'success'
      )
      return result.copied as number
    } catch (error: any) {
      const message =
        error.response?.data?.error || error.response?.data?.message || 'Failed to copy meal'
      set({ error: message })
      useUIStore.getState().showToast(message, 'error')
      throw error
    }
  },

  logFood: async (data: FoodLogCreate) => {
    set({ error: null })
    try {
      const today = todayLocal()
      const logDate = data.date || today

      if (data.food_id) {
        const food = get().foods.find(f => String(f.id) === data.food_id)
        if (food) {
          const quantity = data.quantity || 1
          const totalCalories = Math.round(food.calories * quantity)
          const totalProtein = food.protein_g * quantity
          const totalCarbs = food.carbs_g * quantity
          const totalFat = food.fat_g * quantity
          const result = await foodApi.logFood({
            ...data,
            food_id: data.food_id,
            food_name: food.name,
            calories: totalCalories,
            protein_g: totalProtein,
            carbs_g: totalCarbs,
            fat_g: totalFat,
            date: logDate,
            meal_type: data.meal_type,
            number_of_servings: data.number_of_servings,
            serving_size: data.serving_size,
            brand: data.brand,
            barcode_id: data.barcode_id,
            photo_url: data.photo_url,
          })
          await get().fetchFoodLogs()
          await get().fetchDailyTotals()
          useUIStore.getState().showToast('Food logged successfully', 'success')
              return result
        } else {
          const result = await foodApi.logFood({
            ...data,
            food_id: data.food_id,
            food_name: data.food_name!,
            calories: data.calories!,
            protein_g: data.protein_g,
            carbs_g: data.carbs_g,
            fat_g: data.fat_g,
            date: logDate,
            meal_type: data.meal_type,
            number_of_servings: data.number_of_servings,
            serving_size: data.serving_size,
            brand: data.brand,
            barcode_id: data.barcode_id,
            photo_url: data.photo_url,
          })
          await get().fetchFoodLogs()
          await get().fetchDailyTotals()
          useUIStore.getState().showToast('Food logged successfully', 'success')
              return result
        }
      } else {
        const result = await foodApi.logFood({
          ...data,
          food_id: data.food_id,
          food_name: data.food_name!,
          calories: data.calories!,
          protein_g: data.protein_g,
          carbs_g: data.carbs_g,
          fat_g: data.fat_g,
          date: logDate,
          meal_type: data.meal_type,
          number_of_servings: data.number_of_servings,
          serving_size: data.serving_size,
          brand: data.brand,
          barcode_id: data.barcode_id,
          photo_url: data.photo_url,
        })
        await get().fetchFoodLogs()
        await get().fetchDailyTotals()
        useUIStore.getState().showToast('Food logged successfully', 'success')
          return result
      }
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Failed to log food'
      set({ error: message })
      useUIStore.getState().showToast(message, 'error')
      throw error
    }
  },

  updateFoodLog: async (id: string, data: Partial<FoodLogCreate>) => {
    set({ error: null })
    try {
      const updated = await foodApi.updateFoodLog(id, data)
      set(state => ({
        foodLogs: state.foodLogs.map(log =>
          String(log.id) === String(id) ? { ...log, ...updated } : log
        ),
      }))
      // The date can change on edit, which moves the entry between diary days
      await get().fetchFoodLogs()
      await get().fetchDailyTotals()
      useUIStore.getState().showToast('Food log updated', 'success')
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update food log',
      })
      useUIStore.getState().showToast(error.response?.data?.message || 'Failed to update food log', 'error')
    }
  },

  getFoodLogById: async (id: string) => {
    set({ error: null })
    try {
      const log = await foodApi.getFoodLog(id)
      return log
    } catch (error: any) {
      const message = error.response?.data?.error
        || error.response?.data?.message
        || 'Failed to load food log'
      set({ error: message })
      useUIStore.getState().showToast(message, 'error')
      return null
    }
  },

  uploadFoodLogPhoto: async (id: string, file: File) => {
    try {
      const { photo_url } = await foodApi.uploadFoodLogPhoto(id, file)
      set(state => ({
        uploadedPhotoUrl: photo_url,
        foodLogs: state.foodLogs.map(log =>
          String(log.id) === String(id) ? { ...log, photo_url } : log
        ),
      }))
      useUIStore.getState().showToast('Photo uploaded', 'success')
      return photo_url
    } catch (error: any) {
      const message = error.response?.data?.error
        || error.response?.data?.message
        || 'Failed to upload photo'
      set({ error: message })
      useUIStore.getState().showToast(message, 'error')
      // Rethrow, like weightStore.uploadPhoto: swallowing the failure let the caller
      // carry on and navigate away as if the photo had been saved (FF-0075).
      throw error
    }
  },

  deleteFoodLogPhoto: async (id: string) => {
    try {
      await foodApi.deleteFoodLogPhoto(id)
      set(state => ({
        uploadedPhotoUrl: null,
        foodLogs: state.foodLogs.map(log =>
          String(log.id) === String(id) ? { ...log, photo_url: null } : log
        ),
      }))
      useUIStore.getState().showToast('Photo removed', 'success')
    } catch (error: any) {
      const message = error.response?.data?.error
        || error.response?.data?.message
        || 'Failed to delete photo'
      set({ error: message })
      useUIStore.getState().showToast(message, 'error')
    }
  },

  deleteFood: async (id: string) => {
    set({ error: null })
    try {
      const result = await foodApi.deleteFood(id)
      const foods = get().foods.filter(food => String(food.id) !== String(id))
      set({ foods })

      // Deleting a food never deletes diary entries (FF-0065): they are snapshots
      // and keep their own values, so say so rather than leaving it to be noticed.
      const kept = result?.logs_kept ?? 0
      const suffix = kept === 0
        ? ''
        : kept === 1
          ? ' — 1 diary entry kept its own values'
          : ` — ${kept} diary entries kept their own values`
      useUIStore.getState().showToast(`Food deleted${suffix}`, 'success')
    } catch (error: any) {
      // The API answers {'error': ...}; reading only .message left this blank.
      const message = error.response?.data?.error || error.response?.data?.message || 'Failed to delete food'
      set({ error: message })
      useUIStore.getState().showToast(message, 'error')
      throw error
    }
  },

  deleteFoodLog: async (id: string) => {
    set({ error: null })
    try {
      await foodApi.deleteFoodLog(id)
      const foodLogs = get().foodLogs.filter(log => log.id !== id)
      set({ foodLogs })
      await get().fetchDailyTotals()
      useUIStore.getState().showToast('Food log deleted', 'success')
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete food log',
      })
      useUIStore.getState().showToast(error.response?.data?.message || 'Failed to delete food log', 'error')
      throw error
    }
  },

  setMacroGoals: async (goals: MacroGoals) => {
    set({ error: null })
    try {
      await foodApi.setMacroGoals(goals)
      await get().fetchMacroGoals()
      useUIStore.getState().showToast('Macro goals updated successfully', 'success')
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update macro goals',
      })
      useUIStore.getState().showToast(error.response?.data?.message || 'Failed to update macro goals', 'error')
    }
  },

  clearError: () => set({ error: null }),
}), ['fetchFoods', 'fetchRecentFoods', 'fetchFoodLogs', 'fetchDailyTotals', 'fetchMacroGoals', 'createFood', 'copyMeal', 'logFood', 'updateFoodLog', 'getFoodLogById', 'uploadFoodLogPhoto', 'deleteFoodLogPhoto', 'deleteFood', 'deleteFoodLog', 'setMacroGoals']))

initialFetch()

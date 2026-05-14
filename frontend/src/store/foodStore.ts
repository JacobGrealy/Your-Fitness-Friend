import { create } from 'zustand'
import { foodApi } from '@/api/food'
import type { Food, FoodLog, DailyTotals, FoodCreate, FoodLogCreate, FoodSearch, MacroGoals, FoodRecent } from '@/types'
import { useUIStore } from './uiStore'
import { RECENT_FOODS_DAYS } from '@/utils/constants'

interface FoodState {
  foods: Food[]
  recentFoods: FoodRecent[]
  foodLogs: FoodLog[]
  dailyTotals: DailyTotals | null
  macroGoals: MacroGoals | null
  isLoading: boolean
  error: string | null
  fetchFoods: (params?: FoodSearch) => Promise<void>
  fetchRecentFoods: (days?: number) => Promise<void>
  fetchFoodLogs: (date?: string) => Promise<void>
  fetchDailyTotals: (date?: string) => Promise<void>
  fetchMacroGoals: () => Promise<void>
  createFood: (data: FoodCreate) => Promise<Food>
  logFood: (data: FoodLogCreate) => Promise<void>
  updateFoodLog: (id: string, data: Partial<FoodLogCreate>) => Promise<void>
  deleteFood: (id: string) => Promise<void>
  deleteFoodLog: (id: string) => Promise<void>
  setMacroGoals: (goals: MacroGoals) => Promise<void>
  clearError: () => void
}

const initialFetch = () => {
  const store = useFoodStore.getState()
  store.fetchDailyTotals()
}

export const useFoodStore = create<FoodState>((set, get) => ({
  foods: [],
  recentFoods: [],
  foodLogs: [],
  dailyTotals: null,
  macroGoals: null,
  isLoading: false,
  error: null,

  fetchFoods: async (params?: FoodSearch) => {
    set({ isLoading: true, error: null })
    try {
      const foods = await foodApi.getFoods(params)
      set({ foods, isLoading: false })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch foods',
        isLoading: false,
      })
    }
  },

  fetchRecentFoods: async (days?: number) => {
    set({ isLoading: true, error: null })
    try {
      const daysParam = days ?? RECENT_FOODS_DAYS
      const recentFoods = await foodApi.getRecentFoods(daysParam)
      set({ recentFoods, isLoading: false })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch recent foods',
        isLoading: false,
      })
    }
  },

  fetchFoodLogs: async (date?: string) => {
    set({ isLoading: true, error: null })
    try {
      const foodLogs = await foodApi.getFoodLogs({ date })
      set({ foodLogs, isLoading: false })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch food logs',
        isLoading: false,
      })
    }
  },

  fetchDailyTotals: async (date?: string) => {
    set({ isLoading: true, error: null })
    try {
      const dailyTotals = await foodApi.getDailyTotals(date)
      set({ dailyTotals, isLoading: false })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch daily totals',
        isLoading: false,
      })
    }
  },

  fetchMacroGoals: async () => {
    set({ isLoading: true, error: null })
    try {
      const macroGoals = await foodApi.getMacroGoals()
      set({ macroGoals, isLoading: false })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch macro goals',
        isLoading: false,
      })
    }
  },

  createFood: async (data: FoodCreate) => {
    set({ isLoading: true, error: null })
    try {
      const created = await foodApi.createFood(data)
      get().fetchFoods()
      useUIStore.getState().showToast('Food added successfully', 'success')
      set({ isLoading: false })
      return created
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to add food',
        isLoading: false,
      })
      useUIStore.getState().showToast(error.response?.data?.message || 'Failed to add food', 'error')
      throw error
    }
  },

  logFood: async (data: FoodLogCreate) => {
    set({ isLoading: true, error: null })
    try {
      const today = new Date().toISOString().split('T')[0]

      if (data.food_id) {
        const food = get().foods.find(f => String(f.id) === data.food_id)
        if (food) {
          const quantity = data.quantity || 1
          const totalCalories = Math.round(food.calories * quantity)
          const totalProtein = food.protein_g * quantity
          const totalCarbs = food.carbs_g * quantity
          const totalFat = food.fat_g * quantity
          await foodApi.logFood({
            food_id: data.food_id,
            food_name: food.name,
            calories: totalCalories,
            protein_g: totalProtein,
            carbs_g: totalCarbs,
            fat_g: totalFat,
            date: today,
            meal_type: data.meal_type,
            serving_size: data.serving_size,
            brand: data.brand,
            barcode_id: data.barcode_id,
          })
        } else {
          await foodApi.logFood({
            food_id: data.food_id,
            food_name: data.food_name!,
            calories: data.calories!,
            protein_g: data.protein_g,
            carbs_g: data.carbs_g,
            fat_g: data.fat_g,
            date: today,
            meal_type: data.meal_type,
            serving_size: data.serving_size,
            brand: data.brand,
            barcode_id: data.barcode_id,
          })
        }
      } else {
        await foodApi.logFood({
          food_id: data.food_id,
          food_name: data.food_name!,
          calories: data.calories!,
          protein_g: data.protein_g,
          carbs_g: data.carbs_g,
          fat_g: data.fat_g,
          date: today,
          meal_type: data.meal_type,
          serving_size: data.serving_size,
          brand: data.brand,
          barcode_id: data.barcode_id,
        })
      }
      get().fetchFoodLogs()
      get().fetchDailyTotals()
      useUIStore.getState().showToast('Food logged successfully', 'success')
      set({ isLoading: false })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to log food',
        isLoading: false,
      })
      useUIStore.getState().showToast(error.response?.data?.message || 'Failed to log food', 'error')
    }
  },

  updateFoodLog: async (id: string, data: Partial<FoodLogCreate>) => {
    set({ isLoading: true, error: null })
    try {
      const updated = await foodApi.updateFoodLog(id, data)
      set(state => ({
        foodLogs: state.foodLogs.map(log =>
          String(log.id) === String(id) ? { ...log, ...updated } : log
        ),
        isLoading: false,
      }))
      useUIStore.getState().showToast('Food log updated', 'success')
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update food log',
        isLoading: false,
      })
      useUIStore.getState().showToast(error.response?.data?.message || 'Failed to update food log', 'error')
    }
  },

  deleteFood: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await foodApi.deleteFood(id)
      const foods = get().foods.filter(food => food.id !== id)
      set({ foods, isLoading: false })
      useUIStore.getState().showToast('Food deleted', 'success')
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete food',
        isLoading: false,
      })
      useUIStore.getState().showToast(error.response?.data?.message || 'Failed to delete food', 'error')
    }
  },

  deleteFoodLog: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await foodApi.deleteFoodLog(id)
      const foodLogs = get().foodLogs.filter(log => log.id !== id)
      set({ foodLogs, isLoading: false })
      get().fetchDailyTotals()
      useUIStore.getState().showToast('Food log deleted', 'success')
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete food log',
        isLoading: false,
      })
      useUIStore.getState().showToast(error.response?.data?.message || 'Failed to delete food log', 'error')
    }
  },

  setMacroGoals: async (goals: MacroGoals) => {
    set({ isLoading: true, error: null })
    try {
      await foodApi.setMacroGoals(goals)
      get().fetchMacroGoals()
      useUIStore.getState().showToast('Macro goals updated successfully', 'success')
      set({ isLoading: false })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update macro goals',
        isLoading: false,
      })
      useUIStore.getState().showToast(error.response?.data?.message || 'Failed to update macro goals', 'error')
    }
  },

  clearError: () => set({ error: null }),
}))

initialFetch()

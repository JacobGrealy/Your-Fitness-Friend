import { api } from './client'
import type { Food, FoodLog, DailyTotals, FoodCreate, FoodLogCreate, FoodSearch, MacroGoals, FoodRecent } from '@/types'

export const foodApi = {
  // Food entries
  getFoods: (params?: FoodSearch) =>
    api.get<Food[]>('/food', { params }).then(res => res.data),
  getFood: (id: string) =>
    api.get<Food>(`/food/${id}`).then(res => res.data),
  createFood: (data: FoodCreate) =>
    api.post<Food>('/food', data).then(res => res.data),
  deleteFood: (id: string) =>
    api.delete<{ message: string; id: number; logs_kept: number }>(`/food/${id}`).then(res => res.data),

  // Barcode lookup: local foods first, OpenFoodFacts second (server side).
  // 404 = unknown product, 503 = lookup service unreachable, 400 = bad code.
  lookupBarcode: (code: string) =>
    api
      .get<{ food: Food; source: 'local' | 'openfoodfacts'; barcode: string }>(
        `/food/barcode/${encodeURIComponent(code)}`
      )
      .then(res => res.data),

  // Food logs
  getFoodLogs: (params?: { date?: string }) =>
    api.get<any>('/food/log', { params }).then(res => res.data.logs || []),
  getFoodLog: (id: string) =>
    api.get<FoodLog>(`/food/log/${id}`).then(res => res.data),
  logFood: (data: FoodLogCreate) =>
    api.post<FoodLog>('/food/log', data).then(res => res.data),
  updateFoodLog: (id: string, data: Partial<FoodLogCreate>) =>
    api.put<FoodLog>(`/food/log/${id}`, data).then(res => res.data),
  deleteFoodLog: (id: string) =>
    api.delete(`/food/log/${id}`).then(res => res.data),
  uploadFoodLogPhoto: (id: string, file: File) => {
    const formData = new FormData()
    formData.append('photo', file)
    return api.post<{ id: number; photo_url: string }>(
      `/food/log/${id}/photo`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ).then(res => res.data)
  },
  deleteFoodLogPhoto: (id: string) =>
    api.delete(`/food/log/${id}/photo`).then(res => res.data),

  // Daily totals
  getDailyTotals: (date?: string) =>
    api.get<DailyTotals>('/food/daily', { params: { date } }).then(res => res.data),

  // Macro goals
  getMacroGoals: () =>
    api.get<MacroGoals>('/food/macro-goals').then(res => res.data),
  setMacroGoals: (goals: MacroGoals) =>
    api.put<MacroGoals>('/food/macro-goals', goals).then(res => res.data),

  // Recent foods
  getRecentFoods: (days?: number) =>
    api.get<FoodRecent[]>('/food/recent', { params: { days } }).then(res => res.data),
}

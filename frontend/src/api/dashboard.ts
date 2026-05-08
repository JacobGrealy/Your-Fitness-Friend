import { api } from './client'
import type { DailySummary, WeeklySummary } from '@/types'

export const dashboardApi = {
  getDailySummary: (date?: string) =>
    api.get<DailySummary>('/dashboard/daily', { params: { date } }).then(res => res.data),
  getWeightTrend: (days?: number) =>
    api.get('/dashboard/weight-trend', { params: { days } }).then(res => res.data),
  getWeeklySummary: (weekStart?: string) =>
    api.get<WeeklySummary>('/dashboard/weekly', { params: { weekStart } }).then(res => res.data),
}

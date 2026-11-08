import { create } from 'zustand'
import { withPendingRequests } from './pendingRequests'
import { dashboardApi } from '@/api/dashboard'
import type { DailySummary } from '@/types'
import { useUIStore } from './uiStore'

interface DashboardState {
  dailySummary: DailySummary | null
  weightTrend: { date: string; weight_lbs: number }[] | null
  isLoading: boolean
  error: string | null
  fetchDailySummary: () => Promise<void>
  fetchWeightTrend: (days?: number) => Promise<void>
  clearError: () => void
}

export const useDashboardStore = create<DashboardState>(withPendingRequests<DashboardState>((set) => ({
  dailySummary: null,
  weightTrend: null,
  isLoading: false,
  error: null,

  fetchDailySummary: async () => {
    set({ error: null })
    try {
      const summary = await dashboardApi.getDailySummary()
      set({ dailySummary: summary })
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch daily summary'
      set({ error: message })
      useUIStore.getState().showToast(message, 'error')
    }
  },

  fetchWeightTrend: async (days = 7) => {
    set({ error: null })
    try {
      const trend = await dashboardApi.getWeightTrend(days)
      set({ weightTrend: trend })
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch weight trend'
      set({ error: message })
    }
  },

  clearError: () => set({ error: null }),
}), ['fetchDailySummary', 'fetchWeightTrend']))

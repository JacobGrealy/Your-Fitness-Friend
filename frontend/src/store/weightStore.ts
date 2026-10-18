import { create } from 'zustand'
import { weightApi } from '@/api/weight'
import type { WeightLog, WeightStatistics, WeightTrend, WeightLogCreate, WeightFilter } from '@/types'
import { useUIStore } from './uiStore'
import { todayLocal } from '@/utils/localDate'

interface WeightState {
  logs: WeightLog[]
  statistics: WeightStatistics | null
  trend: WeightTrend | null
  isLoading: boolean
  error: string | null
  uploadedPhotoUrl: string | null
  duplicateEntry: WeightLog | null
  fetchLogs: (filters?: WeightFilter) => Promise<void>
  fetchLog: (id: string) => Promise<WeightLog | null>
  updateLog: (id: string, data: WeightLogCreate) => Promise<void>
  fetchStatistics: () => Promise<void>
  fetchTrend: () => Promise<void>
  logWeight: (data: WeightLogCreate) => Promise<void>
  deleteLog: (id: string) => Promise<void>
  uploadPhoto: (file: File) => Promise<string>
  clearError: () => void
  checkDuplicate: (date: string) => Promise<WeightLog | null>
  clearDuplicate: () => void
  replaceEntry: (oldLogId: string, newEntry: WeightLogCreate) => Promise<void>
}

const initialFetch = () => {
  const store = useWeightStore.getState()
  store.fetchLogs()
  store.fetchStatistics()
}

export const useWeightStore = create<WeightState>((set, get) => ({
  logs: [],
  statistics: null,
  trend: null,
  isLoading: false,
  error: null,
  uploadedPhotoUrl: null,
  duplicateEntry: null,

  fetchLogs: async (filters?: WeightFilter) => {
    set({ isLoading: true, error: null })
    try {
      const logs = await weightApi.getLogs(filters)
      set({ logs, isLoading: false })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch weight logs',
        isLoading: false,
      })
    }
  },

  fetchLog: async (id: string) => {
    try {
      const log = await weightApi.getLog(id)
      return log
    } catch {
      return null
    }
  },

  fetchStatistics: async () => {
    set({ isLoading: true, error: null })
    try {
      const statistics = await weightApi.getStatistics()
      set({ statistics, isLoading: false })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch weight statistics',
        isLoading: false,
      })
    }
  },

  fetchTrend: async () => {
    set({ isLoading: true, error: null })
    try {
      const trend = await weightApi.getTrend()
      set({ trend, isLoading: false })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch weight trend',
        isLoading: false,
      })
    }
  },

  logWeight: async (data: WeightLogCreate) => {
    set({ isLoading: true, error: null })
    try {
      const dateStr = data.date || todayLocal()
      const duplicate = await get().checkDuplicate(dateStr)

      if (duplicate) {
        set({ isLoading: false })
        return
      }

      const payload = { weight: data.weight, date: data.date, notes: data.notes, photo_url: data.photo_url }
      await weightApi.logWeight(payload)
      get().fetchLogs()
      get().fetchStatistics()
      set({ uploadedPhotoUrl: null, duplicateEntry: null })
      useUIStore.getState().showToast('Weight logged successfully', 'success')
      set({ isLoading: false })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to log weight',
        isLoading: false,
      })
      useUIStore.getState().showToast(error.response?.data?.message || 'Failed to log weight', 'error')
    }
  },
  uploadPhoto: async (file: File) => {
    set({ isLoading: true, error: null })
    try {
      const formData = new FormData()
      formData.append('photo', file)
      const result = await weightApi.uploadPhoto(formData)
      set({ uploadedPhotoUrl: result.photo_url, isLoading: false })
      return result.photo_url
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to upload photo',
        isLoading: false,
      })
      useUIStore.getState().showToast(error.response?.data?.message || 'Failed to upload photo', 'error')
      throw error
    }
  },

  deleteLog: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await weightApi.deleteLog(id)
      const logs = get().logs.filter(log => log.id !== id)
      set({ logs, isLoading: false })
      useUIStore.getState().showToast('Weight log deleted', 'success')
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete weight log',
        isLoading: false,
      })
      useUIStore.getState().showToast(error.response?.data?.message || 'Failed to delete weight log', 'error')
    }
  },

  updateLog: async (id: string, data: WeightLogCreate) => {
    set({ isLoading: true, error: null })
    try {
      // The key is built conditionally on purpose: the backend treats `'photo_url' in
      // data` as "change the photo", so an untouched photo must not send the key at all.
      // Relying on axios to drop `undefined` would work today and break silently if the
      // client ever changes (FF-0073).
      const payload: Record<string, unknown> = {
        weight: data.weight,
        date: data.date,
        notes: data.notes,
      }
      if (data.photo_url !== undefined) {
        payload.photo_url = data.photo_url
      }
      await weightApi.updateLog(id, payload as Omit<WeightLogCreate, 'photo'>)
      get().fetchLogs()
      get().fetchStatistics()
      set({ isLoading: false })
      useUIStore.getState().showToast('Weight log updated', 'success')
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update weight log',
        isLoading: false,
      })
      useUIStore.getState().showToast(error.response?.data?.message || 'Failed to update weight log', 'error')
    }
  },

  clearError: () => set({ error: null }),

  checkDuplicate: async (date: string) => {
    if (!date) {
      set({ duplicateEntry: null })
      return null
    }
    const logs = await weightApi.getLogsByDate(date)
    const duplicate = logs.length > 0 ? logs[0] : null
    set({ duplicateEntry: duplicate })
    return duplicate
  },

  clearDuplicate: () => {
    set({ duplicateEntry: null })
  },

  replaceEntry: async (oldLogId: string, newEntry: WeightLogCreate) => {
    set({ isLoading: true, error: null })
    try {
      await weightApi.deleteLog(oldLogId)
      const payload = { weight: newEntry.weight, date: newEntry.date, notes: newEntry.notes, photo_url: newEntry.photo_url }
      await weightApi.logWeight(payload)
      get().fetchLogs()
      get().fetchStatistics()
      set({ uploadedPhotoUrl: null, duplicateEntry: null, isLoading: false })
      useUIStore.getState().showToast('Weight entry replaced successfully', 'success')
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to replace weight entry',
        isLoading: false,
      })
      useUIStore.getState().showToast(error.response?.data?.message || 'Failed to replace weight entry', 'error')
    }
  },
}))

initialFetch()

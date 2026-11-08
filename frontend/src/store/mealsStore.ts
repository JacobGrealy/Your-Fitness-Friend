import { create } from 'zustand'
import { withPendingRequests } from './pendingRequests'
import { mealsApi } from '@/api/meals'
import type { MealPhoto } from '@/types'
import { useUIStore } from './uiStore'

interface MealsState {
  photos: MealPhoto[]
  isLoading: boolean
  error: string | null
  fetchPhotos: (date?: string) => Promise<void>
  uploadPhoto: (formData: FormData) => Promise<void>
  deletePhoto: (id: string) => Promise<void>
  clearError: () => void
}

const initialFetch = () => {
  const store = useMealsStore.getState()
  store.fetchPhotos()
}

export const useMealsStore = create<MealsState>(withPendingRequests<MealsState>((set, get) => ({
  photos: [],
  isLoading: false,
  error: null,

  fetchPhotos: async (date?: string) => {
    set({ error: null })
    try {
      const photos = await mealsApi.getPhotos({ date })
      set({ photos })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch meal photos',
      })
    }
  },

  uploadPhoto: async (formData: FormData) => {
    set({ error: null })
    try {
      await mealsApi.uploadPhoto(formData)
      await get().fetchPhotos()
      useUIStore.getState().showToast('Photo uploaded successfully', 'success')
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to upload photo',
      })
      useUIStore.getState().showToast(error.response?.data?.message || 'Failed to upload photo', 'error')
    }
  },

  deletePhoto: async (id: string) => {
    set({ error: null })
    try {
      await mealsApi.deletePhoto(id)
      const photos = get().photos.filter(photo => photo.id !== id)
      set({ photos })
      useUIStore.getState().showToast('Photo deleted', 'success')
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete photo',
      })
      useUIStore.getState().showToast(error.response?.data?.message || 'Failed to delete photo', 'error')
      throw error
    }
  },

  clearError: () => set({ error: null }),
}), ['fetchPhotos', 'uploadPhoto', 'deletePhoto']))

initialFetch()

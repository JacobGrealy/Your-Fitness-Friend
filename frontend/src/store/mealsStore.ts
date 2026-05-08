import { create } from 'zustand'
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

export const useMealsStore = create<MealsState>((set, get) => ({
  photos: [],
  isLoading: false,
  error: null,

  fetchPhotos: async (date?: string) => {
    set({ isLoading: true, error: null })
    try {
      const photos = await mealsApi.getPhotos({ date })
      set({ photos, isLoading: false })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch meal photos',
        isLoading: false,
      })
    }
  },

  uploadPhoto: async (formData: FormData) => {
    set({ isLoading: true, error: null })
    try {
      await mealsApi.uploadPhoto(formData)
      get().fetchPhotos()
      useUIStore.getState().showToast('Photo uploaded successfully', 'success')
      set({ isLoading: false })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to upload photo',
        isLoading: false,
      })
      useUIStore.getState().showToast(error.response?.data?.message || 'Failed to upload photo', 'error')
    }
  },

  deletePhoto: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await mealsApi.deletePhoto(id)
      const photos = get().photos.filter(photo => photo.id !== id)
      set({ photos, isLoading: false })
      useUIStore.getState().showToast('Photo deleted', 'success')
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete photo',
        isLoading: false,
      })
      useUIStore.getState().showToast(error.response?.data?.message || 'Failed to delete photo', 'error')
    }
  },

  clearError: () => set({ error: null }),
}))

initialFetch()

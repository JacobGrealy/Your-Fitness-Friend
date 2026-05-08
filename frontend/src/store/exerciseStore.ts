import { create } from 'zustand'
import { exerciseApi } from '@/api/exercise'
import type { SavedExercise, ExerciseLog, ExerciseLogCreate, SavedExerciseCreate, ExerciseFilter } from '@/types'
import { useUIStore } from './uiStore'

interface ExerciseState {
  savedExercises: SavedExercise[]
  exerciseLogs: ExerciseLog[]
  isLoading: boolean
  error: string | null
  fetchSavedExercises: () => Promise<void>
  fetchExerciseLogs: (filters?: ExerciseFilter) => Promise<void>
  saveExercise: (data: SavedExerciseCreate) => Promise<void>
  logExercise: (data: ExerciseLogCreate) => Promise<void>
  deleteSavedExercise: (id: string) => Promise<void>
  deleteExerciseLog: (id: string) => Promise<void>
  clearError: () => void
}

const initialFetch = () => {
  const store = useExerciseStore.getState()
  store.fetchSavedExercises()
}

export const useExerciseStore = create<ExerciseState>((set, get) => ({
  savedExercises: [],
  exerciseLogs: [],
  isLoading: false,
  error: null,

  fetchSavedExercises: async () => {
    set({ isLoading: true, error: null })
    try {
      const savedExercises = await exerciseApi.getSavedExercises()
      set({ savedExercises, isLoading: false })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch saved exercises',
        isLoading: false,
      })
    }
  },

  fetchExerciseLogs: async (filters?: ExerciseFilter) => {
    set({ isLoading: true, error: null })
    try {
      const exerciseLogs = await exerciseApi.getExerciseLogs(filters)
      set({ exerciseLogs, isLoading: false })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch exercise logs',
        isLoading: false,
      })
    }
  },

  saveExercise: async (data: SavedExerciseCreate) => {
    set({ isLoading: true, error: null })
    try {
      await exerciseApi.saveExercise(data)
      get().fetchSavedExercises()
      useUIStore.getState().showToast('Exercise saved successfully', 'success')
      set({ isLoading: false })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to save exercise',
        isLoading: false,
      })
      useUIStore.getState().showToast(error.response?.data?.message || 'Failed to save exercise', 'error')
    }
  },

  logExercise: async (data: ExerciseLogCreate) => {
    set({ isLoading: true, error: null })
    try {
      await exerciseApi.logExercise(data)
      get().fetchExerciseLogs()
      useUIStore.getState().showToast('Exercise logged successfully', 'success')
      set({ isLoading: false })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to log exercise',
        isLoading: false,
      })
      useUIStore.getState().showToast(error.response?.data?.message || 'Failed to log exercise', 'error')
    }
  },

  deleteSavedExercise: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await exerciseApi.deleteSavedExercise(id)
      const savedExercises = get().savedExercises.filter(ex => ex.id !== id)
      set({ savedExercises, isLoading: false })
      useUIStore.getState().showToast('Exercise deleted', 'success')
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete exercise',
        isLoading: false,
      })
      useUIStore.getState().showToast(error.response?.data?.message || 'Failed to delete exercise', 'error')
    }
  },

  deleteExerciseLog: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await exerciseApi.deleteExerciseLog(id)
      const exerciseLogs = get().exerciseLogs.filter(log => log.id !== id)
      set({ exerciseLogs, isLoading: false })
      useUIStore.getState().showToast('Exercise log deleted', 'success')
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete exercise log',
        isLoading: false,
      })
      useUIStore.getState().showToast(error.response?.data?.message || 'Failed to delete exercise log', 'error')
    }
  },

  clearError: () => set({ error: null }),
}))

initialFetch()

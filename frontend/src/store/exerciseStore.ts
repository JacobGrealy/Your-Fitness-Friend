import { create } from 'zustand'
import { exerciseApi } from '@/api/exercise'
import type { SavedExercise, ExerciseLog, ExerciseLogCreate, SavedExerciseCreate, ExerciseFilter } from '@/types'
import { useUIStore } from './uiStore'
import { useAuthStore } from './authStore'

interface ExerciseState {
  savedExercises: SavedExercise[]
  exerciseLogs: ExerciseLog[]
  isLoading: boolean
  error: string | null
  fetchSavedExercises: () => Promise<void>
  fetchExerciseLogs: (filters?: ExerciseFilter) => Promise<void>
  saveExercise: (data: SavedExerciseCreate) => Promise<boolean>
  logExercise: (data: ExerciseLogCreate) => Promise<boolean>
  deleteSavedExercise: (id: string) => Promise<boolean>
  deleteExerciseLog: (id: string) => Promise<boolean>
  clearError: () => void
}

const empty = { savedExercises: [], exerciseLogs: [], isLoading: false, error: null }
const account = () => {
  const auth = useAuthStore.getState()
  return auth.isAuthenticated && auth.user ? String(auth.user.id) : null
}
let generation = 0
let pending = 0
const message = (error: any, fallback: string): string =>
  error?.response?.data?.error || error?.response?.data?.message || fallback

// Account transitions invalidate in-flight reads/writes, including A -> B -> A.
useAuthStore.subscribe((state, previous) => {
  const key = (s: typeof state) => s.isAuthenticated && s.user ? String(s.user.id) : null
  if (key(state) !== key(previous)) {
    generation++
    pending = 0
    useExerciseStore.setState(empty)
  }
})

async function run(action: () => Promise<void>, fallback: string): Promise<boolean> {
  if (!account()) return false
  const token = generation
  pending++
  useExerciseStore.setState({ isLoading: true, error: null })
  try {
    await action()
    return token === generation
  } catch (error) {
    if (token === generation) useExerciseStore.setState({ error: message(error, fallback) })
    return false
  } finally {
    if (token === generation) {
      pending--
      useExerciseStore.setState({ isLoading: pending > 0 })
    }
  }
}

export const useExerciseStore = create<ExerciseState>((set, get) => ({
  ...empty,
  fetchSavedExercises: async () => {
    const token = generation
    await run(async () => {
      const savedExercises = await exerciseApi.getSavedExercises()
      if (token === generation) set({ savedExercises })
    }, 'Failed to fetch saved exercises')
  },
  fetchExerciseLogs: async (filters?: ExerciseFilter) => {
    const token = generation
    await run(async () => {
      const exerciseLogs = await exerciseApi.getExerciseLogs(filters)
      if (token === generation) set({ exerciseLogs })
    }, 'Failed to fetch exercise logs')
  },
  saveExercise: async (data) => {
    const token = generation
    const success = await run(async () => { await exerciseApi.saveExercise(data) }, 'Failed to save exercise')
    if (success) {
      useUIStore.getState().showToast('Exercise saved successfully', 'success')
      await get().fetchSavedExercises()
    }
    return success && token === generation
  },
  logExercise: async (data) => {
    const token = generation
    const success = await run(async () => { await exerciseApi.logExercise(data) }, 'Failed to log exercise')
    if (success) {
      useUIStore.getState().showToast('Exercise logged successfully', 'success')
      await get().fetchExerciseLogs()
    }
    return success && token === generation
  },
  deleteSavedExercise: async (id) => {
    const token = generation
    return run(async () => {
      await exerciseApi.deleteSavedExercise(id)
      if (token === generation) set({ savedExercises: get().savedExercises.filter(ex => String(ex.id) !== String(id)) })
    }, 'Failed to delete exercise')
  },
  deleteExerciseLog: async (id) => {
    const token = generation
    return run(async () => {
      await exerciseApi.deleteExerciseLog(id)
      if (token === generation) set({ exerciseLogs: get().exerciseLogs.filter(log => String(log.id) !== String(id)) })
    }, 'Failed to delete exercise log')
  },
  clearError: () => set({ error: null }),
}))

import { api } from './client'
import type { SavedExercise, ExerciseLog, ExerciseLogCreate, SavedExerciseCreate, ExerciseFilter } from '@/types'

export const exerciseApi = {
  // Saved exercises
  getSavedExercises: () =>
    api.get<SavedExercise[]>('/exercise/saved').then(res => res.data),
  saveExercise: (data: SavedExerciseCreate) =>
    api.post<SavedExercise>('/exercise/save', data).then(res => res.data),
  deleteSavedExercise: (id: string) =>
    api.delete(`/exercise/saved/${id}`).then(res => res.data),

  // Exercise logs
  getExerciseLogs: (filters?: ExerciseFilter) =>
    api.get<any[]>('/exercise/logs', { params: filters }).then(res =>
      res.data.map((log: any) => ({
        ...log,
        id: String(log.id),
        duration: log.duration_min,
      }))
    ),
  logExercise: (data: ExerciseLogCreate) =>
    api.post<ExerciseLog>('/exercise/log', data).then(res => res.data),
  deleteExerciseLog: (id: string) =>
    api.delete(`/exercise/log/${id}`).then(res => res.data),
}

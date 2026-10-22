import { api } from './client'
import type { SavedExercise, ExerciseLog, ExerciseLogCreate, SavedExerciseCreate, ExerciseFilter, ExerciseActivity, TreadmillSessionCreate, ExerciseEstimate, StrengthSessionCreate, StrengthEstimate, StrengthLibraryItem } from '@/types'

const normalizeLog = (log: any): ExerciseLog => ({ ...log, id: String(log.id), duration: log.duration_min })

export const exerciseApi = {
  getStrengthLibrary: () => api.get<StrengthLibraryItem[]>('/exercise/strength-library').then(res => res.data),
  getLatest: (activityId: string) => api.get('/exercise/latest', { params: { activity_id: activityId } }).then(res => res.data ? normalizeLog(res.data) : null),
  estimateStrength: (data: StrengthSessionCreate, id?: string) =>
    api.post<StrengthEstimate>('/exercise/estimate', id ? { ...data, log_id: id } : data).then(res => res.data),
  getCatalog: () => api.get<ExerciseActivity[]>('/exercise/catalog').then(res => res.data),
  getExerciseLog: (id: string) => api.get(`/exercise/log/${id}`).then(res => normalizeLog(res.data)),
  estimateSession: (data: TreadmillSessionCreate, id?: string) =>
    api.post<ExerciseEstimate>('/exercise/estimate', id ? { ...data, log_id: id } : data).then(res => res.data),
  saveSession: (data: TreadmillSessionCreate | StrengthSessionCreate, id?: string, photo?: File, removePhoto = false) => {
    const payload = removePhoto ? { ...data, remove_photo: true } : data
    let body: TreadmillSessionCreate | StrengthSessionCreate | FormData = payload
    if (photo) {
      body = new FormData()
      body.append('data', JSON.stringify(payload))
      body.append('photo', photo)
    }
    const config = photo ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined
    return (id ? api.put(`/exercise/log/${id}`, body, config) : api.post('/exercise/log', body, config))
      .then(res => normalizeLog(res.data))
  },
  // Saved exercises
  getSavedExercises: () =>
    api.get<SavedExercise[]>('/exercise/saved').then(res => res.data.map(ex => ({ ...ex, id: String(ex.id) }))),
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
    api.delete(`/exercise/${id}`).then(res => res.data),
}

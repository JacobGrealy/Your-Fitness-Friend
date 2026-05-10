import { api } from './client'
import type { WeightLog, WeightStatistics, WeightTrend, WeightLogCreate, WeightFilter } from '@/types'

export const weightApi = {
  getLogs: (filters?: WeightFilter) =>
    api.get<any[]>('/weight/logs', { params: filters }).then(res =>
      res.data.map((log: any) => ({
        id: String(log.id),
        user_id: '',
        weight: log.weight_lbs,
        recorded_at: log.recorded_at,
        notes: log.notes,
        photo_url: log.photo_url,
      }))
    ),
  getLog: (id: string) =>
    api.get(`/weight/logs/${id}`).then(res => {
      const log = res.data
      return {
        id: String(log.id),
        user_id: '',
        weight: log.weight_lbs,
        recorded_at: log.recorded_at,
        notes: log.notes,
        photo_url: log.photo_url,
      }
    }),
  getLogsByDate: (date: string) =>
    api.get<any[]>('/weight/logs', { params: { start_date: date, end_date: date } }).then(res =>
      res.data.map((log: any) => ({
        id: String(log.id),
        user_id: '',
        weight: log.weight_lbs,
        recorded_at: log.recorded_at,
        notes: log.notes,
        photo_url: log.photo_url,
      }))
    ),
  logWeight: (data: Omit<WeightLogCreate, 'photo'>) =>
    api.post<WeightLog>('/weight/logs', {
      weight_lbs: data.weight,
      date: data.date,
      notes: data.notes,
      photo_url: data.photo_url,
    }).then(res => res.data),
  deleteLog: (id: string) =>
    api.delete(`/weight/logs/${id}`).then(res => res.data),
  updateLog: (id: string, data: Omit<WeightLogCreate, 'photo'>) =>
    api.put<WeightLog>(`/weight/logs/${id}`, {
      weight_lbs: data.weight,
      date: data.date,
      notes: data.notes,
      photo_url: data.photo_url,
    }).then(res => res.data),
  getStatistics: () =>
    api.get<WeightStatistics>('/weight/statistics').then(res => res.data),
  getTrend: () =>
    api.get<WeightTrend>('/weight/trend').then(res => res.data),
  uploadPhoto: (formData: FormData) =>
    api.post<{ photo_url: string }>('/weight/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data),
}

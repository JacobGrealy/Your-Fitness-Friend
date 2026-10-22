import { api } from './client'
export type HealthKind = 'medication' | 'bowel'
export interface HealthEntry { id: number; kind: HealthKind; logged_at: string; date: string; dose_mg: number | null; notes: string; medication: string | null }
export interface HealthPayload { kind: HealthKind; logged_at: string; dose_mg?: number; notes: string }
export interface HealthOptions { medication: string; dose_options_mg: number[]; default_dose_mg: number }
export const healthApi = {
  options: () => api.get<HealthOptions>('/health/options').then(r => r.data),
  list: (date: string) => api.get<HealthEntry[]>('/health/logs', { params: { date } }).then(r => r.data),
  get: (id: string) => api.get<HealthEntry>(`/health/logs/${id}`).then(r => r.data),
  save: (data: HealthPayload, id?: string) => (id ? api.put<HealthEntry>(`/health/logs/${id}`, data) : api.post<HealthEntry>('/health/logs', data)).then(r => r.data),
  remove: (id: number) => api.delete(`/health/logs/${id}`),
}
export const healthError = (e: any) => e?.response?.data?.error || 'Unable to reach health logging. Please try again.'

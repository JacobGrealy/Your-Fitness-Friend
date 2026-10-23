import { api } from './client'
export interface HydrationPayload { amount_oz: number; logged_at: string; notes: string }
export interface HydrationEntry extends HydrationPayload { id: number; date: string }
export interface HydrationDay { date: string; total_oz: number; logs: HydrationEntry[] }
export const hydrationApi = {
  options: () => api.get<{ default_amount_oz: number; unit: string }>('/hydration/options').then(res => res.data),
  list: (date: string) => api.get<HydrationDay>('/hydration/logs', { params: { date } }).then(res => res.data),
  get: (id: string) => api.get<HydrationEntry>(`/hydration/logs/${id}`).then(res => res.data),
  save: (data: HydrationPayload, id?: string) => (id ? api.put<HydrationEntry>(`/hydration/logs/${id}`, data) : api.post<HydrationEntry>('/hydration/logs', data)).then(res => res.data),
  remove: (id: number) => api.delete(`/hydration/logs/${id}`).then(res => res.data),
}
export const hydrationError = (error: any): string => typeof error?.response?.data?.error === 'string' ? error.response.data.error : 'Unable to save or load hydration. Please try again.'

import { api } from './client'
import type { MealPhoto, MealAnalysis } from '@/types'

export const mealsApi = {
  getPhotos: (params?: { date?: string }) =>
    api.get<any>('/meals/photos', { params }).then(res => res.data.photos || []),
  getPhoto: (id: string) =>
    api.get<MealPhoto>(`/meals/photos/${id}`).then(res => res.data),
  uploadPhoto: (formData: FormData) =>
    api.post<MealPhoto>('/meals/photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data),
  deletePhoto: (id: string) =>
    api.delete(`/meals/photos/${id}`).then(res => res.data),
  analyzePhoto: (formData: FormData) =>
    api.post<MealAnalysis>('/meals/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data),
}

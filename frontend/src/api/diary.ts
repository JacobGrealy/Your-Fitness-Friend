import { api } from './client'

export type DiaryCompletionStatus = 'ok' | 'under_eating' | 'too_low' | 'empty'

export interface DiaryCompletionSummary {
  date: string
  completed: boolean
  completed_at?: string | null
  totals: {
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
    log_count?: number
  }
  goal_calories?: number | null
  maintenance_calories?: number | null
  status: DiaryCompletionStatus
  projection: {
    days: number
    change_lbs: number | null
    projected_weight_lbs: number | null
    start_weight_lbs: number | null
  }
  streak?: number
  message: string
}

export interface DiaryCompletionState {
  date: string
  completed: boolean
  completed_at?: string | null
  totals?: DiaryCompletionSummary['totals']
}

/**
 * End-of-day completion (FF-0054). Mirrors MyFitnessPal's "Complete This Entry":
 * the server returns the day's totals plus a five-week projection, and withholds
 * the projection when it would be misleading.
 */
export const diaryApi = {
  complete: (date: string) =>
    api.post<DiaryCompletionSummary>('/food/diary/complete', { date }).then((res) => res.data),

  getCompletion: (date: string) =>
    api.get<DiaryCompletionState>('/food/diary/completion', { params: { date } }).then((res) => res.data),

  undo: (date: string) =>
    api.delete<{ completed: boolean; removed: boolean }>('/food/diary/complete', { params: { date } })
      .then((res) => res.data),
}

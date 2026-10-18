import { api } from './client'

export type DiaryCompletionStatus = 'ok' | 'under_eating' | 'too_low' | 'empty'

export interface DiaryStreaks {
  /** Consecutive days closed, counting back from the latest closed day. */
  closed_days: number
  /** Consecutive closed days whose intake was above zero and at most 10% over goal. */
  within_goal_days: number
  closed_today: boolean
  within_goal_today: boolean
  tolerance_pct: number
}

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
  streaks: DiaryStreaks
  /** Alias of streaks.closed_days, kept for older payloads. */
  streak?: number
  message: string
}

/**
 * What the diary needs on load: either the whole closed-day summary (so the
 * projection panel renders without re-posting) or just the live streaks.
 */
export type DiaryCompletionState =
  | ({ date: string; completed: false; streaks: DiaryStreaks })
  | (DiaryCompletionSummary & { completed: true })

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
    api.delete<{ completed: boolean; removed: boolean; streaks?: DiaryStreaks }>(
      '/food/diary/complete',
      { params: { date } }
    ).then((res) => res.data),
}

import { api } from './client'
export type CopyKind = 'exercise' | 'medication' | 'bowel'
export interface CopyResult {
  created_count: number
  destination_date: string
  warnings: string[]
  replayed: boolean
}
export interface CopyRequest {
  source_date: string
  destination_date: string
  log_ids: number[]
  confirmed: true
  request_id: string
}
export function copyDiary(kind: CopyKind, data: CopyRequest): Promise<CopyResult> {
  return api.post<CopyResult>(kind === 'exercise' ? '/exercise/copy' : '/health/copy', { ...data, kind }).then(response => response.data)
}

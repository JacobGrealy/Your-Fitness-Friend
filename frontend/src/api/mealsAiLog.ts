import { api } from './client'
import type { AiLogResponse, FoodPhotoMessage } from '@/types/foodPhotoLog'

export const mealsAiLogApi = {
  /**
   * Initial photo upload with AI analysis.
   */
  analyzePhoto: (formData: FormData) =>
    api.post<AiLogResponse>('/meals/ai-log', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data),

  /**
   * Follow-up AI conversation to update macros.
   */
  sendMessage: (conversationHistory: FoodPhotoMessage[], userMessage: string) =>
    api.post<AiLogResponse>('/meals/ai-log', {
      conversation_history: conversationHistory,
      user_message: userMessage,
    }).then(res => res.data),
}

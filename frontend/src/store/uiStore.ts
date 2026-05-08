import { create } from 'zustand'
import React from 'react'

interface UIState {
  isLoading: boolean
  isModalOpen: boolean
  modalContent: React.ReactNode | null
  toast: { message: string; type: 'success' | 'error' | 'info' } | null
  startLoading: () => void
  stopLoading: () => void
  openModal: (content: React.ReactNode) => void
  closeModal: () => void
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
  hideToast: () => void
}

export const useUIStore = create<UIState>((set) => ({
  isLoading: false,
  isModalOpen: false,
  modalContent: null,
  toast: null,

  startLoading: () => set({ isLoading: true }),

  stopLoading: () => set({ isLoading: false }),

  openModal: (content: React.ReactNode) => set({ isModalOpen: true, modalContent: content }),

  closeModal: () => set({ isModalOpen: false, modalContent: null }),

  showToast: (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    set({ toast: { message, type } })
    setTimeout(() => {
      set({ toast: null })
    }, 3000)
  },

  hideToast: () => set({ toast: null }),
}))

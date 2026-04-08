import { create } from 'zustand'

export interface BatchImageDecryptState {
  isBatchDecrypting: boolean
  progress: { current: number; total: number }
  showToast: boolean
  showResultToast: boolean
  result: { success: number; fail: number }
  startTime: number
  sessionName: string

  startDecrypt: (total: number, sessionName: string) => void
  updateProgress: (current: number, total: number) => void
  finishDecrypt: (success: number, fail: number) => void
  setShowToast: (show: boolean) => void
  setShowResultToast: (show: boolean) => void
  reset: () => void
}

export const useBatchImageDecryptStore = create<BatchImageDecryptState>((set) => ({
  isBatchDecrypting: false,
  progress: { current: 0, total: 0 },
  showToast: false,
  showResultToast: false,
  result: { success: 0, fail: 0 },
  startTime: 0,
  sessionName: '',

  startDecrypt: (total, sessionName) => set({
    isBatchDecrypting: true,
    progress: { current: 0, total },
    showToast: true,
    showResultToast: false,
    result: { success: 0, fail: 0 },
    startTime: Date.now(),
    sessionName
  }),

  updateProgress: (current, total) => set({
    progress: { current, total }
  }),

  finishDecrypt: (success, fail) => set({
    isBatchDecrypting: false,
    showToast: false,
    showResultToast: true,
    result: { success, fail },
    startTime: 0
  }),

  setShowToast: (show) => set({ showToast: show }),
  setShowResultToast: (show) => set({ showResultToast: show }),

  reset: () => set({
    isBatchDecrypting: false,
    progress: { current: 0, total: 0 },
    showToast: false,
    showResultToast: false,
    result: { success: 0, fail: 0 },
    startTime: 0,
    sessionName: ''
  })
}))


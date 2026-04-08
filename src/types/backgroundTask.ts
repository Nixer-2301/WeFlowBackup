export type BackgroundTaskSourcePage =
  | 'export'
  | 'chat'
  | 'analytics'
  | 'sns'
  | 'groupAnalytics'
  | 'annualReport'
  | 'other'

export type BackgroundTaskStatus =
  | 'running'
  | 'cancel_requested'
  | 'completed'
  | 'failed'
  | 'canceled'

export interface BackgroundTaskRecord {
  id: string
  sourcePage: BackgroundTaskSourcePage
  title: string
  detail?: string
  progressText?: string
  cancelable: boolean
  cancelRequested: boolean
  status: BackgroundTaskStatus
  startedAt: number
  updatedAt: number
  finishedAt?: number
}

export interface BackgroundTaskInput {
  sourcePage: BackgroundTaskSourcePage
  title: string
  detail?: string
  progressText?: string
  cancelable?: boolean
  onCancel?: () => void | Promise<void>
}

export interface BackgroundTaskUpdate {
  title?: string
  detail?: string
  progressText?: string
  status?: BackgroundTaskStatus
  cancelable?: boolean
}

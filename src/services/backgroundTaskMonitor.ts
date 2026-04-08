import type {
  BackgroundTaskInput,
  BackgroundTaskRecord,
  BackgroundTaskStatus,
  BackgroundTaskUpdate
} from '../types/backgroundTask'

type BackgroundTaskListener = (tasks: BackgroundTaskRecord[]) => void

const tasks = new Map<string, BackgroundTaskRecord>()
const cancelHandlers = new Map<string, () => void | Promise<void>>()
const listeners = new Set<BackgroundTaskListener>()
let taskSequence = 0

const ACTIVE_STATUSES = new Set<BackgroundTaskStatus>(['running', 'cancel_requested'])
const MAX_SETTLED_TASKS = 24

const buildTaskId = (): string => {
  taskSequence += 1
  return `bg-task-${Date.now()}-${taskSequence}`
}

const notifyListeners = () => {
  const snapshot = getBackgroundTaskSnapshot()
  for (const listener of listeners) {
    listener(snapshot)
  }
}

const pruneSettledTasks = () => {
  const settledTasks = [...tasks.values()]
    .filter(task => !ACTIVE_STATUSES.has(task.status))
    .sort((a, b) => (b.finishedAt || b.updatedAt) - (a.finishedAt || a.updatedAt))

  for (const staleTask of settledTasks.slice(MAX_SETTLED_TASKS)) {
    tasks.delete(staleTask.id)
  }
}

export const getBackgroundTaskSnapshot = (): BackgroundTaskRecord[] => (
  [...tasks.values()].sort((a, b) => {
    const aActive = ACTIVE_STATUSES.has(a.status) ? 1 : 0
    const bActive = ACTIVE_STATUSES.has(b.status) ? 1 : 0
    if (aActive !== bActive) return bActive - aActive
    return b.updatedAt - a.updatedAt
  })
)

export const subscribeBackgroundTasks = (listener: BackgroundTaskListener): (() => void) => {
  listeners.add(listener)
  listener(getBackgroundTaskSnapshot())
  return () => {
    listeners.delete(listener)
  }
}

export const registerBackgroundTask = (input: BackgroundTaskInput): string => {
  const now = Date.now()
  const taskId = buildTaskId()
  tasks.set(taskId, {
    id: taskId,
    sourcePage: input.sourcePage,
    title: input.title,
    detail: input.detail,
    progressText: input.progressText,
    cancelable: input.cancelable !== false,
    cancelRequested: false,
    status: 'running',
    startedAt: now,
    updatedAt: now
  })
  if (input.onCancel) {
    cancelHandlers.set(taskId, input.onCancel)
  }
  pruneSettledTasks()
  notifyListeners()
  return taskId
}

export const updateBackgroundTask = (taskId: string, patch: BackgroundTaskUpdate): void => {
  const existing = tasks.get(taskId)
  if (!existing) return
  const nextStatus = patch.status || existing.status
  const nextUpdatedAt = Date.now()
  tasks.set(taskId, {
    ...existing,
    ...patch,
    status: nextStatus,
    updatedAt: nextUpdatedAt,
    finishedAt: ACTIVE_STATUSES.has(nextStatus) ? undefined : (existing.finishedAt || nextUpdatedAt)
  })
  pruneSettledTasks()
  notifyListeners()
}

export const finishBackgroundTask = (
  taskId: string,
  status: Extract<BackgroundTaskStatus, 'completed' | 'failed' | 'canceled'>,
  patch?: Omit<BackgroundTaskUpdate, 'status'>
): void => {
  const existing = tasks.get(taskId)
  if (!existing) return
  const now = Date.now()
  tasks.set(taskId, {
    ...existing,
    ...patch,
    status,
    updatedAt: now,
    finishedAt: now,
    cancelRequested: status === 'canceled' ? true : existing.cancelRequested
  })
  cancelHandlers.delete(taskId)
  pruneSettledTasks()
  notifyListeners()
}

export const requestCancelBackgroundTask = (taskId: string): boolean => {
  const existing = tasks.get(taskId)
  if (!existing || !existing.cancelable || !ACTIVE_STATUSES.has(existing.status)) return false
  tasks.set(taskId, {
    ...existing,
    status: 'cancel_requested',
    cancelRequested: true,
    detail: existing.detail || '停止请求已发出，当前查询完成后会结束后续加载',
    updatedAt: Date.now()
  })
  const cancelHandler = cancelHandlers.get(taskId)
  if (cancelHandler) {
    void Promise.resolve(cancelHandler()).catch(() => {})
  }
  notifyListeners()
  return true
}

export const requestCancelBackgroundTasks = (predicate: (task: BackgroundTaskRecord) => boolean): number => {
  let canceledCount = 0
  for (const task of tasks.values()) {
    if (!predicate(task)) continue
    if (requestCancelBackgroundTask(task.id)) {
      canceledCount += 1
    }
  }
  return canceledCount
}

export const isBackgroundTaskCancelRequested = (taskId: string): boolean => {
  const task = tasks.get(taskId)
  return Boolean(task?.cancelRequested)
}

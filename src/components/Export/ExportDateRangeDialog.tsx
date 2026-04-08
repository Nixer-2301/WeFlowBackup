import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import {
  EXPORT_DATE_RANGE_PRESETS,
  WEEKDAY_SHORT_LABELS,
  addMonths,
  buildCalendarCells,
  cloneExportDateRangeSelection,
  createDateRangeByPreset,
  createDefaultDateRange,
  formatCalendarMonthTitle,
  formatDateInputValue,
  isSameDay,
  parseDateInputValue,
  startOfDay,
  endOfDay,
  toMonthStart,
  type ExportDateRangePreset,
  type ExportDateRangeSelection
} from '../../utils/exportDateRange'
import './ExportDateRangeDialog.scss'

interface ExportDateRangeDialogProps {
  open: boolean
  value: ExportDateRangeSelection
  title?: string
  minDate?: Date | null
  maxDate?: Date | null
  onClose: () => void
  onConfirm: (value: ExportDateRangeSelection) => void
}

type ActiveBoundary = 'start' | 'end'

interface ExportDateRangeDialogDraft extends ExportDateRangeSelection {
  panelMonth: Date
}

const resolveBounds = (minDate?: Date | null, maxDate?: Date | null): { minDate: Date; maxDate: Date } | null => {
  if (!(minDate instanceof Date) || Number.isNaN(minDate.getTime())) return null
  if (!(maxDate instanceof Date) || Number.isNaN(maxDate.getTime())) return null
  const normalizedMin = startOfDay(minDate)
  const normalizedMax = endOfDay(maxDate)
  if (normalizedMin.getTime() > normalizedMax.getTime()) return null
  return {
    minDate: normalizedMin,
    maxDate: normalizedMax
  }
}

const clampSelectionToBounds = (
  value: ExportDateRangeSelection,
  minDate?: Date | null,
  maxDate?: Date | null
): ExportDateRangeSelection => {
  const bounds = resolveBounds(minDate, maxDate)
  if (!bounds) return cloneExportDateRangeSelection(value)

  const rawStart = value.useAllTime ? bounds.minDate : startOfDay(value.dateRange.start)
  const rawEnd = value.useAllTime ? bounds.maxDate : endOfDay(value.dateRange.end)
  const nextStart = new Date(Math.min(Math.max(rawStart.getTime(), bounds.minDate.getTime()), bounds.maxDate.getTime()))
  const nextEndCandidate = new Date(Math.min(Math.max(rawEnd.getTime(), bounds.minDate.getTime()), bounds.maxDate.getTime()))
  const nextEnd = nextEndCandidate.getTime() < nextStart.getTime() ? endOfDay(nextStart) : nextEndCandidate
  const changed = nextStart.getTime() !== rawStart.getTime() || nextEnd.getTime() !== rawEnd.getTime()

  return {
    preset: value.useAllTime ? value.preset : (changed ? 'custom' : value.preset),
    useAllTime: value.useAllTime,
    dateRange: {
      start: nextStart,
      end: nextEnd
    }
  }
}

const buildDialogDraft = (
  value: ExportDateRangeSelection,
  minDate?: Date | null,
  maxDate?: Date | null
): ExportDateRangeDialogDraft => {
  const nextValue = clampSelectionToBounds(value, minDate, maxDate)
  return {
    ...nextValue,
    panelMonth: toMonthStart(nextValue.dateRange.start)
  }
}

export function ExportDateRangeDialog({
  open,
  value,
  title = '时间范围设置',
  minDate,
  maxDate,
  onClose,
  onConfirm
}: ExportDateRangeDialogProps) {
  const [draft, setDraft] = useState<ExportDateRangeDialogDraft>(() => buildDialogDraft(value, minDate, maxDate))
  const [activeBoundary, setActiveBoundary] = useState<ActiveBoundary>('start')
  const [dateInput, setDateInput] = useState({
    start: formatDateInputValue(value.dateRange.start),
    end: formatDateInputValue(value.dateRange.end)
  })
  const [dateInputError, setDateInputError] = useState({ start: false, end: false })

  useEffect(() => {
    if (!open) return
    const nextDraft = buildDialogDraft(value, minDate, maxDate)
    setDraft(nextDraft)
    setActiveBoundary('start')
    setDateInput({
      start: formatDateInputValue(nextDraft.dateRange.start),
      end: formatDateInputValue(nextDraft.dateRange.end)
    })
    setDateInputError({ start: false, end: false })
  }, [maxDate, minDate, open, value])

  useEffect(() => {
    if (!open) return
    setDateInput({
      start: formatDateInputValue(draft.dateRange.start),
      end: formatDateInputValue(draft.dateRange.end)
    })
    setDateInputError({ start: false, end: false })
  }, [draft.dateRange.end.getTime(), draft.dateRange.start.getTime(), open])

  const bounds = useMemo(() => resolveBounds(minDate, maxDate), [maxDate, minDate])
  const clampStartDate = useCallback((targetDate: Date) => {
    const start = startOfDay(targetDate)
    if (!bounds) return start
    if (start.getTime() < bounds.minDate.getTime()) return bounds.minDate
    if (start.getTime() > bounds.maxDate.getTime()) return startOfDay(bounds.maxDate)
    return start
  }, [bounds])
  const clampEndDate = useCallback((targetDate: Date) => {
    const end = endOfDay(targetDate)
    if (!bounds) return end
    if (end.getTime() < bounds.minDate.getTime()) return endOfDay(bounds.minDate)
    if (end.getTime() > bounds.maxDate.getTime()) return bounds.maxDate
    return end
  }, [bounds])

  const setRangeStart = useCallback((targetDate: Date) => {
    const start = clampStartDate(targetDate)
    setDraft(prev => {
      const nextEnd = prev.dateRange.end < start ? endOfDay(start) : prev.dateRange.end
      return {
        ...prev,
        preset: 'custom',
        useAllTime: false,
        dateRange: {
          start,
          end: nextEnd
        },
        panelMonth: toMonthStart(start)
      }
    })
  }, [clampStartDate])

  const setRangeEnd = useCallback((targetDate: Date) => {
    const end = clampEndDate(targetDate)
    setDraft(prev => {
      const nextStart = prev.useAllTime ? clampStartDate(targetDate) : prev.dateRange.start
      const nextEnd = end < nextStart ? endOfDay(nextStart) : end
      return {
        ...prev,
        preset: 'custom',
        useAllTime: false,
        dateRange: {
          start: nextStart,
          end: nextEnd
        },
        panelMonth: toMonthStart(targetDate)
      }
    })
  }, [clampEndDate, clampStartDate])

  const applyPreset = useCallback((preset: Exclude<ExportDateRangePreset, 'custom'>) => {
    if (preset === 'all') {
      const previewRange = bounds
        ? { start: bounds.minDate, end: bounds.maxDate }
        : createDefaultDateRange()
      setDraft(prev => ({
        ...prev,
        preset,
        useAllTime: true,
        dateRange: previewRange,
        panelMonth: toMonthStart(previewRange.start)
      }))
      setActiveBoundary('start')
      return
    }

    const range = clampSelectionToBounds({
      preset,
      useAllTime: false,
      dateRange: createDateRangeByPreset(preset)
    }, minDate, maxDate).dateRange
    setDraft(prev => ({
      ...prev,
      preset,
      useAllTime: false,
      dateRange: range,
      panelMonth: toMonthStart(range.start)
    }))
    setActiveBoundary('start')
  }, [bounds, maxDate, minDate])

  const commitStartFromInput = useCallback(() => {
    const parsed = parseDateInputValue(dateInput.start)
    if (!parsed) {
      setDateInputError(prev => ({ ...prev, start: true }))
      return
    }
    setDateInputError(prev => ({ ...prev, start: false }))
    setRangeStart(parsed)
  }, [dateInput.start, setRangeStart])

  const commitEndFromInput = useCallback(() => {
    const parsed = parseDateInputValue(dateInput.end)
    if (!parsed) {
      setDateInputError(prev => ({ ...prev, end: true }))
      return
    }
    setDateInputError(prev => ({ ...prev, end: false }))
    setRangeEnd(parsed)
  }, [dateInput.end, setRangeEnd])

  const shiftPanelMonth = useCallback((delta: number) => {
    setDraft(prev => ({
      ...prev,
      panelMonth: addMonths(prev.panelMonth, delta)
    }))
  }, [])

  const handleCalendarSelect = useCallback((targetDate: Date) => {
    if (activeBoundary === 'start') {
      setRangeStart(targetDate)
      setActiveBoundary('end')
      return
    }

    setDraft(prev => {
      const start = prev.useAllTime ? startOfDay(targetDate) : prev.dateRange.start
      const pickedStart = startOfDay(targetDate)
      const nextStart = pickedStart <= start ? pickedStart : start
      const nextEnd = pickedStart <= start ? endOfDay(start) : endOfDay(targetDate)
      return {
        ...prev,
        preset: 'custom',
        useAllTime: false,
        dateRange: {
          start: nextStart,
          end: nextEnd
        },
        panelMonth: toMonthStart(targetDate)
      }
    })
    setActiveBoundary('start')
  }, [activeBoundary, setRangeEnd, setRangeStart])

  const isRangeModeActive = !draft.useAllTime
  const modeText = isRangeModeActive
    ? '当前导出模式：按时间范围导出'
    : '当前导出模式：全部时间导出，选择下方日期会切换为自定义时间范围'

  const isPresetActive = useCallback((preset: ExportDateRangePreset): boolean => {
    if (preset === 'all') return draft.useAllTime
    return !draft.useAllTime && draft.preset === preset
  }, [draft])

  const calendarCells = useMemo(() => buildCalendarCells(draft.panelMonth), [draft.panelMonth])
  const minPanelMonth = bounds ? toMonthStart(bounds.minDate) : null
  const maxPanelMonth = bounds ? toMonthStart(bounds.maxDate) : null
  const canShiftPrev = !minPanelMonth || draft.panelMonth.getTime() > minPanelMonth.getTime()
  const canShiftNext = !maxPanelMonth || draft.panelMonth.getTime() < maxPanelMonth.getTime()

  const isStartSelected = useCallback((date: Date) => (
    !draft.useAllTime && isSameDay(date, draft.dateRange.start)
  ), [draft])

  const isEndSelected = useCallback((date: Date) => (
    !draft.useAllTime && isSameDay(date, draft.dateRange.end)
  ), [draft])

  const isDateInRange = useCallback((date: Date) => (
    !draft.useAllTime &&
    startOfDay(date).getTime() >= startOfDay(draft.dateRange.start).getTime() &&
    startOfDay(date).getTime() <= startOfDay(draft.dateRange.end).getTime()
  ), [draft])

  const isDateSelectable = useCallback((date: Date) => {
    if (!bounds) return true
    const target = startOfDay(date).getTime()
    return target >= startOfDay(bounds.minDate).getTime() && target <= startOfDay(bounds.maxDate).getTime()
  }, [bounds])

  const hintText = draft.useAllTime
    ? '选择开始或结束日期后，会自动切换为自定义时间范围'
    : (activeBoundary === 'start' ? '下一次点击将设置开始日期' : '下一次点击将设置结束日期')

  if (!open) return null

  return createPortal(
    <div className="export-date-range-dialog-overlay" onClick={onClose}>
      <div className="export-date-range-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="export-date-range-dialog-header">
          <h4>{title}</h4>
          <button
            type="button"
            className="export-date-range-dialog-close-btn"
            onClick={onClose}
            aria-label="关闭时间范围设置"
          >
            <X size={14} />
          </button>
        </div>

        <div className="export-date-range-preset-list">
          {EXPORT_DATE_RANGE_PRESETS.map((preset) => {
            const active = isPresetActive(preset.value)
            return (
              <button
                key={preset.value}
                type="button"
                className={`export-date-range-preset-item ${active ? 'active' : ''}`}
                onClick={() => applyPreset(preset.value)}
              >
                <span>{preset.label}</span>
                {active && <Check size={14} />}
              </button>
            )
          })}
        </div>

        <div className={`export-date-range-mode-banner ${isRangeModeActive ? 'range' : 'all'}`}>
          {modeText}
        </div>

        <div className="export-date-range-boundary-row">
          <div
            className={`export-date-range-boundary-card ${activeBoundary === 'start' ? 'active' : ''}`}
            onClick={() => setActiveBoundary('start')}
          >
            <span className="boundary-label">开始</span>
            <input
              type="text"
              className={`export-date-range-date-input ${dateInputError.start ? 'invalid' : ''}`}
              value={dateInput.start}
              placeholder="YYYY-MM-DD"
              onChange={(event) => {
                const nextValue = event.target.value
                setDateInput(prev => ({ ...prev, start: nextValue }))
                if (dateInputError.start) {
                  setDateInputError(prev => ({ ...prev, start: false }))
                }
              }}
              onFocus={() => setActiveBoundary('start')}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                commitStartFromInput()
              }}
              onBlur={commitStartFromInput}
            />
          </div>
          <div
            className={`export-date-range-boundary-card ${activeBoundary === 'end' ? 'active' : ''}`}
            onClick={() => setActiveBoundary('end')}
          >
            <span className="boundary-label">结束</span>
            <input
              type="text"
              className={`export-date-range-date-input ${dateInputError.end ? 'invalid' : ''}`}
              value={dateInput.end}
              placeholder="YYYY-MM-DD"
              onChange={(event) => {
                const nextValue = event.target.value
                setDateInput(prev => ({ ...prev, end: nextValue }))
                if (dateInputError.end) {
                  setDateInputError(prev => ({ ...prev, end: false }))
                }
              }}
              onFocus={() => setActiveBoundary('end')}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                commitEndFromInput()
              }}
              onBlur={commitEndFromInput}
            />
          </div>
        </div>

        <div className="export-date-range-selection-hint">{hintText}</div>

        <section className="export-date-range-calendar-panel single">
          <div className="export-date-range-calendar-panel-header">
            <div className="export-date-range-calendar-date-label">
              <span>选择日期范围</span>
              <strong>{formatCalendarMonthTitle(draft.panelMonth)}</strong>
            </div>
            <div className="export-date-range-calendar-nav">
              <button type="button" onClick={() => shiftPanelMonth(-1)} aria-label="上个月" disabled={!canShiftPrev}>
                <ChevronLeft size={14} />
              </button>
              <button type="button" onClick={() => shiftPanelMonth(1)} aria-label="下个月" disabled={!canShiftNext}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          <div className="export-date-range-calendar-weekdays">
            {WEEKDAY_SHORT_LABELS.map(label => (
              <span key={`weekday-${label}`}>{label}</span>
            ))}
          </div>
          <div className="export-date-range-calendar-days">
            {calendarCells.map((cell) => {
              const startSelected = isStartSelected(cell.date)
              const endSelected = isEndSelected(cell.date)
              const inRange = isDateInRange(cell.date)
              const selectable = isDateSelectable(cell.date)
              return (
                <button
                  key={cell.date.getTime()}
                  type="button"
                  disabled={!selectable}
                  className={[
                    'export-date-range-calendar-day',
                    cell.inCurrentMonth ? '' : 'outside',
                    selectable ? '' : 'disabled',
                    inRange ? 'in-range' : '',
                    startSelected ? 'range-start' : '',
                    endSelected ? 'range-end' : '',
                    activeBoundary === 'start' && startSelected ? 'active-boundary' : '',
                    activeBoundary === 'end' && endSelected ? 'active-boundary' : ''
                  ].filter(Boolean).join(' ')}
                  onClick={() => handleCalendarSelect(cell.date)}
                >
                  {cell.date.getDate()}
                </button>
              )
            })}
          </div>
        </section>

        <div className="export-date-range-dialog-actions">
          <button type="button" className="export-date-range-dialog-btn secondary" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="export-date-range-dialog-btn primary"
            onClick={() => onConfirm(cloneExportDateRangeSelection(draft))}
          >
            确认
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

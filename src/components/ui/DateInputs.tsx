// src/components/ui/DateInputs.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDaysIcon } from '@heroicons/react/24/outline'

/* ---------- Helper ---------- */

const MONTH_NAMES = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
]

const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function formatDisplayDate(value: string): string {
  const d = parseIsoDate(value)
  if (!d) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

/* ---------- Nur Datum ---------- */

export type DateInputWithCalendarProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  inputClassName?: string
  disabled?: boolean
  /** Optional: zusätzliche Klassen für den Wrapper um das Input */
  wrapperClassName?: string
}

type PopupPos = { left: number; top: number }

export function DateInputWithCalendar({
  value,
  onChange,
  placeholder = 'tt.mm.jjjj',
  inputClassName = '',
  disabled = false,
  wrapperClassName = '',
}: DateInputWithCalendarProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const popupRef = useRef<HTMLDivElement | null>(null)
  const [popupPos, setPopupPos] = useState<PopupPos | null>(null)
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null)

  const today = new Date()
  const todayIso = toIsoDate(today)

  const initialDate = parseIsoDate(value) ?? today
  const [currentMonth, setCurrentMonth] = useState<Date>(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1),
  )

  // Portal für den Kalender (immer ganz oben im DOM, unabhängig von Overflows)
  useEffect(() => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    setPortalEl(el)
    return () => {
      document.body.removeChild(el)
    }
  }, [])

  // Month sync mit value
  useEffect(() => {
    const parsed = parseIsoDate(value)
    if (parsed) {
      setCurrentMonth(
        new Date(parsed.getFullYear(), parsed.getMonth(), 1),
      )
    }
  }, [value])

  // Outside-Click & ESC schließen (inkl. Portal-Content)
  useEffect(() => {
    if (!open) return

    const handleClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      const inContainer =
        containerRef.current &&
        target &&
        containerRef.current.contains(target)
      const inPopup =
        popupRef.current && target && popupRef.current.contains(target)

      if (!inContainer && !inPopup) {
        setOpen(false)
      }
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClick, true)
    document.addEventListener('touchstart', handleClick, true)
    document.addEventListener('keydown', handleKey)

    return () => {
      document.removeEventListener('mousedown', handleClick, true)
      document.removeEventListener('touchstart', handleClick, true)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  // Popup-Position: immer innerhalb des Viewports halten
  useEffect(() => {
    if (!open || !containerRef.current) return

    const updatePosition = () => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const margin = 8 // Abstand zum Viewport-Rand
      const calendarWidth = 280 // feste Breite des Kalenders
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let left = rect.left

      // Rechts-Clamping
      if (left + calendarWidth > viewportWidth - margin) {
        left = viewportWidth - calendarWidth - margin
      }

      // Links-Clamping
      if (left < margin) {
        left = margin
      }

      // Standard: unterhalb des Inputs
      let top = rect.bottom + 6
      const approxCalendarHeight = 320

      // Wenn zu wenig Platz nach unten: oberhalb anzeigen
      if (top + approxCalendarHeight > viewportHeight - margin) {
        const alternativeTop = rect.top - approxCalendarHeight - 6
        if (alternativeTop >= margin) {
          top = alternativeTop
        } else {
          // Notbremse: im Viewport klemmen
          top = viewportHeight - approxCalendarHeight - margin
          if (top < margin) top = margin
        }
      }

      setPopupPos({ left, top })
    }

    updatePosition()

    // Auf alle Scrolls reagieren (auch in verschachtelten Scroll-Containern)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  const displayValue = value ? formatDisplayDate(value) : ''

  const buildCalendar = () => {
    const startOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
    )
    const startWeekday = (startOfMonth.getDay() + 6) % 7 // Montag = 0
    const startDate = new Date(startOfMonth)
    startDate.setDate(startOfMonth.getDate() - startWeekday)

    const weeks: Date[][] = []
    let cursor = new Date(startDate)

    for (let w = 0; w < 6; w++) {
      const week: Date[] = []
      for (let d = 0; d < 7; d++) {
        week.push(new Date(cursor))
        cursor.setDate(cursor.getDate() + 1)
      }
      weeks.push(week)
    }

    return weeks
  }

  const weeks = buildCalendar()
  const selected = parseIsoDate(value)

  const handleSelect = (day: Date) => {
    onChange(toIsoDate(day))
    setOpen(false)
  }

  const goPrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    )
  }

  const goNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    )
  }

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center ${wrapperClassName}`}
    >
      <div className="relative ml-2">
        <input
          type="text"
          readOnly
          disabled={disabled}
          value={displayValue}
          placeholder={placeholder}
          onClick={() => !disabled && setOpen(true)}
          className={[
            'w-[130px] sm:w-[140px] rounded-full border border-slate-200 bg-white px-3 py-1.5 pr-8 text-[11px] text-slate-600 shadow-sm outline-none placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-50',
            inputClassName,
          ].join(' ')}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          className="absolute right-1.5 top-1 flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
        >
          <CalendarDaysIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && !disabled && popupPos && portalEl &&
        createPortal(
          <div
            ref={popupRef}
            className="z-[9999] w-[280px] max-w-[92vw] rounded-2xl border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.18)]"
            style={{
              position: 'fixed',
              left: popupPos.left,
              top: popupPos.top,
              maxHeight: '80vh',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 pt-2 pb-1">
              <span className="text-xs font-medium text-slate-900">
                {MONTH_NAMES[currentMonth.getMonth()]}{' '}
                {currentMonth.getFullYear()}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={goPrevMonth}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={goNextMonth}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                >
                  ›
                </button>
              </div>
            </div>

            {/* Wochentage */}
            <div className="grid grid-cols-7 gap-1 px-3 pb-1 pt-1 text-[10px] text-slate-400">
              {WEEKDAYS_SHORT.map((w) => (
                <div key={w} className="flex items-center justify-center">
                  {w}
                </div>
              ))}
            </div>

            {/* Tage */}
            <div className="grid grid-cols-7 gap-1 px-3 pb-3 text-[11px]">
              {weeks.map((week, wi) =>
                week.map((day, di) => {
                  const inCurrentMonth =
                    day.getMonth() === currentMonth.getMonth()
                  const iso = toIsoDate(day)
                  const isSelected =
                    selected &&
                    day.getFullYear() === selected.getFullYear() &&
                    day.getMonth() === selected.getMonth() &&
                    day.getDate() === selected.getDate()
                  const isToday = iso === todayIso

                  return (
                    <button
                      key={`${wi}-${di}`}
                      type="button"
                      onClick={() => handleSelect(day)}
                      className={[
                        'flex h-7 w-7 items-center justify-center rounded-full transition',
                        inCurrentMonth
                          ? 'text-slate-700'
                          : 'text-slate-300',
                        isSelected
                          ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/50'
                          : isToday
                          ? 'ring-1 ring-slate-900/40 font-semibold'
                          : 'hover:bg-slate-100',
                      ].join(' ')}
                    >
                      {day.getDate()}
                    </button>
                  )
                }),
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
                className="rounded-full px-2 py-1 hover:bg-slate-100 hover:text-slate-700"
              >
                Löschen
              </button>
              <button
                type="button"
                onClick={() => {
                  const t = new Date()
                  const iso = toIsoDate(t)
                  onChange(iso)
                  setCurrentMonth(
                    new Date(t.getFullYear(), t.getMonth(), 1),
                  )
                  setOpen(false)
                }}
                className="rounded-full px-2 py-1 text-slate-700 hover:bg-slate-100"
              >
                Heute
              </button>
            </div>
          </div>,
          portalEl,
        )}
    </div>
  )
}

/* ---------- Datum + Zeit daneben ---------- */

export type DateTimeInputWithCalendarProps = {
  dateValue: string
  onDateChange: (value: string) => void
  timeValue: string
  onTimeChange: (value: string) => void
  disabled?: boolean
}

export function DateTimeInputWithCalendar({
  dateValue,
  onDateChange,
  timeValue,
  onTimeChange,
  disabled = false,
}: DateTimeInputWithCalendarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DateInputWithCalendar
        value={dateValue}
        onChange={onDateChange}
        disabled={disabled}
      />
      <input
        type="time"
        value={timeValue}
        disabled={disabled}
        onChange={(e) => onTimeChange(e.target.value)}
        className="h-[30px] rounded-full border border-slate-200 bg-white px-3 text-[11px] text-slate-600 shadow-sm outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-50"
      />
    </div>
  )
}

'use client'

import { useState } from 'react'
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
  /** zusätzliche Klassen für das Input-Element */
  inputClassName?: string
  /** optional disabled */
  disabled?: boolean
}

export function DateInputWithCalendar({
  value,
  onChange,
  placeholder = 'tt.mm.jjjj',
  inputClassName = '',
  disabled = false,
}: DateInputWithCalendarProps) {
  const [open, setOpen] = useState(false)

  const initialDate = parseIsoDate(value) ?? new Date()
  const [currentMonth, setCurrentMonth] = useState<Date>(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1),
  )

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
    <div className="relative inline-block">
      <div className="relative">
        <input
          type="text"
          readOnly
          disabled={disabled}
          value={displayValue}
          placeholder={placeholder}
          onClick={() => !disabled && setOpen((o) => !o)}
          className={[
            'w-[108px] rounded-full border border-slate-200 bg-white px-3 py-1 pr-7 text-[11px] text-slate-600 shadow-sm outline-none placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-50',
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

      {open && !disabled && (
        <div className="absolute right-0 z-40 mt-2 w-64 rounded-2xl border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.18)]">
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

          <div className="grid grid-cols-7 gap-1 px-3 pb-1 pt-1 text-[10px] text-slate-400">
            {WEEKDAYS_SHORT.map((w) => (
              <div key={w} className="flex items-center justify-center">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 px-3 pb-3 text-[11px]">
            {weeks.map((week, wi) =>
              week.map((day, di) => {
                const inCurrentMonth =
                  day.getMonth() === currentMonth.getMonth()
                const isSelected =
                  selected &&
                  day.getFullYear() === selected.getFullYear() &&
                  day.getMonth() === selected.getMonth() &&
                  day.getDate() === selected.getDate()

                return (
                  <button
                    key={`${wi}-${di}`}
                    type="button"
                    onClick={() => handleSelect(day)}
                    className={[
                      'flex h-7 w-7 items-center justify-center rounded-full transition',
                      inCurrentMonth ? 'text-slate-700' : 'text-slate-300',
                      isSelected
                        ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/50'
                        : 'hover:bg-slate-100',
                    ].join(' ')}
                  >
                    {day.getDate()}
                  </button>
                )
              }),
            )}
          </div>

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
                const today = new Date()
                onChange(toIsoDate(today))
                setCurrentMonth(
                  new Date(today.getFullYear(), today.getMonth(), 1),
                )
                setOpen(false)
              }}
              className="rounded-full px-2 py-1 text-slate-700 hover:bg-slate-100"
            >
              Heute
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Datum + Zeit daneben ---------- */

export type DateTimeInputWithCalendarProps = {
  /** ISO Datum: yyyy-mm-dd */
  dateValue: string
  onDateChange: (value: string) => void
  /** Zeit im Format HH:MM (oder leer) */
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
    <div className="flex items-center gap-2">
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

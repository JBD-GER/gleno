'use client'

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import deLocale from '@fullcalendar/core/locales/de'
import type { EventContentArg, DatesSetArg } from '@fullcalendar/core'

import AddAppointmentModal from './AddAppointmentModal'
import EventDetailModal, { EventDetail } from './EventDetailModal'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'

/* ----------------------------- Typen ----------------------------- */
type Appointment = {
  id: string
  reason: string | null
  title: string | null
  location: string
  start_time: string
  end_time: string | null
  notes: string | null
  customer?: { first_name?: string | null; last_name?: string | null } | null
  employees?: { employees?: { first_name?: string | null } | null }[] | null
}

type FCEventExt = {
  notiz: string
  mitarbeiter: string
  accent: string
  location: string
  customerName: string
  isSoon: boolean
  isPast: boolean
  reason?: string | null
}

type Employee = {
  id: string
  first_name: string | null
  last_name: string | null
}

/* ----------------------------- Helpers ----------------------------- */
/** dunklere, ruhige Palette (kein Lila) */
const PALETTE = [
  '#0f172a',
  '#1f2937',
  '#0b3a53',
  '#0a3d62',
  '#22333b',
  '#0a4a5a',
  '#2b3a55',
]

const REASON_LABEL: Record<string, string> = {
  ERSTGESPRÄCH: 'Erstgespräch',
  AUFMASS: 'Aufmaß',
  BEMUSTERUNG: 'Bemusterung',
  ANGEBOTSBESPRECHUNG: 'Angebotsbesprechung',
  AUFTRAGSKLÄRUNG: 'Auftragsklärung',
  BAUABLAUFPLANUNG: 'Bauablaufplanung',
  TECHNISCHE_FREIGABE: 'Technische Freigabe',
  NACHTRAGSBESPRECHUNG: 'Nachtragsbesprechung',
  KICKOFF: 'Kickoff',
  ZWISCHENBEGEHUNG: 'Zwischenbegehung',
  MAENGELTERMIN: 'Mängeltermin',
  VORAB_ABNAHME: 'Vorab-Abnahme',
  ENDABNAHME: 'Endabnahme',
  EINWEISUNG: 'Einweisung/Pflege',
  RECHNUNGSBESPRECHUNG: 'Rechnungsbesprechung',
  GEWAEHRLEISTUNGS_CHECK: 'Gewährleistungs-Check',
  REKLAMATION: 'Reklamation',
  REFERENZFOTOS: 'Referenzfotos',
  INDIVIDUELL: 'Individuell',
}

function colorFromId(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

const fullName = (e: Employee) =>
  [e.first_name ?? '', e.last_name ?? ''].filter(Boolean).join(' ') ||
  'Unbenannt'

function toValidDate(v: string | null | undefined): Date | null {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

/* helper für initial start für Modal */
function dateToLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = d.getFullYear()
  const m = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const h = pad(d.getHours())
  const min = pad(d.getMinutes())
  return `${y}-${m}-${day}T${h}:${min}`
}

/* ----------------------------- Component ----------------------------- */
export default function CalendarClient() {
  const [events, setEvents] = useState<any[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeId, setEmployeeId] = useState<'all' | string>('all')
  const employeeIdRef = useRef<'all' | string>('all')

  const [selEvent, setSelEvent] = useState<EventDetail | null>(null)
  const [openDetail, setOpenDetail] = useState(false)
  const [viewTitle, setViewTitle] = useState('')

  const calendarRef = useRef<FullCalendar | null>(null)

  // Steuerung AddAppointmentModal von außen (Klick auf Slot)
  const [createOpen, setCreateOpen] = useState(false)
  const [createStart, setCreateStart] = useState<string | undefined>(undefined)

  /* -------------------- Mitarbeiter laden -------------------- */
  const loadEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees', { credentials: 'include' })
      if (!res.ok) return
      const list: Employee[] = await res.json()
      setEmployees(list ?? [])
    } catch {
      // noop
    }
  }, [])

  /* ------------------------ Termine laden ----------------------- */
  const loadAppointments = useCallback(async (emp: 'all' | string) => {
    try {
      const url = new URL('/api/appointments', window.location.origin)
      url.searchParams.set('employee_id', emp || 'all')
      const res = await fetch(url.toString(), { credentials: 'include' })
      if (!res.ok) return
      const data: Appointment[] = await res.json()
      const now = new Date()

      const mapped = (data ?? []).map((a) => {
        const start = toValidDate(a.start_time) ?? new Date()
        let end = toValidDate(a.end_time)
        if (!end || end.getTime() <= start.getTime())
          end = new Date(start.getTime() + 60 * 60 * 1000)

        const accent = colorFromId(a.id)
        const isPast = end.getTime() < now.getTime()
        const isSoon =
          !isPast && start.getTime() - now.getTime() <= 1000 * 60 * 60 * 24
        const custName = [a.customer?.first_name, a.customer?.last_name]
          .filter(Boolean)
          .join(' ')
        const baseTitle =
          (a.title?.trim() || '') ||
          (a.reason ? REASON_LABEL[a.reason] ?? a.reason : '') ||
          a.location

        return {
          id: a.id,
          title: baseTitle,
          start,
          end,
          backgroundColor: 'transparent',
          borderColor: accent,
          textColor: accent,
          extendedProps: {
            notiz: a.notes ?? '',
            mitarbeiter: (a.employees ?? [])
              .map((e) => e?.employees?.first_name ?? '')
              .filter(Boolean)
              .join(', '),
            accent,
            location: a.location,
            customerName: custName,
            isPast,
            isSoon,
            reason: a.reason ?? null,
          } as FCEventExt,
        }
      })

      setEvents(mapped)
    } catch {
      setEvents([])
    }
  }, [])

  /* --------------------- Responsive View Control --------------------- */
  const applyResponsiveView = useCallback(() => {
    const api = calendarRef.current?.getApi()
    if (!api) return
    const w = window.innerWidth
    const desired =
      w < 640 ? 'timeGridDay' : w < 1024 ? 'timeGridWeek' : 'timeGridWeek'
    if (api.view.type !== desired) api.changeView(desired)
  }, [])

  useEffect(() => {
    loadEmployees()
    loadAppointments('all')
  }, [loadEmployees, loadAppointments])

  useEffect(() => {
    employeeIdRef.current = employeeId
  }, [employeeId])

  useEffect(() => {
    // initial & on resize (debounced)
    let t: number | undefined
    const onR = () => {
      window.clearTimeout(t)
      t = window.setTimeout(applyResponsiveView, 150)
    }
    applyResponsiveView()
    window.addEventListener('resize', onR)
    return () => window.removeEventListener('resize', onR)
  }, [applyResponsiveView])

  /* ------------------------- Custom Event Content ------------------------ */
  const eventContent = useCallback((arg: EventContentArg) => {
    const { event, timeText, view } = arg
    const ex = event.extendedProps as unknown as FCEventExt
    const accent = ex.accent
    const isMonth = view.type === 'dayGridMonth'
    const chips = (ex.mitarbeiter || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const durationMin =
      event.start && event.end
        ? Math.max(
            15,
            Math.round(
              (event.end.getTime() - event.start.getTime()) / 60000,
            ),
          )
        : 60

    const isCompact = !isMonth && durationMin <= 30

    const titleLine = `${event.title}${
      ex.customerName ? ` – ${ex.customerName}` : ''
    }`

    // -------- Monatsansicht: sehr kompakt --------
    if (isMonth) {
      return (
        <div className="flex items-center gap-1.5 text-[11px] leading-tight">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: accent }}
          />
          <span className="truncate font-medium text-slate-800">
            {titleLine}
          </span>
        </div>
      )
    }

    // -------- Kompakte Events (z.B. 15 / 30 min) -> Titel + Mitarbeiter --------
    if (isCompact) {
      return (
        <div
          className="group relative flex h-full items-center rounded-xl border border-slate-200 bg-white/95 px-2 py-1 text-[11px] leading-tight shadow-sm hover:shadow-md"
          style={{ boxShadow: '0 1px 0 rgba(2,6,23,0.06)' }}
        >
          <div
            className="mr-2 h-full w-1 rounded-full"
            style={{ background: accent }}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <div
              className={`truncate font-semibold ${
                ex.isPast ? 'text-slate-400' : 'text-slate-900'
              }`}
            >
              {titleLine}
            </div>
            {chips.length > 0 && (
              <div className="mt-0.5 flex flex-wrap gap-1">
                {chips.slice(0, 2).map((name, i) => (
                  <span
                    key={`${name}-${i}`}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-700"
                  >
                    {name.slice(0, 2).toUpperCase()}
                  </span>
                ))}
                {chips.length > 2 && (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                    +{chips.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )
    }

    // -------- Normale / längere Events --------
    return (
      <div
        className="group relative flex h-full w-full flex-col rounded-xl border border-slate-200 bg-white/95 px-2.5 py-1.5 text-[11px] leading-tight shadow-sm hover:shadow-md"
        style={{ boxShadow: '0 1px 0 rgba(2,6,23,0.06)' }}
      >
        <div
          className="absolute inset-y-0 left-0 w-1.5 rounded-l-xl"
          style={{ background: accent }}
        />
        <div className="ml-1.5 flex items-center justify-between gap-2">
          {/* Zeit nur hier – nicht in der kompakten Variante */}
          <div className="text-[11px] font-semibold tracking-wide text-slate-700">
            {timeText}
          </div>
          {ex.isSoon && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              Bald
            </span>
          )}
        </div>

        <div
          className={`ml-1.5 mt-0.5 line-clamp-2 text-xs font-medium ${
            ex.isPast ? 'text-slate-400' : 'text-slate-900'
          }`}
        >
          {titleLine}
        </div>

        {chips.length > 0 && (
          <div className="ml-1.5 mt-1 flex flex-wrap gap-1.5">
            {chips.slice(0, 3).map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-700"
              >
                {name.slice(0, 2).toUpperCase()}
              </span>
            ))}
            {chips.length > 3 && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                +{chips.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }, [])

  /* ------------------------- Klick: Detail-Modal ------------------------- */
  const onEventClick = (info: any) => {
    info.jsEvent?.preventDefault?.()
    info.jsEvent?.stopPropagation?.()
    const e = info.event
    const ex = e.extendedProps as FCEventExt
    setSelEvent({
      id: e.id,
      title: e.title + (ex.customerName ? ` – ${ex.customerName}` : ''),
      start: e.start!,
      end: e.end!,
      notiz: ex.notiz,
      mitarbeiter: ex.mitarbeiter,
      accent: ex.accent,
      location: ex.location,
      customerName: ex.customerName,
    })
    requestAnimationFrame(() => setOpenDetail(true))
  }

  /* --------------------- Klick auf freien Slot -> neues Modal --------------------- */
  const onDateClick = (arg: any) => {
    const d = arg.date as Date
    setCreateStart(dateToLocalInput(d))
    setCreateOpen(true)
  }

  /* ------------------------- Header (Custom) ------------------------- */
  const api = calendarRef.current?.getApi()
  const header = useMemo(
    () => (
      <div className="flex flex-col gap-3 border-b border-white/60 bg-white/80 px-3 pb-3 pt-4 backdrop-blur sm:px-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Navigation + Titel */}
          <div className="flex min-w-0 items-center gap-2">
            <button
              className="rounded-lg border border-white/70 bg-white px-2 py-2 text-slate-800 shadow-sm hover:bg-slate-50"
              onClick={() => api?.prev()}
              aria-label="Vorherige Ansicht"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              className="rounded-lg border border-white/70 bg-white px-2 py-2 text-slate-800 shadow-sm hover:bg-slate-50"
              onClick={() => api?.next()}
              aria-label="Nächste Ansicht"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
            <div className="ml-1 truncate text-base font-semibold text-slate-900 sm:text-lg">
              {viewTitle}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Mitarbeiter-Filter */}
            <div className="flex items-center gap-2 rounded-lg border border-white/70 bg-white px-2 py-1.5 shadow-sm">
              <UserCircleIcon className="h-5 w-5 text-slate-600" />
              <select
                value={employeeId}
                onChange={async (e) => {
                  const v = (e.target.value || 'all') as 'all' | string
                  setEmployeeId(v)
                  employeeIdRef.current = v
                  await loadAppointments(v)
                }}
                className="min-w-[180px] max-w-[60vw] bg-transparent text-sm text-slate-800 outline-none"
              >
                <option value="all">Alle Mitarbeiter</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {fullName(emp)}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => api?.today()}
              className="rounded-lg border border-white/70 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm hover:bg-slate-50"
            >
              Heute
            </button>

            {/* Views: mobil = Dropdown, ab sm = Segmented */}
            <div className="sm:hidden">
              <select
                onChange={(e) => api?.changeView(e.target.value)}
                className="rounded-lg border border-white/70 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                defaultValue={api?.view?.type ?? 'timeGridWeek'}
              >
                <option value="dayGridMonth">Monat</option>
                <option value="timeGridWeek">Woche</option>
                <option value="timeGridDay">Tag</option>
              </select>
            </div>
            <div className="hidden overflow-hidden rounded-lg border border-white/70 bg-white sm:flex shadow-sm">
              <button
                onClick={() => api?.changeView('dayGridMonth')}
                className="px-3 py-2 text-sm text-slate-900 hover:bg-slate-50"
              >
                Monat
              </button>
              <button
                onClick={() => api?.changeView('timeGridWeek')}
                className="border-l border-white/70 px-3 py-2 text-sm text-slate-900 hover:bg-slate-50"
              >
                Woche
              </button>
              <button
                onClick={() => api?.changeView('timeGridDay')}
                className="border-l border-white/70 px-3 py-2 text-sm text-slate-900 hover:bg-slate-50"
              >
                Tag
              </button>
            </div>

            {/* Weißer Button – eigenes Trigger-Modal (uncontrolled) */}
            <AddAppointmentModal
              onSuccess={() => loadAppointments(employeeIdRef.current)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Bald (≤24h)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-slate-300" /> Vergangen
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-slate-200" /> Terminfarbe
          </span>
        </div>
      </div>
    ),
    [viewTitle, api, employees, employeeId, loadAppointments],
  )

  /* ------------------------- Render ------------------------- */
  return (
    <div
      className="flex h-[calc(100vh-180px)] flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-[0_10px_40px_rgba(2,6,23,0.08)] backdrop-blur-xl"
      style={{
        backgroundImage:
          'radial-gradient(1000px 500px at 120% -30%, rgba(2,6,23,0.05), transparent)',
      }}
    >
      {header}

      {/* Kalender selbst scrollt, nicht die ganze Seite */}
      <div className="flex-1 overflow-y-auto px-1 pb-2 pt-2 sm:px-2">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={deLocale}
          headerToolbar={false}
          height="100%"
          allDaySlot={false}
          expandRows={false}
          stickyHeaderDates
          navLinks
          nowIndicator
          dayMaxEvents={3}
          slotEventOverlap={false}
          slotMinTime="06:00:00"
          slotMaxTime="20:00:00"
          scrollTime="08:00:00"
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }}
          events={events}
          eventClick={onEventClick}
          eventContent={eventContent}
          dayHeaderClassNames="!text-slate-700 !font-semibold"
          dayCellClassNames="fc-daycell-custom"
          datesSet={(arg: DatesSetArg) => setViewTitle(arg.view.title)}
          eventDidMount={(arg) => {
            const ex = arg.event.extendedProps as unknown as FCEventExt
            if (ex?.isPast) arg.el.classList.add('opacity-60')
          }}
          dateClick={onDateClick}
        />
      </div>

      {/* Detail-Modal */}
      <EventDetailModal
        isOpen={openDetail}
        onClose={() => {
          setOpenDetail(false)
          loadAppointments(employeeIdRef.current)
        }}
        event={selEvent ?? undefined}
        onUpdated={() => loadAppointments(employeeIdRef.current)}
      />

      {/* Add-Modal für Klick auf Slot (kontrolliert, mit Startzeit) */}
      <AddAppointmentModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialStart={createStart}
        onSuccess={() => {
          setCreateOpen(false)
          loadAppointments(employeeIdRef.current)
        }}
      />

      {/* FC Skin */}
      <style jsx global>{`
        .fc .fc-timegrid-axis {
          background: linear-gradient(
            180deg,
            rgba(248, 250, 252, 0.95),
            rgba(255, 255, 255, 0.95)
          );
        }
        .fc .fc-scrollgrid {
          border: 1px solid rgba(226, 232, 240, 1);
          border-radius: 14px;
          overflow: hidden;
        }
        .fc .fc-col-header-cell-cushion {
          padding: 8px 0;
        }
        .fc-theme-standard td,
        .fc-theme-standard th {
          border-color: rgba(148, 163, 184, 0.22);
        }
        .fc .fc-day-today {
          background: linear-gradient(
            180deg,
            rgba(254, 249, 195, 0.65),
            rgba(254, 249, 195, 0.25)
          );
        }
        .fc .fc-timegrid-now-indicator-line {
          border-color: #ef4444;
        }
        .fc .fc-timegrid-now-indicator-arrow {
          border-color: transparent transparent transparent #ef4444 !important;
        }
        /* höhere Slots wie bei Google */
        .fc .fc-timegrid-slot {
          height: 3.2rem;
        }
        .fc .fc-scroller {
          overflow-y: auto !important;
          scrollbar-width: thin;
        }
        .fc-daygrid-event-harness {
          margin: 2px 6px;
        }
      `}</style>
    </div>
  )
}

// src/app/(app)/dashboard/kalender/CalendarClient.tsx
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
  ListBulletIcon,
  CalendarDaysIcon,
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

type ViewMode = 'calendar' | 'list'

/* ----------------------------- Helpers ----------------------------- */
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

  const [viewMode, setViewMode] = useState<ViewMode>('calendar')

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

  // initial load
  useEffect(() => {
    loadEmployees()
    loadAppointments('all')
  }, [loadEmployees, loadAppointments])

  useEffect(() => {
    employeeIdRef.current = employeeId
  }, [employeeId])

  // initial: auf Handy direkt Listenansicht
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setViewMode('list')
    }
  }, [])

  // responsive calendar view (nur für Kalenderansicht)
  useEffect(() => {
    let t: number | undefined
    const onR = () => {
      window.clearTimeout(t)
      t = window.setTimeout(applyResponsiveView, 150)
    }
    applyResponsiveView()
    window.addEventListener('resize', onR)
    return () => window.removeEventListener('resize', onR)
  }, [applyResponsiveView])

  /* ------------------------- List-View Daten ------------------------- */
  const listGroups = useMemo(() => {
    if (!events.length) return []

    const groups = new Map<
      string,
      { date: Date; items: { ev: any; ex: FCEventExt }[] }
    >()

    const sorted = [...events].sort((a, b) => {
      const as = new Date(a.start).getTime()
      const bs = new Date(b.start).getTime()
      return as - bs
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const pastLimit = new Date(today)
    pastLimit.setDate(pastLimit.getDate() - 7)
    const futureLimit = new Date(today)
    futureLimit.setDate(futureLimit.getDate() + 60)

    for (const ev of sorted) {
      const start = new Date(ev.start)
      if (start < pastLimit || start > futureLimit) continue
      const key = start.toISOString().slice(0, 10)
      const ex = ev.extendedProps as FCEventExt
      if (!groups.has(key)) {
        groups.set(key, { date: start, items: [] })
      }
      groups.get(key)!.items.push({ ev, ex })
    }

    return Array.from(groups.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    )
  }, [events])

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

  /* ------------------------- Detail-Modal öffnen ------------------------- */
  const openDetailFor = useCallback((raw: any) => {
    if (!raw) return
    const ex = raw.extendedProps as FCEventExt
    const start = new Date(raw.start)
    const end = new Date(raw.end)

    setSelEvent({
      id: raw.id,
      title: raw.title + (ex.customerName ? ` – ${ex.customerName}` : ''),
      start,
      end,
      notiz: ex.notiz,
      mitarbeiter: ex.mitarbeiter,
      accent: ex.accent,
      location: ex.location,
      customerName: ex.customerName,
    })
    requestAnimationFrame(() => setOpenDetail(true))
  }, [])

  const onEventClick = (info: any) => {
    info.jsEvent?.preventDefault?.()
    info.jsEvent?.stopPropagation?.()
    openDetailFor(info.event)
  }

  /* --------------------- Klick auf freien Slot -> neues Modal --------------------- */
  const onDateClick = (arg: any) => {
    const d = arg.date as Date
    setCreateStart(dateToLocalInput(d))
    setCreateOpen(true)
  }

  /* ------------------------- Header (Custom) ------------------------- */
  const api = calendarRef.current?.getApi()
  const handleChangeViewMode = (mode: ViewMode) => {
    setViewMode(mode)
  }

  const header = useMemo(
  () => (
    <div className="flex flex-col gap-3 border-b border-white/60 bg-white/85 px-3 pb-3 pt-4 backdrop-blur sm:px-4 md:px-6">
      {/* Zeile 1: Navigation + Titel + View-Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Navigation + Titel */}
        <div className="flex min-w-0 items-center gap-2">
          <button
            className="rounded-lg border border-white/70 bg-white px-2.5 py-2 text-slate-800 shadow-sm hover:bg-slate-50"
            onClick={() => api?.prev()}
            aria-label="Vorherige Ansicht"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            className="rounded-lg border border-white/70 bg-white px-2.5 py-2 text-slate-800 shadow-sm hover:bg-slate-50"
            onClick={() => api?.next()}
            aria-label="Nächste Ansicht"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
          <div className="ml-1 truncate text-base font-semibold text-slate-900 sm:text-lg">
            {viewTitle}
          </div>
        </div>

        {/* Neuer Kalender/Liste-Toggle – EIN Design für Desktop, Tablet & Handy */}
        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-full border border-white/70 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => handleChangeViewMode('calendar')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm ${
                viewMode === 'calendar'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <CalendarDaysIcon
                className={`h-4 w-4 ${
                  viewMode === 'calendar' ? 'text-white' : 'text-slate-600'
                }`}
              />
              <span className="hidden sm:inline">Kalender</span>
            </button>
            <button
              type="button"
              onClick={() => handleChangeViewMode('list')}
              className={`flex items-center gap-1 border-l border-white/70 px-3 py-1.5 text-xs sm:text-sm ${
                viewMode === 'list'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <ListBulletIcon
                className={`h-4 w-4 ${
                  viewMode === 'list' ? 'text-white' : 'text-slate-600'
                }`}
              />
              <span className="hidden sm:inline">Liste</span>
            </button>
          </div>
        </div>
      </div>

      {/* Zeile 2: Filter, Heute, Kalender-View-Auswahl */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Mitarbeiter-Filter */}
        <div className="flex items-center gap-2 rounded-lg border border-white/70 bg-white px-2.5 py-1.5 shadow-sm">
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

        {/* Heute-Button */}
        <button
          onClick={() => api?.today()}
          className="rounded-lg border border-white/70 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm hover:bg-slate-50"
        >
          Heute
        </button>

        {/* Kalender-View-Auswahl – auf Handy kompakt, auf Tablet/Desktop Buttons */}
        <div className="flex flex-1 justify-end gap-2">
          {/* Mobile/Tablet: Dropdown */}
          <select
            onChange={(e) => api?.changeView(e.target.value)}
            className="flex sm:hidden rounded-lg border border-white/70 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
            defaultValue={api?.view?.type ?? 'timeGridWeek'}
          >
            <option value="dayGridMonth">Monat</option>
            <option value="timeGridWeek">Woche</option>
            <option value="timeGridDay">Tag</option>
          </select>

          {/* Ab sm: Drei Buttons */}
          <div className="hidden overflow-hidden rounded-lg border border-white/70 bg-white shadow-sm sm:inline-flex">
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

          {/* Neuer Termin – bleibt wie gehabt */}
          <AddAppointmentModal
            onSuccess={() => loadAppointments(employeeIdRef.current)}
          />
        </div>
      </div>

      {/* Legende */}
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
  [viewTitle, api, employees, employeeId, loadAppointments, viewMode],
)


  /* ------------------------- Render ------------------------- */
  return (
    <div
      className="flex h-[calc(100vh-190px)] flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-[0_10px_40px_rgba(2,6,23,0.08)] backdrop-blur-xl sm:h-[calc(100vh-210px)]"
      style={{
        backgroundImage:
          'radial-gradient(900px 400px at 110% -30%, rgba(2,6,23,0.05), transparent)',
      }}
    >
      {header}

      {/* Inhalt: Kalender ODER Liste */}
      <div className="flex-1 overflow-y-auto px-1 pb-2 pt-2 sm:px-2">
        {viewMode === 'calendar' ? (
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
        ) : (
          <div className="space-y-4 pb-4">
            {listGroups.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm text-slate-600">
                Keine Termine im sichtbaren Zeitraum. Erstellen Sie einen
                Termin im Kalender oder über den Button „Neuer Termin“.
              </div>
            ) : (
              listGroups.map((group) => (
                <section
                  key={group.date.toISOString()}
                  className="rounded-2xl border border-white/70 bg-white/90 p-3 shadow-sm backdrop-blur"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">
                      {group.date.toLocaleDateString('de-DE', {
                        weekday: 'long',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {group.items.length} Termin
                      {group.items.length !== 1 ? 'e' : ''}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {group.items.map(({ ev, ex }) => {
                      const start = new Date(ev.start)
                      const end = new Date(ev.end)
                      const timeLabel = `${start.toLocaleTimeString('de-DE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })} – ${end.toLocaleTimeString('de-DE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`

                      const chips = (ex.mitarbeiter || '')
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)

                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => openDetailFor(ev)}
                          className="w-full rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-left text-sm text-slate-800 shadow-[0_1px_0_rgba(148,163,184,0.4)] hover:border-slate-300 hover:shadow-md active:scale-[0.99]"
                        >
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 flex flex-col items-center">
                              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                                {timeLabel}
                              </span>
                              <span
                                className="mt-1 h-4 w-1.5 rounded-full"
                                style={{ background: ex.accent }}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="line-clamp-2 text-[13px] font-semibold text-slate-900">
                                {ev.title}
                                {ex.customerName
                                  ? ` – ${ex.customerName}`
                                  : ''}
                              </div>
                              {ex.location && (
                                <div className="mt-0.5 text-[11px] text-slate-500">
                                  {ex.location}
                                </div>
                              )}
                              {ex.notiz && (
                                <div className="mt-0.5 line-clamp-2 text-[11px] text-slate-600">
                                  {ex.notiz}
                                </div>
                              )}
                              {chips.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {chips.slice(0, 3).map((c, i) => (
                                    <span
                                      key={`${c}-${i}`}
                                      className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-700"
                                    >
                                      {c}
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
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))
            )}
          </div>
        )}
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

      {/* FullCalendar Skin */}
      <style jsx global>{`
        .fc .fc-timegrid-axis {
          background: linear-gradient(
            180deg,
            rgba(248, 250, 252, 0.96),
            rgba(255, 255, 255, 0.98)
          );
        }
        .fc .fc-scrollgrid {
          border: 1px solid rgba(226, 232, 240, 1);
          border-radius: 14px;
          overflow: hidden;
        }
        .fc .fc-col-header-cell-cushion {
          padding: 8px 0;
          font-size: 12px;
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
        .fc .fc-timegrid-slot {
          height: 3rem;
        }
        .fc .fc-scroller {
          overflow-y: auto !important;
          scrollbar-width: thin;
        }
        .fc-daygrid-event-harness {
          margin: 2px 6px;
        }
        @media (max-width: 640px) {
          .fc .fc-timegrid-slot {
            height: 2.6rem;
          }
          .fc .fc-timegrid-axis-frame {
            font-size: 10px;
            padding-right: 4px;
          }
          .fc .fc-timegrid-slot-label {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  )
}

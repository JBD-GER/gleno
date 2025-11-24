'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import { PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline'

type Project = {
  id: string
  title: string
}

type Entry = {
  id: string
  employee_id: string
  start_time: string
  end_time: string | null
  work_date: string // YYYY-MM-DD
  notes: string | null
  break_minutes?: number | null
  project_id: string | null
  project?: { id: string; title: string } | null
}

/* ---------- Helpers ---------- */
const pad = (n: number) => String(n).padStart(2, '0')

const fmtHMS = (sec: number) => {
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = Math.floor(s % 60)
  return `${pad(h)}:${pad(m)}:${pad(r)}`
}

// floor für stabile Sekunden
const diffSeconds = (aIso: string, bIso: string) =>
  Math.max(0, Math.floor((+new Date(bIso) - +new Date(aIso)) / 1000))

const ymd = (d: Date) => d.toISOString().slice(0, 10)
const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}` // YYYY-MM

const fmtDateLong = (d: Date) =>
  d.toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

const fmtDateOnly = (d: Date) =>
  d.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  })

// ISO -> datetime-local input
const isoToLocalInput = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// datetime-local input -> ISO
const localInputToIso = (val: string): string | null => {
  if (!val) return null
  const d = new Date(val)
  if (isNaN(d.getTime())) return null
  return d.toISOString()
}

// Supabase-Row → sauberes Entry-Objekt
const mapRawEntryToEntry = (row: any): Entry => {
  const rawProject = row.project
  const mappedProject =
    rawProject && Array.isArray(rawProject)
      ? rawProject[0] ?? null
      : rawProject ?? null

  return {
    id: row.id,
    employee_id: row.employee_id,
    start_time: row.start_time,
    end_time: row.end_time,
    work_date: row.work_date,
    notes: row.notes,
    break_minutes: row.break_minutes,
    project_id: row.project_id ?? null,
    project: mappedProject,
  }
}

/* ---------- Manuelles Formular ---------- */
type ManualMode = 'create' | 'edit'

type ManualFormState = {
  id?: string
  date: string
  project_id: string
  start_local: string
  end_local: string
  break_minutes: number
  notes: string
}

export default function TimeTrackerPage() {
  const supa = supabaseClient()

  // Identitäten
  const [authUserId, setAuthUserId] = useState<string | null>(null) // aktueller Login (auth.users.id)
  const [companyUserId, setCompanyUserId] = useState<string | null>(null) // Firmen-Account (profiles.id / auth.users.id)
  const [employeeId, setEmployeeId] = useState<string | null>(null)

  // Auswahl Monat & Tag
  const [currentDate, setCurrentDate] = useState(new Date())
  const [months, setMonths] = useState<string[]>([]) // nur Monate mit Einträgen
  const [selectedMonth, setSelectedMonth] = useState<string>(monthKey(new Date()))

  // Eingaben für Live-Timer
  const [notes, setNotes] = useState('')
  const [pauseChecked, setPauseChecked] = useState(false)
  const [pauseMin, setPauseMin] = useState(30)

  // Projekte
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  // Laufender Timer
  const [runningEntry, setRunningEntry] = useState<Entry | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)

  // Listen / Summen
  const [loading, setLoading] = useState(true)
  const [dayEntries, setDayEntries] = useState<Entry[]>([])
  const [monthEntries, setMonthEntries] = useState<Entry[]>([])
  const [monthTotalSec, setMonthTotalSec] = useState(0)

  // Filter
  const [statusFilter, setStatusFilter] = useState<
    'alle' | 'laufend' | 'fertig' | 'monat'
  >('alle')
  const [q, setQ] = useState('')

  const isMonthlyView = statusFilter === 'monat'

  const currentMonthLabel = useMemo(() => {
    if (!selectedMonth) return 'Monat'
    const [Y, M] = selectedMonth.split('-').map((n) => +n)
    if (!Y || !M) return 'Monat'
    const d = new Date(Y, M - 1, 1)
    return d.toLocaleDateString('de-DE', {
      month: 'long',
    })
  }, [selectedMonth])

  /* ---------- Modal für manuelle Einträge ---------- */
  const [manualOpen, setManualOpen] = useState(false)
  const [manualMode, setManualMode] = useState<ManualMode>('create')
  const [manualBusy, setManualBusy] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)
  const [manualForm, setManualForm] = useState<ManualFormState>({
    date: ymd(new Date()),
    project_id: '',
    start_local: '',
    end_local: '',
    break_minutes: 0,
    notes: '',
  })

  const openManualCreate = () => {
    if (!employeeId || !authUserId) return
    setManualMode('create')
    setManualError(null)
    setManualForm({
      id: undefined,
      date: ymd(currentDate),
      project_id: selectedProjectId ?? '',
      start_local: '',
      end_local: '',
      break_minutes: 0,
      notes: '',
    })
    setManualOpen(true)
  }

  const openManualEdit = (entry: Entry) => {
    if (!employeeId || !authUserId) return
    setManualMode('edit')
    setManualError(null)
    setManualForm({
      id: entry.id,
      date: entry.work_date,
      project_id: entry.project_id ?? '',
      start_local: isoToLocalInput(entry.start_time),
      end_local: isoToLocalInput(entry.end_time),
      break_minutes: Number(entry.break_minutes || 0),
      notes: entry.notes || '',
    })
    setManualOpen(true)
  }

  const closeManual = () => {
    if (manualBusy) return
    setManualOpen(false)
  }

  const saveManual = async () => {
    if (!employeeId || !authUserId) return
    setManualBusy(true)
    setManualError(null)
    try {
      if (!manualForm.date) {
        throw new Error('Bitte ein Datum wählen.')
      }
      if (!manualForm.start_local) {
        throw new Error('Bitte Start (Datum & Uhrzeit) angeben.')
      }

      const startIso = localInputToIso(manualForm.start_local)
      const endIso = manualForm.end_local
        ? localInputToIso(manualForm.end_local)
        : null

      if (!startIso) {
        throw new Error('Start-Zeit ist ungültig.')
      }

      const payload = {
        work_date: manualForm.date,
        start_time: startIso,
        end_time: endIso,
        break_minutes: Number(manualForm.break_minutes || 0),
        notes: manualForm.notes.trim() || null,
        project_id: manualForm.project_id || null,
      }

      if (manualMode === 'create') {
        const insertPayload = {
          ...payload,
          user_id: authUserId,
          employee_id: employeeId,
        }
        const { error } = await supa.from('time_entries').insert(insertPayload)
        if (error) throw error
      } else if (manualMode === 'edit' && manualForm.id) {
        const { error } = await supa
          .from('time_entries')
          .update(payload)
          .eq('id', manualForm.id)
        if (error) throw error
      }

      setManualOpen(false)
      await loadForDay(employeeId, currentDate)
    } catch (e: any) {
      setManualError(e?.message || 'Speichern fehlgeschlagen.')
    } finally {
      setManualBusy(false)
    }
  }

  /* ---------- User, Firma & Mitarbeiter ermitteln ---------- */
  useEffect(() => {
    let ignore = false
    ;(async () => {
      const {
        data: { user },
      } = await supa.auth.getUser()
      if (!user || !user.id) return

      if (!ignore) setAuthUserId(user.id)

      // 1. Versuche Mitarbeiter über auth_user_id zu finden
      const { data: empByAuth } = await supa
        .from('employees')
        .select('id, user_id')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (!ignore && empByAuth) {
        setEmployeeId(empByAuth.id)
        setCompanyUserId(empByAuth.user_id)
        return
      }

      // 2. Fallback: über E-Mail
      if (user.email) {
        const { data: empByMail } = await supa
          .from('employees')
          .select('id, user_id')
          .eq('email', user.email)
          .maybeSingle()

        if (!ignore && empByMail) {
          setEmployeeId(empByMail.id)
          setCompanyUserId(empByMail.user_id)
          return
        }
      }

      // 3. Fallback: User ist selbst die Firma (Owner)
      if (!ignore) {
        setCompanyUserId(user.id)
        setEmployeeId(null)
      }
    })()
    return () => {
      ignore = true
    }
  }, [supa])

  /* ---------- Projekte laden (für Projektauswahl) ---------- */
  useEffect(() => {
    if (!companyUserId) return
    let ignore = false
    ;(async () => {
      const { data, error } = await supa
        .from('projects')
        .select('id, title')
        .eq('user_id', companyUserId)
        .order('created_at', { ascending: false })

      if (error || ignore) return
      setProjects((data ?? []) as Project[])
    })()
    return () => {
      ignore = true
    }
  }, [companyUserId, supa])

  /* ---------- Monate dynamisch aus DB laden ---------- */
  useEffect(() => {
    if (!employeeId) return
    let ignore = false
    ;(async () => {
      const { data, error } = await supa
        .from('time_entries')
        .select('work_date')
        .eq('employee_id', employeeId)

      if (error) return

      const uniq = Array.from(
        new Set(
          (data ?? []).map((r) =>
            String((r as any).work_date).slice(0, 7),
          ),
        ),
      )
        .filter((m) => /^\d{4}-\d{2}$/.test(m))
        .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))

      if (ignore) return
      setMonths(uniq)

      if (uniq.length && !uniq.includes(selectedMonth)) {
        setSelectedMonth(uniq[0])
      }
    })()
    return () => {
      ignore = true
    }
  }, [employeeId, supa, selectedMonth])

  /* ---------- currentDate an selectedMonth anpassen ---------- */
  useEffect(() => {
    if (!selectedMonth) return
    const [Y, M] = selectedMonth.split('-').map((n) => +n)
    const d = new Date(currentDate)
    d.setFullYear(Y, M - 1, Math.min(currentDate.getDate(), 28))
    setCurrentDate(d)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth])

  /* ---------- Tages- & Monatsdaten laden ---------- */
  async function loadForDay(empId: string, date: Date) {
    setLoading(true)
    try {
      const day = ymd(date)

      // Tagesliste inkl. Projekt
      const { data: list } = await supa
        .from('time_entries')
        .select(
          'id, employee_id, start_time, end_time, work_date, notes, break_minutes, project_id, project:projects (id, title)',
        )
        .eq('employee_id', empId)
        .eq('work_date', day)
        .order('start_time', { ascending: false })

      const entries: Entry[] = (list ?? []).map(mapRawEntryToEntry)
      setDayEntries(entries)

      // Laufend?
      const running = entries.find((e) => e.end_time === null)
      setRunningEntry(running ?? null)
      setElapsedSec(
        running
          ? diffSeconds(running.start_time, new Date().toISOString())
          : 0,
      )

      // Monatssumme + Monatsliste
      let mStart = new Date(date)
      let mEnd = new Date(date)
      if (selectedMonth) {
        const [y, m] = selectedMonth.split('-').map(Number)
        mStart = new Date(y, m - 1, 1, 0, 0, 0, 0)
        mEnd = new Date(y, m, 0, 23, 59, 59, 999)
      } else {
        mStart = new Date(
          date.getFullYear(),
          date.getMonth(),
          1,
          0,
          0,
          0,
          0,
        )
        mEnd = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        )
      }

      const { data: monthRows } = await supa
        .from('time_entries')
        .select(
          'id, employee_id, start_time, end_time, work_date, notes, break_minutes, project_id, project:projects (id, title)',
        )
        .eq('employee_id', empId)
        .gte('work_date', ymd(mStart))
        .lte('work_date', ymd(mEnd))
        .order('work_date', { ascending: false })
        .order('start_time', { ascending: false })

      const mEntries: Entry[] = (monthRows ?? []).map(mapRawEntryToEntry)
      setMonthEntries(mEntries)

      const mSec = mEntries.reduce((acc, e) => {
        if (!e.end_time) return acc
        const base = diffSeconds(e.start_time, e.end_time)
        const minus = Number(e.break_minutes || 0) * 60
        return acc + Math.max(0, base - minus)
      }, 0)
      setMonthTotalSec(mSec)
    } finally {
      setLoading(false)
    }
  }

  // initial + bei Änderungen laden
  useEffect(() => {
    if (!employeeId) return
    loadForDay(employeeId, currentDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, currentDate, selectedMonth])

  /* ---------- Live-Timer ---------- */
  useEffect(() => {
    if (!runningEntry) {
      setElapsedSec(0)
      return
    }
    const startMs = new Date(runningEntry.start_time).getTime()

    const tick = () => {
      setElapsedSec(Math.max(0, (Date.now() - startMs) / 1000))
    }

    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [runningEntry])

  /* ---------- Aktionen ---------- */
  const start = async () => {
    if (!employeeId || !authUserId || runningEntry) return

    const now = new Date()
    const payload: any = {
      user_id: authUserId,
      employee_id: employeeId,
      start_time: now.toISOString(),
      end_time: null,
      work_date: ymd(currentDate),
      notes: notes.trim() || null,
      break_minutes: 0,
      project_id: selectedProjectId ?? null,
    }

    const { error } = await supa.from('time_entries').insert(payload)

    if (error) {
      alert(error.message)
      return
    }

    setNotes('')
    setPauseChecked(false)
    setPauseMin(30)

    await loadForDay(employeeId, currentDate)
  }

  const stop = async () => {
    if (!runningEntry || !employeeId) return
    const endIso = new Date().toISOString()
    const extraPause = pauseChecked ? Math.max(0, Math.round(pauseMin)) : 0

    const { error } = await supa
      .from('time_entries')
      .update({
        end_time: endIso,
        notes: runningEntry.notes ?? null,
        break_minutes: extraPause,
      })
      .eq('id', runningEntry.id)

    if (error) {
      alert(error.message)
      return
    }

    setRunningEntry(null)
    setElapsedSec(0)
    setPauseChecked(false)
    setPauseMin(30)

    await loadForDay(employeeId, currentDate)
  }

  /* ---------- Abgeleitet ---------- */
  const filteredDayEntries = useMemo(() => {
    return dayEntries.filter((e) => {
      if (statusFilter === 'laufend' && e.end_time) return false
      if (statusFilter === 'fertig' && !e.end_time) return false
      if (statusFilter === 'monat') return false
      if (q && !(e.notes || '').toLowerCase().includes(q.toLowerCase()))
        return false
      return true
    })
  }, [dayEntries, statusFilter, q])

  const filteredMonthEntries = useMemo(() => {
    return monthEntries.filter((e) => {
      if (statusFilter === 'laufend' && e.end_time) return false
      if (statusFilter === 'fertig' && !e.end_time) return false
      if (q && !(e.notes || '').toLowerCase().includes(q.toLowerCase()))
        return false
      return true
    })
  }, [monthEntries, statusFilter, q])

  const totalDaySec = useMemo(() => {
    return dayEntries.reduce((acc, e) => {
      const base = e.end_time
        ? diffSeconds(e.start_time, e.end_time)
        : runningEntry && e.id === runningEntry.id
        ? Math.floor(elapsedSec)
        : 0
      const minus = Number(e.break_minutes || 0) * 60
      return acc + Math.max(0, base - minus)
    }, 0)
  }, [dayEntries, runningEntry, elapsedSec])

  const groupedMonthEntries = useMemo(() => {
    if (!isMonthlyView)
      return [] as { day: string; entries: Entry[]; totalSec: number }[]

    const groups: Record<string, Entry[]> = {}
    filteredMonthEntries.forEach((e) => {
      if (!groups[e.work_date]) groups[e.work_date] = []
      groups[e.work_date].push(e)
    })

    const days = Object.keys(groups).sort((a, b) =>
      a < b ? 1 : a > b ? -1 : 0,
    )

    return days.map((day) => {
      const entries = groups[day]
      const totalSec = entries.reduce((acc, e) => {
        const base = e.end_time
          ? diffSeconds(e.start_time, e.end_time)
          : runningEntry && e.id === runningEntry.id
          ? Math.floor(elapsedSec)
          : 0
        const minus = Number(e.break_minutes || 0) * 60
        return acc + Math.max(0, base - minus)
      }, 0)
      return { day, entries, totalSec }
    })
  }, [filteredMonthEntries, isMonthlyView, runningEntry, elapsedSec])

  /* ---------- UI Helpers ---------- */
  const goDay = (delta: number) => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + delta)
    setCurrentDate(d)
    const mk = monthKey(d)
    if (mk !== selectedMonth) setSelectedMonth(mk)
  }

  const PausePreset = ({ v }: { v: number }) => (
    <button
      type="button"
      onClick={() => {
        setPauseChecked(true)
        setPauseMin(v)
      }}
      className={[
        'rounded-lg border px-2.5 py-1 text-xs shadow-sm transition',
        pauseChecked && pauseMin === v
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
      ].join(' ')}
      title={`${v} Minuten Pause ansetzen`}
    >
      {v}m
    </button>
  )

  const renderEntriesList = (entries: Entry[]) => {
    return (
      <ul className="space-y-2">
        {entries.map((e) => {
          const running = e.end_time === null
          const baseSec = running
            ? runningEntry && e.id === runningEntry.id
              ? Math.floor(elapsedSec)
              : 0
            : diffSeconds(e.start_time, e.end_time!)
          const minus = Number(e.break_minutes || 0) * 60
          const dur = Math.max(0, baseSec - minus)

          const projectTitle = e.project?.title ?? null

          return (
            <li
              key={e.id}
              className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white/95 px-4 py-3 shadow-sm transition hover:border-slate-200 hover:shadow-md"
            >
              <div className="absolute inset-y-2 left-1 w-1 rounded-full bg-slate-200 group-hover:bg-slate-400" />
              <div className="ml-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-800">
                    <span className="font-mono">
                      {fmtTime(e.start_time)}
                    </span>
                    <span className="text-slate-400">–</span>
                    <span className="font-mono">
                      {e.end_time ? fmtTime(e.end_time) : 'läuft …'}
                    </span>
                    <span className="ml-1 inline-flex items-center rounded-full bg-slate-900/90 px-2 py-0.5 text-[11px] font-medium text-slate-50">
                      {fmtHMS(dur)}
                    </span>
                    {!!e.break_minutes && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                        Pause {e.break_minutes}m
                      </span>
                    )}
                    {running && (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-100">
                        läuft
                      </span>
                    )}
                    {projectTitle && (
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 ring-1 ring-indigo-100">
                        Projekt: {projectTitle}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600">
                    {e.notes && e.notes.trim().length > 0
                      ? e.notes
                      : 'Keine Notiz hinterlegt.'}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openManualEdit(e)}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                    Bearbeiten
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    )
  }

  /* ---------- Render ---------- */
  const statusButtons: { key: typeof statusFilter; label: string }[] = [
    { key: 'alle', label: 'Alle' },
    { key: 'laufend', label: 'Laufend' },
    { key: 'fertig', label: 'Fertig' },
    { key: 'monat', label: currentMonthLabel },
  ]

  return (
    <>
      <div className="flex w-full flex-col gap-6">
        {/* TOOLBAR */}
        <div
          className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-[0_24px_90px_rgba(15,23,42,0.35)] backdrop-blur-2xl"
          style={{
            backgroundImage:
              'radial-gradient(1200px 600px at 80% -20%, rgba(15,23,42,0.10), transparent)',
          }}
        >
          <div className="relative px-4 py-4 sm:px-5 sm:py-5">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                    Zeiterfassung
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                    Persönliche Zeiten
                  </span>
                </div>
                <p className="text-xs text-slate-600 sm:text-sm">
                  {isMonthlyView
                    ? `Monatsansicht – ${currentMonthLabel}`
                    : fmtDateLong(currentDate)}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-start gap-3 sm:justify-end">
                <div className="hidden items-center rounded-full bg-slate-900/90 px-4 py-1.5 text-xs text-slate-50 shadow-sm sm:inline-flex">
                  Monat gesamt:
                  <span className="ml-2 font-mono">
                    {fmtHMS(monthTotalSec)}
                  </span>
                </div>
                <div className="inline-flex items-center rounded-full bg-slate-50/90 px-3 py-1 text-[11px] text-slate-700 ring-1 ring-inset ring-slate-200 sm:hidden">
                  Monat:
                  <span className="ml-1 font-mono">
                    {fmtHMS(monthTotalSec)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Monats-Chips */}
              <div className="overflow-x-auto">
                <div className="flex items-center gap-2 pr-2">
                  {months.length === 0 ? (
                    <span className="text-xs text-slate-500">
                      Noch keine Zeiten erfasst.
                    </span>
                  ) : (
                    months.map((m) => {
                      const active = selectedMonth === m
                      const label = new Date(m + '-01').toLocaleDateString(
                        'de-DE',
                        {
                          month: 'short',
                          year: 'numeric',
                        },
                      )
                      return (
                        <button
                          key={m}
                          onClick={() => setSelectedMonth(m)}
                          className={[
                            'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs sm:text-sm shadow-sm transition',
                            active
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-white/70 bg-white/90 text-slate-800 hover:bg-white',
                          ].join(' ')}
                        >
                          {label}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Tages-Navi */}
              <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
                <div className="inline-flex overflow-hidden rounded-full border border-white/70 bg-white/95 text-xs shadow-sm">
                  <button
                    onClick={() => goDay(-1)}
                    className="px-3 py-2 text-slate-700 hover:bg-slate-50"
                  >
                    ‹ Zurück
                  </button>
                  <button
                    onClick={() => {
                      const t = new Date()
                      setSelectedMonth(monthKey(t))
                      setCurrentDate(t)
                      setStatusFilter('alle')
                    }}
                    className="bg-slate-900 px-3 py-2 font-medium text-white"
                  >
                    Heute
                  </button>
                  <button
                    onClick={() => goDay(1)}
                    className="px-3 py-2 text-slate-700 hover:bg-slate-50"
                  >
                    Vorwärts ›
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TIMER + PROJEKT */}
        <div className="rounded-3xl border border-white/70 bg-white/95 px-4 py-4 shadow-[0_22px_80px_rgba(15,23,42,0.30)] backdrop-blur-2xl sm:px-5 sm:py-5">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            {/* Live-Timer + Projekt-Auswahl */}
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">
                    Live-Timer
                  </div>
                  <div className="mt-1 text-4xl font-mono tabular-nums text-slate-900 sm:text-5xl">
                    {fmtHMS(Math.floor(elapsedSec))}
                  </div>
                  {runningEntry ? (
                    <div className="mt-1 text-xs text-emerald-700">
                      Läuft seit {fmtTime(runningEntry.start_time)}
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-slate-500">
                      Bereit für einen neuen Zeiteintrag.
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={openManualCreate}
                  disabled={!employeeId || !authUserId}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                    +
                  </span>
                  Manuellen Eintrag erfassen
                </button>
              </div>

              <div className="mt-5 w-full max-w-md space-y-1">
                <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Projekt (optional)
                </label>
                <select
                  value={selectedProjectId ?? ''}
                  onChange={(e) =>
                    setSelectedProjectId(
                      e.target.value ? e.target.value : null,
                    )
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  disabled={!!runningEntry || projects.length === 0}
                >
                  <option value="">
                    {projects.length === 0
                      ? 'Keine Projekte vorhanden'
                      : 'Kein Projekt zugewiesen'}
                  </option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  Dieses Projekt wird dem nächsten Zeiteintrag zugeordnet.
                </p>
              </div>
            </div>

            {/* Notiz + Pause + Buttons */}
            <div className="w-full max-w-md space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Tätigkeit / Notiz
                </label>
                <textarea
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="z. B. Bad EG verfugt, Material organisiert, Baustelle gereinigt …"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={!!runningEntry}
                  rows={3}
                />
              </div>

              {runningEntry && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
                        checked={pauseChecked}
                        onChange={(e) => setPauseChecked(e.target.checked)}
                      />
                      Pause abziehen
                    </label>

                    <div className="inline-flex items-center gap-1">
                      {[30, 45, 60].map((v) => (
                        <PausePreset key={v} v={v} />
                      ))}
                    </div>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        step={5}
                        value={pauseMin}
                        onChange={(e) =>
                          setPauseMin(
                            Math.max(0, Number(e.target.value || 0)),
                          )
                        }
                        className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-200 disabled:opacity-60"
                        disabled={!pauseChecked}
                      />
                      <span className="text-xs text-slate-500">Min</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                {!runningEntry ? (
                  <button
                    onClick={start}
                    disabled={!employeeId || !authUserId || loading}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-6"
                  >
                    Timer starten
                  </button>
                ) : (
                  <button
                    onClick={stop}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700 sm:w-auto sm:px-6"
                  >
                    Timer stoppen
                  </button>
                )}

                <div className="inline-flex items-center justify-center rounded-full bg-slate-50 px-3 py-1 text-[11px] text-slate-600 ring-1 ring-inset ring-slate-200 sm:ml-auto">
                  Tagessumme:
                  <span className="ml-1 font-mono text-slate-900">
                    {fmtHMS(totalDaySec)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FILTER-ZEILE */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex overflow-hidden rounded-full border border-white/70 bg-white/95 text-xs shadow-sm">
            {statusButtons.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={[
                  'px-3 py-2 font-medium transition',
                  statusFilter === key
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-800 hover:bg-slate-50',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            placeholder="Suche in Notizen …"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-full border border-white/70 bg-white/95 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 sm:w-72"
          />
        </div>

        {/* LISTE DER EINTRÄGE */}
        <div className="rounded-3xl border border-white/70 bg-white/95 px-4 py-4 shadow-[0_22px_80px_rgba(15,23,42,0.28)] backdrop-blur-2xl sm:px-5 sm:py-5">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-semibold text-slate-800">
              {isMonthlyView
                ? `Einträge im ${currentMonthLabel}`
                : `Einträge am ${fmtDateLong(currentDate)}`}
            </div>
            <div className="inline-flex items-center rounded-full bg-slate-900/90 px-3 py-1 text-[11px] text-slate-50">
              {isMonthlyView ? 'Monatssumme:' : 'Tagessumme:'}
              <span className="ml-1 font-mono">
                {isMonthlyView ? fmtHMS(monthTotalSec) : fmtHMS(totalDaySec)}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-2xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100"
                />
              ))}
            </div>
          ) : !employeeId ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Für deinen Account wurde kein Mitarbeiter-Datensatz gefunden.
            </div>
          ) : isMonthlyView ? (
            groupedMonthEntries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-sm text-slate-500">
                Noch keine Einträge für diesen Monat.
              </div>
            ) : (
              <div className="space-y-5">
                {groupedMonthEntries.map((group) => {
                  const d = new Date(group.day)
                  return (
                    <div key={group.day} className="space-y-2">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm font-semibold text-slate-800">
                          {fmtDateOnly(d)}
                        </div>
                        <div className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-[11px] text-slate-700 ring-1 ring-inset ring-slate-200">
                          Tagessumme:
                          <span className="ml-1 font-mono">
                            {fmtHMS(group.totalSec)}
                          </span>
                        </div>
                      </div>
                      {renderEntriesList(group.entries)}
                    </div>
                  )
                })}
              </div>
            )
          ) : filteredDayEntries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-sm text-slate-500">
              Noch keine Einträge für diesen Tag.
            </div>
          ) : (
            renderEntriesList(filteredDayEntries)
          )}
        </div>
      </div>

      {/* MODAL: Manueller Eintrag (Neu / Bearbeiten) – Style analog zu anderem Modal */}
      {manualOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4 sm:p-6 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/70 bg-white/95 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.55)]">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {manualMode === 'create'
                    ? 'Manuellen Eintrag erfassen'
                    : 'Zeiteintrag bearbeiten'}
                </h2>
                <p className="text-xs text-slate-500">
                  {manualMode === 'create'
                    ? 'Trage Zeiten und Tätigkeit für den Mitarbeiter ein.'
                    : 'Passe Zeiten, Pause und Notiz für diesen Eintrag an.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeManual}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-800"
                aria-label="Schließen"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {manualError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                  {manualError}
                </div>
              )}

              {/* Datum + Projekt */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] text-slate-600">
                    Datum
                  </label>
                  <input
                    type="date"
                    value={manualForm.date}
                    onChange={(e) =>
                      setManualForm((s) => ({
                        ...s,
                        date: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-slate-600">
                    Projekt
                  </label>
                  <select
                    value={manualForm.project_id}
                    onChange={(e) =>
                      setManualForm((s) => ({
                        ...s,
                        project_id: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">Kein Projekt</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Start & Ende */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] text-slate-600">
                    Start (Datum & Uhrzeit)
                  </label>
                  <input
                    type="datetime-local"
                    value={manualForm.start_local}
                    onChange={(e) =>
                      setManualForm((s) => ({
                        ...s,
                        start_local: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-slate-600">
                    Ende (Datum & Uhrzeit)
                  </label>
                  <input
                    type="datetime-local"
                    value={manualForm.end_local}
                    onChange={(e) =>
                      setManualForm((s) => ({
                        ...s,
                        end_local: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>

              {/* Pause */}
              <div className="w-full sm:w-40">
                <label className="mb-1 block text-[11px] text-slate-600">
                  Pause (Minuten)
                </label>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={manualForm.break_minutes}
                  onChange={(e) =>
                    setManualForm((s) => ({
                      ...s,
                      break_minutes: Math.max(
                        0,
                        Number(e.target.value || 0),
                      ),
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              {/* Notiz */}
              <div>
                <label className="mb-1 block text-[11px] text-slate-600">
                  Notiz / Tätigkeit
                </label>
                <textarea
                  rows={3}
                  value={manualForm.notes}
                  onChange={(e) =>
                    setManualForm((s) => ({
                      ...s,
                      notes: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="Optionale Beschreibung der Tätigkeit …"
                />
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeManual}
                  disabled={manualBusy}
                  className="w-full rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={saveManual}
                  disabled={manualBusy}
                  className="w-full rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-black disabled:opacity-50 sm:w-auto"
                >
                  {manualBusy
                    ? 'Speichert …'
                    : manualMode === 'create'
                    ? 'Eintrag speichern'
                    : 'Änderungen speichern'}
                </button>
              </div>

              {/* Extra-Schließen-Button unten für Mobile, wie beim anderen Modal */}
              <button
                type="button"
                onClick={closeManual}
                disabled={manualBusy}
                className="mt-2 inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm hover:bg-slate-50 sm:hidden"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

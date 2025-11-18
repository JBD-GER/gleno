'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabaseClient } from '@/lib/supabase-client'

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
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

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

export default function TimeTrackerPage() {
  const supa = supabaseClient()

  // Identitäten
  const [authUserId, setAuthUserId] = useState<string | null>(null)      // aktueller Login (auth.users.id)
  const [companyUserId, setCompanyUserId] = useState<string | null>(null) // Firmen-Account (profiles.id / auth.users.id)
  const [employeeId, setEmployeeId] = useState<string | null>(null)

  // Auswahl Monat & Tag
  const [currentDate, setCurrentDate] = useState(new Date())
  const [months, setMonths] = useState<string[]>([]) // nur Monate mit Einträgen
  const [selectedMonth, setSelectedMonth] = useState<string>(monthKey(new Date()))

  // Eingaben
  const [notes, setNotes] = useState('')
  const [pauseChecked, setPauseChecked] = useState(false)
  const [pauseMin, setPauseMin] = useState(30)

  // Projekt-Auswahl
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  // Laufender Timer
  const [runningEntry, setRunningEntry] = useState<Entry | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)

  // Listen / Summen
  const [loading, setLoading] = useState(true)
  const [dayEntries, setDayEntries] = useState<Entry[]>([])
  const [monthTotalSec, setMonthTotalSec] = useState(0)

  // Filter
  const [statusFilter, setStatusFilter] = useState<'alle' | 'laufend' | 'fertig'>('alle')
  const [q, setQ] = useState('')

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
        setCompanyUserId(empByAuth.user_id) // Firmen-/Profil-ID
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
        setEmployeeId(null) // kein expliziter Mitarbeiter-Datensatz
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
        new Set((data ?? []).map((r) => String((r as any).work_date).slice(0, 7))) // YYYY-MM
      )
        .filter((m) => /^\d{4}-\d{2}$/.test(m))
        .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)) // neueste zuerst

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
          'id, employee_id, start_time, end_time, work_date, notes, break_minutes, project_id, project:projects (id, title)'
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
        running ? diffSeconds(running.start_time, new Date().toISOString()) : 0
      )

      // Monatssumme
      let mStart = new Date(date)
      let mEnd = new Date(date)
      if (selectedMonth) {
        const [y, m] = selectedMonth.split('-').map(Number)
        mStart = new Date(y, m - 1, 1, 0, 0, 0, 0)
        mEnd = new Date(y, m, 0, 23, 59, 59, 999)
      } else {
        mStart = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
        mEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
      }

      const { data: monthRows } = await supa
        .from('time_entries')
        .select('start_time, end_time, break_minutes, work_date')
        .eq('employee_id', empId)
        .gte('work_date', ymd(mStart))
        .lte('work_date', ymd(mEnd))

      const mSec = (monthRows ?? []).reduce((acc, r: any) => {
        if (!r.end_time) return acc
        const base = diffSeconds(r.start_time, r.end_time)
        const minus = Number(r.break_minutes || 0) * 60
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
    // user_id MUSS authUserId sein, sonst knallt RLS
    if (!employeeId || !authUserId || runningEntry) return

    const now = new Date()
    const payload: any = {
      user_id: authUserId,              // 🔥 wichtig für RLS
      employee_id: employeeId,
      start_time: now.toISOString(),
      end_time: null,
      work_date: ymd(currentDate),
      notes: notes.trim() || null,
      break_minutes: 0,
      project_id: selectedProjectId ?? null,
    }

    const { data, error } = await supa
      .from('time_entries')
      .insert(payload)
      .select(
        'id, employee_id, start_time, end_time, work_date, notes, break_minutes, project_id, project:projects (id, title)'
      )
      .single()

    if (error) {
      alert(error.message)
      return
    }

    const entry = mapRawEntryToEntry(data)

    setNotes('')
    setPauseChecked(false)
    setPauseMin(30)

    setDayEntries((prev) => [entry, ...prev])
    setRunningEntry(entry)
    setElapsedSec(0)
  }

  const stop = async () => {
    if (!runningEntry) return
    const endIso = new Date().toISOString()
    const extraPause = pauseChecked ? Math.max(0, Math.round(pauseMin)) : 0

    const { data, error } = await supa
      .from('time_entries')
      .update({
        end_time: endIso,
        notes: runningEntry.notes ?? null,
        break_minutes: extraPause,
      })
      .eq('id', runningEntry.id)
      .select(
        'id, employee_id, start_time, end_time, work_date, notes, break_minutes, project_id, project:projects (id, title)'
      )
      .single()

    if (error) {
      alert(error.message)
      return
    }

    const updated = mapRawEntryToEntry(data)

    setRunningEntry(null)
    setElapsedSec(0)
    setPauseChecked(false)
    setPauseMin(30)
    setDayEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
  }

  /* ---------- Abgeleitet ---------- */
  const filteredEntries = useMemo(() => {
    return dayEntries.filter((e) => {
      if (statusFilter === 'laufend' && e.end_time) return false
      if (statusFilter === 'fertig' && !e.end_time) return false
      if (q && !(e.notes || '').toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [dayEntries, statusFilter, q])

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
        'rounded-lg border px-2.5 py-1 text-xs shadow transition',
        pauseChecked && pauseMin === v
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-white/60 bg-white/80 text-slate-800 hover:bg-white',
      ].join(' ')}
      title={`${v} Minuten Pause ansetzen`}
    >
      {v}m
    </button>
  )

  /* ---------- Render ---------- */
  return (
    <div className="flex w-full flex-col gap-6">
      {/* TOOLBAR */}
      <div
        className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-[0_18px_60px_rgba(15,23,42,0.25)] backdrop-blur-2xl"
        style={{
          backgroundImage:
            'radial-gradient(1200px 600px at 80% -20%, rgba(15,23,42,0.10), transparent)',
        }}
      >
        <div className="relative p-4 sm:p-5">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Zeiterfassung
              </h1>
              <p className="text-sm text-slate-600">{fmtDateLong(currentDate)}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center rounded-full bg-slate-900/90 px-4 py-1.5 text-xs text-slate-50 shadow-sm sm:inline-flex">
                Monat gesamt:
                <span className="ml-2 font-mono">{fmtHMS(monthTotalSec)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Monats-Chips */}
            <div className="overflow-x-auto">
              <div className="flex items-center gap-2 pr-2">
                {months.length === 0 ? (
                  <span className="text-xs text-slate-500">Noch keine Zeiten erfasst.</span>
                ) : (
                  months.map((m) => {
                    const active = selectedMonth === m
                    const label = new Date(m + '-01').toLocaleDateString('de-DE', {
                      month: 'short',
                      year: 'numeric',
                    })
                    return (
                      <button
                        key={m}
                        onClick={() => setSelectedMonth(m)}
                        className={[
                          'whitespace-nowrap rounded-xl border px-3 py-1.5 text-sm shadow-sm transition',
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
            <div className="flex items-center gap-2">
              <div className="inline-flex overflow-hidden rounded-xl border border-white/60 bg-white/90 shadow-sm">
                <button
                  onClick={() => goDay(-1)}
                  className="px-3 py-2 text-xs text-slate-700 hover:bg-white"
                >
                  ‹ Gestern
                </button>
                <button
                  onClick={() => {
                    const t = new Date()
                    setSelectedMonth(monthKey(t))
                    setCurrentDate(t)
                  }}
                  className="bg-slate-900 px-3 py-2 text-xs font-medium text-white"
                >
                  Heute
                </button>
                <button
                  onClick={() => goDay(1)}
                  className="px-3 py-2 text-xs text-slate-700 hover:bg-white"
                >
                  Morgen ›
                </button>
              </div>
              <div className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-[11px] text-slate-600 ring-1 ring-inset ring-slate-200 sm:hidden">
                Monat:
                <span className="ml-1 font-mono">{fmtHMS(monthTotalSec)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TIMER + PROJEKT */}
      <div className="rounded-2xl border border-white/60 bg-white/95 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.20)] backdrop-blur-2xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          {/* Live-Timer + Projekt-Auswahl */}
          <div className="flex-1">
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

            {/* Projekt-Auswahl */}
            <div className="mt-5 max-w-xs space-y-1">
              <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Projekt (optional)
              </label>
              <select
                value={selectedProjectId ?? ''}
                onChange={(e) =>
                  setSelectedProjectId(e.target.value ? e.target.value : null)
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
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
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
                        setPauseMin(Math.max(0, Number(e.target.value || 0)))
                      }
                      className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-200 disabled:opacity-60"
                      disabled={!pauseChecked}
                    />
                    <span className="text-xs text-slate-500">Min</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-2 flex items-center gap-2">
              {!runningEntry ? (
                <button
                  onClick={start}
                  disabled={!employeeId || !authUserId || loading}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Timer starten
                </button>
              ) : (
                <button
                  onClick={stop}
                  className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700"
                >
                  Timer stoppen
                </button>
              )}

              <div className="ml-auto inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-[11px] text-slate-600 ring-1 ring-inset ring-slate-200">
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
        <div className="inline-flex overflow-hidden rounded-xl border border-white/60 bg-white/90 shadow-sm">
          {(['alle', 'laufend', 'fertig'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setStatusFilter(k)}
              className={[
                'px-3 py-2 text-xs font-medium transition',
                statusFilter === k
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-800 hover:bg-white',
              ].join(' ')}
            >
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
        <input
          placeholder="Suche in Notizen …"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 sm:w-72"
        />
      </div>

      {/* LISTE DER EINTRÄGE */}
      <div className="rounded-2xl border border-white/60 bg-white/95 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.18)] backdrop-blur-2xl">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-slate-800">
            Einträge am {fmtDateLong(currentDate)}
          </div>
          <div className="inline-flex items-center rounded-full bg-slate-900/90 px-3 py-1 text-[11px] text-slate-50">
            Tagessumme:
            <span className="ml-1 font-mono">{fmtHMS(totalDaySec)}</span>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-slate-500">Lade Zeiteinträge …</div>
        ) : !employeeId ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Für deinen Account wurde kein Mitarbeiter-Datensatz gefunden.
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-sm text-slate-500">
            Noch keine Einträge für diesen Tag.
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredEntries.map((e) => {
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
                  className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white/95 px-4 py-3 shadow-sm transition hover:border-slate-200 hover:shadow-md"
                >
                  <div className="absolute inset-y-2 left-1 w-1 rounded-full bg-slate-200 group-hover:bg-slate-400" />
                  <div className="ml-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-800">
                        <span className="font-mono">{fmtTime(e.start_time)}</span>
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
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

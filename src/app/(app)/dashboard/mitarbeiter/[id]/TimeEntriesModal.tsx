'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  XMarkIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'

type Entry = {
  id: string
  user_id: string
  employee_id: string
  project_id: string | null
  work_date: string
  start_time: string | null
  end_time: string | null
  break_minutes: number
  notes: string | null
  created_at: string
  updated_at: string
  project?: { id: string; title: string } | null
}

type Props = {
  employeeId: string
  employeeName?: string
  open: boolean
  onClose: () => void
}

/* ---------------- Helpers ---------------- */
const pad = (n: number) => String(n).padStart(2, '0')
const localDateStr = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const toLocalDatetimeInput = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fromLocalDatetimeInput = (val: string): string | null => {
  if (!val) return null
  const d = new Date(val)
  if (isNaN(+d)) return null
  return d.toISOString()
}
const seconds = (a: string | null, b: string | null) => {
  if (!a || !b) return 0
  const A = +new Date(a)
  const B = +new Date(b)
  return Math.max(0, Math.round((B - A) / 1000))
}
const fmtHMS = (sec: number) => {
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = Math.floor(s % 60)
  return `${pad(h)}:${pad(m)}:${pad(r)}`
}

// Supabase liefert project manchmal als Array – hier normalisieren
const normalizeRow = (row: any): Entry => {
  const normalizedProject =
    row.project && Array.isArray(row.project)
      ? row.project[0] ?? null
      : row.project ?? null

  return {
    id: row.id,
    user_id: row.user_id,
    employee_id: row.employee_id,
    project_id: row.project_id ?? null,
    work_date: row.work_date,
    start_time: row.start_time,
    end_time: row.end_time,
    break_minutes: row.break_minutes ?? 0,
    notes: row.notes ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    project: normalizedProject,
  }
}

type RangePreset = '30tage' | '7tage' | 'monat' | 'benutzerdefiniert'

export default function TimeEntriesModal({
  employeeId,
  employeeName,
  open,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [rows, setRows] = useState<Entry[]>([])
  const [edit, setEdit] = useState<Record<string, Partial<Entry>>>({})

  const [from, setFrom] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return localDateStr(d)
  })
  const [to, setTo] = useState<string>(() => localDateStr(new Date()))

  // Zeitraum-Preset (wie im Dokumenten-Cloud-Modul)
  const [rangePreset, setRangePreset] = useState<RangePreset>('30tage')

  // Toggle für Status: Alle / Laufend / Fertig
  const [statusFilter, setStatusFilter] =
    useState<'alle' | 'laufend' | 'fertig'>('alle')

  const edited = (id: string) => edit[id] ?? {}
  const merged = (r: Entry) => ({ ...r, ...edited(r.id) })

  const safeJson = async (res: Response) => {
    const text = await res.text()
    try {
      return JSON.parse(text)
    } catch {
      return { error: text }
    }
  }

  /* ---------------- Zeitraum-Presets ---------------- */
  const applyRangePreset = (preset: RangePreset) => {
    const now = new Date()
    let newFrom = from
    let newTo = to

    if (preset === '30tage') {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      newFrom = localDateStr(d)
      newTo = localDateStr(now)
    } else if (preset === '7tage') {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      newFrom = localDateStr(d)
      newTo = localDateStr(now)
    } else if (preset === 'monat') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      newFrom = localDateStr(first)
      newTo = localDateStr(last)
    }
    setRangePreset(preset)
    setFrom(newFrom)
    setTo(newTo)
  }

  // Wenn der Benutzer manuell From/To ändert → benutzerdefiniert
  const onChangeFrom = (val: string) => {
    setFrom(val)
    setRangePreset('benutzerdefiniert')
  }
  const onChangeTo = (val: string) => {
    setTo(val)
    setRangePreset('benutzerdefiniert')
  }

  /* ---------------- Laden ---------------- */
  const lastQueryRef = useRef<string>('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const url = `/api/employees/${employeeId}/time-entries${
        params.toString() ? `?${params.toString()}` : ''
      }`

      if (lastQueryRef.current === url && rows.length > 0) {
        setLoading(false)
        return
      }
      lastQueryRef.current = url

      const res = await fetch(url, { cache: 'no-store' })
      const body = await safeJson(res)
      if (!res.ok) throw new Error(body?.error || 'Laden fehlgeschlagen')

      const list = Array.isArray(body) ? body : []
      setRows(list.map(normalizeRow))
      setEdit({})
    } catch (e: any) {
      setError(e?.message || 'Fehler beim Laden')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    // beim ersten Öffnen Standard: letzte 30 Tage
    applyRangePreset('30tage')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employeeId])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, from, to, employeeId])

  // Gesamtzeit IM ZEITRAUM (immer alle, unabhängig vom Filter)
  const total = useMemo(() => {
    return rows.reduce((acc, r) => {
      const m = merged(r)
      const sec =
        seconds(m.start_time ?? null, m.end_time ?? null) -
        Number(m.break_minutes || 0) * 60
      return acc + Math.max(0, sec)
    }, 0)
  }, [rows, edit])

  const onEdit = (id: string, patch: Partial<Entry>) => {
    setEdit((s) => ({ ...s, [id]: { ...(s[id] || {}), ...patch } }))
  }

  // Filter nach Status (Toggle: alle / laufend / fertig)
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const m = merged(r)
      if (statusFilter === 'laufend' && m.end_time) return false
      if (statusFilter === 'fertig' && !m.end_time) return false
      return true
    })
  }, [rows, edit, statusFilter])

  const save = async (id: string) => {
    const base = rows.find((r) => r.id === id)
    if (!base) return
    const m = merged(base)

    setSavingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/time-entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_date: m.work_date,
          start_time: m.start_time ?? null,
          end_time: m.end_time ?? null,
          break_minutes: Number(m.break_minutes || 0),
          notes: m.notes ?? null,
          project_id: m.project_id ?? null,
        }),
      })
      const body = await safeJson(res)
      if (!res.ok) throw new Error(body?.error || 'Speichern fehlgeschlagen')
      await load()
    } catch (e: any) {
      setError(e?.message || 'Fehler beim Speichern')
    } finally {
      setSavingId(null)
    }
  }

  const del = async (id: string) => {
    if (!confirm('Eintrag wirklich löschen?')) return
    setDeletingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/time-entries/${id}`, { method: 'DELETE' })
      const body = await safeJson(res)
      if (!res.ok) throw new Error(body?.error || 'Löschen fehlgeschlagen')
      setRows((prev) => prev.filter((r) => r.id !== id))
      const { [id]: _, ...rest } = edit
      setEdit(rest)
    } catch (e: any) {
      setError(e?.message || 'Fehler beim Löschen')
    } finally {
      setDeletingId(null)
    }
  }

  /* ---------------- CSV-Export (respektiert Filter) ---------------- */
  const exportCsv = () => {
    const baseRows = filteredRows.length ? filteredRows : rows
    if (!baseRows.length) {
      alert('Keine Einträge im gewählten Zeitraum – nichts zu exportieren.')
      return
    }

    const esc = (v: unknown) => {
      if (v === null || v === undefined) return '""'
      const s = String(v)
      return `"${s.replace(/"/g, '""')}"`
    }

    const header = [
      'Mitarbeiter',
      'Datum',
      'Start',
      'Ende',
      'Pause_Minuten',
      'Dauer_Sekunden',
      'Dauer_Stunden',
      'Projekt',
      'Notiz',
      'Erstellt_am',
      'Geändert_am',
    ]

    const lines: string[] = []
    lines.push(header.join(';'))

    baseRows.forEach((r) => {
      const m = merged(r)
      const durSec = Math.max(
        0,
        seconds(m.start_time ?? null, m.end_time ?? null) -
          Number(m.break_minutes || 0) * 60,
      )
      const durHours = (durSec / 3600).toFixed(2)

      lines.push(
        [
          esc(employeeName ?? ''),
          esc(m.work_date ?? ''),
          esc(m.start_time ?? ''),
          esc(m.end_time ?? ''),
          esc(Number(m.break_minutes || 0)),
          esc(durSec),
          esc(durHours),
          esc(m.project?.title ?? ''),
          esc(m.notes ?? ''),
          esc(r.created_at),
          esc(r.updated_at),
        ].join(';'),
      )
    })

    const csv = lines.join('\r\n')
    const blob = new Blob([csv], {
      type: 'text/csv;charset-utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')

    const safeName = (employeeName || 'mitarbeiter')
      .replace(/[^\w\-]+/g, '_')
      .toLowerCase()

    a.href = url
    a.download = `zeiteintraege_${safeName}_${from}_bis_${to}.csv`

    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const presetLabel = (preset: RangePreset) => {
    switch (preset) {
      case '7tage':
        return 'Letzte 7 Tage'
      case '30tage':
        return 'Letzte 30 Tage'
      case 'monat':
        return 'Aktueller Monat'
      case 'benutzerdefiniert':
      default:
        return 'Benutzerdefiniert'
    }
  }

  /* ---------------- UI ---------------- */
  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
        </Transition.Child>

        {/* Panel */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-3 sm:p-6">
            <Transition.Child
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-3 scale-[0.97]"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-3 scale-[0.97]"
            >
              <Dialog.Panel className="w-full max-w-7xl overflow-hidden rounded-[32px] border border-white/70 bg-white/95 shadow-[0_30px_120px_rgba(15,23,42,0.45)] backdrop-blur-2xl ring-1 ring-white/70">
                {/* Header */}
                <div className="border-b border-slate-100 bg-white/90 px-5 pb-4 pt-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    {/* Titel & Meta */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Dialog.Title className="truncate text-xl font-semibold text-slate-900">
                          Zeiteinträge {employeeName ? `– ${employeeName}` : ''}
                        </Dialog.Title>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                          Arbeitszeiten
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                        <span>
                          Zeitraum:{' '}
                          <span className="font-mono">{from}</span> –{' '}
                          <span className="font-mono">{to}</span>
                        </span>
                        <span className="hidden sm:inline">
                          • Gesamt:{' '}
                          <span className="font-mono font-semibold">
                            {fmtHMS(total)}
                          </span>
                        </span>
                        <span className="hidden sm:inline">
                          •{' '}
                          {statusFilter === 'alle'
                            ? 'alle Einträge'
                            : statusFilter === 'laufend'
                            ? 'nur laufende Timer'
                            : 'nur abgeschlossene Einträge'}
                        </span>
                      </div>
                    </div>

                    {/* Export + Aktualisieren + Close */}
                    <div className="flex items-center justify-between gap-3 lg:justify-end">
                      <button
                        onClick={exportCsv}
                        disabled={rows.length === 0}
                        className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-800 shadow-sm outline-none hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
                          <ArrowDownTrayIcon className="h-4 w-4 text-slate-700" />
                        </span>
                        <span className="flex flex-col items-start leading-tight">
                          <span className="text-[10px] uppercase tracking-wide text-slate-500">
                            Export
                          </span>
                          <span className="text-[11px]">
                            Gefilterte Einträge als CSV
                          </span>
                        </span>
                      </button>

                      <button
                        onClick={load}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm outline-none hover:bg-slate-800 disabled:opacity-50"
                      >
                        <ArrowPathIcon
                          className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                        />
                        Aktualisieren
                      </button>

                      <button
                        onClick={onClose}
                        className="hidden rounded-full p-2 text-slate-500 outline-none hover:bg-slate-100 hover:text-slate-800 lg:inline-flex"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Filterzeile */}
                  <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    {/* Datum + Preset + Status */}
                    <div className="flex flex-1 flex-wrap items-end gap-3">
                      <div className="w-full max-w-[150px]">
                        <label className="mb-1 block text-[11px] text-slate-600">
                          Von
                        </label>
                        <input
                          type="date"
                          value={from}
                          onChange={(e) => onChangeFrom(e.target.value)}
                          className="w-full rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                        />
                      </div>
                      <div className="w-full max-w-[150px]">
                        <label className="mb-1 block text-[11px] text-slate-600">
                          Bis
                        </label>
                        <input
                          type="date"
                          value={to}
                          onChange={(e) => onChangeTo(e.target.value)}
                          className="w-full rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                        />
                      </div>

                      {/* Zeitraum-Preset */}
                      <div className="w-full max-w-[190px]">
                        <label className="mb-1 block text-[11px] text-slate-600">
                          Zeitraum
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const order: RangePreset[] = [
                              '7tage',
                              '30tage',
                              'monat',
                              'benutzerdefiniert',
                            ]
                            const idx = order.indexOf(rangePreset)
                            const next = order[(idx + 1) % order.length]
                            if (next === 'benutzerdefiniert') {
                              setRangePreset('benutzerdefiniert')
                            } else {
                              applyRangePreset(next)
                            }
                          }}
                          className="flex w-full items-center justify-between rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-left text-xs font-medium text-slate-800 shadow-sm outline-none hover:border-slate-300 hover:bg-slate-50"
                        >
                          <span>{presetLabel(rangePreset)}</span>
                          <ChevronDownIcon className="h-4 w-4 text-slate-500" />
                        </button>
                      </div>

                      {/* Status-Toggle */}
                      <div className="w-full max-w-[220px]">
                        <label className="mb-1 block text-[11px] text-slate-600">
                          Status
                        </label>
                        <div className="inline-flex w-full overflow-hidden rounded-full border border-slate-200 bg-white/95 text-xs shadow-sm">
                          {(['alle', 'laufend', 'fertig'] as const).map((k) => (
                            <button
                              key={k}
                              onClick={() => setStatusFilter(k)}
                              className={[
                                'flex-1 px-3 py-1.5 transition',
                                statusFilter === k
                                  ? 'bg-slate-900 text-white'
                                  : 'text-slate-800 hover:bg-slate-50',
                              ].join(' ')}
                            >
                              {k === 'alle'
                                ? 'Alle'
                                : k === 'laufend'
                                ? 'Laufend'
                                : 'Fertig'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Mobile: Gesamtzeit */}
                    <div className="text-[11px] text-slate-700 lg:text-right">
                      <span className="inline-block rounded-full bg-slate-50 px-3 py-1">
                        Gesamtzeit im Zeitraum:{' '}
                        <span className="font-mono font-semibold">
                          {fmtHMS(total)}
                        </span>
                      </span>
                    </div>

                    {/* Close-Button auf Mobile */}
                    <button
                      onClick={onClose}
                      className="mt-1 inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm outline-none hover:bg-slate-50 lg:hidden"
                    >
                      Schließen
                    </button>
                  </div>
                </div>

                {/* Fehler */}
                {error && (
                  <div className="mx-5 mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                    {error}
                  </div>
                )}

                {/* Content */}
                <div className="max-h-[70vh] overflow-y-auto px-5 pb-5 pt-3">
                  {/* Mobile: Karten */}
                  <div className="space-y-3 md:hidden">
                    {filteredRows.length === 0 && !loading && (
                      <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 text-sm text-slate-600 shadow-sm">
                        Keine Einträge im Zeitraum.
                      </div>
                    )}
                    {loading && (
                      <div className="grid gap-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-32 animate-pulse rounded-2xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100"
                          />
                        ))}
                      </div>
                    )}
                    {filteredRows.map((r) => {
                      const m = merged(r)
                      const dur = Math.max(
                        0,
                        seconds(m.start_time ?? null, m.end_time ?? null) -
                          Number(m.break_minutes || 0) * 60,
                      )
                      const isRunning = !m.end_time

                      return (
                        <div
                          key={r.id}
                          className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
                        >
                          <div className="grid grid-cols-1 gap-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1">
                                <label className="mb-1 block text-[11px] text-slate-600">
                                  Datum
                                </label>
                                <input
                                  type="date"
                                  value={m.work_date ?? ''}
                                  onChange={(e) =>
                                    onEdit(r.id, { work_date: e.target.value })
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white/95 px-2 py-1.5 text-sm shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                                />
                              </div>
                              <div className="text-right text-xs text-slate-700">
                                <div>
                                  Dauer:{' '}
                                  <span className="font-mono font-semibold">
                                    {fmtHMS(dur)}
                                  </span>
                                </div>
                                {isRunning && (
                                  <div className="mt-0.5 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-100">
                                    läuft
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-[11px] text-slate-600">
                                  Start
                                </label>
                                <input
                                  type="datetime-local"
                                  value={toLocalDatetimeInput(m.start_time)}
                                  onChange={(e) =>
                                    onEdit(r.id, {
                                      start_time: fromLocalDatetimeInput(
                                        e.target.value,
                                      ),
                                    })
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white/95 px-2 py-1.5 text-sm shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-[11px] text-slate-600">
                                  Ende
                                </label>
                                <input
                                  type="datetime-local"
                                  value={toLocalDatetimeInput(m.end_time)}
                                  onChange={(e) =>
                                    onEdit(r.id, {
                                      end_time: fromLocalDatetimeInput(
                                        e.target.value,
                                      ),
                                    })
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white/95 px-2 py-1.5 text-sm shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="mb-1 block text-[11px] text-slate-600">
                                  Pause (Minuten)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  step={5}
                                  value={Number(m.break_minutes || 0)}
                                  onChange={(e) =>
                                    onEdit(r.id, {
                                      break_minutes: Number(
                                        e.target.value || 0,
                                      ),
                                    })
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white/95 px-2 py-1.5 text-right text-sm shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-[11px] text-slate-600">
                                  Projekt
                                </label>
                                <input
                                  type="text"
                                  value={m.project?.title ?? ''}
                                  placeholder={
                                    m.project_id ? '(Projekt zugeordnet)' : ''
                                  }
                                  disabled
                                  className="w-full rounded-xl border border-dashed border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-500"
                                  title={m.project_id || undefined}
                                />
                              </div>
                            </div>

                            {/* MOBILE Notiz */}
                            <div>
                              <label className="mb-1 block text-[11px] text-slate-600">
                                Notiz
                              </label>
                              <textarea
                                value={m.notes ?? ''}
                                onChange={(e) =>
                                  onEdit(r.id, { notes: e.target.value })
                                }
                                rows={2}
                                className="w-full min-h-[44px] max-h-28 resize-none overflow-y-auto rounded-xl border border-slate-200 bg-white/95 px-2 py-1.5 text-sm shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                                placeholder="Optionale Notiz zum Einsatz …"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => save(r.id)}
                                disabled={savingId === r.id}
                                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm outline-none hover:bg-slate-50 disabled:opacity-50"
                              >
                                <span className="inline-flex items-center gap-1">
                                  <PencilSquareIcon className="h-4 w-4" />
                                  {savingId === r.id
                                    ? 'Speichert …'
                                    : 'Speichern'}
                                </span>
                              </button>
                              <button
                                onClick={() => del(r.id)}
                                disabled={deletingId === r.id}
                                className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm outline-none hover:bg-rose-700 disabled:opacity-50"
                              >
                                <span className="inline-flex items-center gap-1">
                                  <TrashIcon className="h-4 w-4" />
                                  {deletingId === r.id
                                    ? 'Löscht …'
                                    : 'Löschen'}
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Desktop/Tablet: Liste mit separater Notiz-Zeile */}
                  <div className="hidden md:block">
                    {filteredRows.length === 0 && !loading && (
                      <div className="rounded-2xl border border-slate-200 bg-white/95 p-6 text-sm text-slate-600 shadow-sm">
                        Keine Einträge im Zeitraum.
                      </div>
                    )}

                    {loading && (
                      <div className="grid gap-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-11 animate-pulse rounded-xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100"
                          />
                        ))}
                      </div>
                    )}

                    {filteredRows.length > 0 && (
                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
                        {/* Kopfzeile */}
                        <div
                          className="grid grid-cols-12 items-center border-b border-slate-100 bg-slate-50/80 px-3 py-2 text-[12px] font-medium text-slate-600 backdrop-blur-sm"
                          style={{ gridTemplateColumns: 'repeat(12, minmax(0, 1fr))' }}
                        >
                          <div className="col-span-2">Datum</div>
                          <div className="col-span-2">Start</div>
                          <div className="col-span-2">Ende</div>
                          <div className="col-span-1 text-right">Pause (Min)</div>
                          <div className="col-span-2">Projekt</div>
                          <div className="col-span-1 text-right">Dauer</div>
                          <div className="col-span-2 text-right">Aktionen</div>
                        </div>

                        {/* Zeilen */}
                        <div className="divide-y divide-slate-100">
                          {filteredRows.map((r) => {
                            const m = merged(r)
                            const dur = Math.max(
                              0,
                              seconds(m.start_time ?? null, m.end_time ?? null) -
                                Number(m.break_minutes || 0) * 60,
                            )
                            const isRunning = !m.end_time

                            return (
                              <div
                                key={r.id}
                                className="px-3 py-2.5 text-[13px] text-slate-800 transition hover:bg-slate-50/70"
                              >
                                {/* obere Zeile: Zeiten / Projekt / Dauer / Aktionen */}
                                <div
                                  className="grid grid-cols-12 items-center gap-2"
                                  style={{
                                    gridTemplateColumns:
                                      'repeat(12, minmax(0, 1fr))',
                                  }}
                                >
                                  {/* Datum */}
                                  <div className="col-span-12 sm:col-span-2">
                                    <input
                                      type="date"
                                      value={m.work_date ?? ''}
                                      onChange={(e) =>
                                        onEdit(r.id, { work_date: e.target.value })
                                      }
                                      className="w-full rounded-lg border border-slate-200 bg-white/95 px-2 py-1 text-sm shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                                    />
                                  </div>

                                  {/* Start */}
                                  <div className="col-span-12 sm:col-span-2">
                                    <input
                                      type="datetime-local"
                                      value={toLocalDatetimeInput(m.start_time)}
                                      onChange={(e) =>
                                        onEdit(r.id, {
                                          start_time: fromLocalDatetimeInput(
                                            e.target.value,
                                          ),
                                        })
                                      }
                                      className="w-full rounded-lg border border-slate-200 bg-white/95 px-2 py-1 text-sm shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                                    />
                                  </div>

                                  {/* Ende */}
                                  <div className="col-span-12 sm:col-span-2">
                                    <input
                                      type="datetime-local"
                                      value={toLocalDatetimeInput(m.end_time)}
                                      onChange={(e) =>
                                        onEdit(r.id, {
                                          end_time: fromLocalDatetimeInput(
                                            e.target.value,
                                          ),
                                        })
                                      }
                                      className="w-full rounded-lg border border-slate-200 bg-white/95 px-2 py-1 text-sm shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                                    />
                                  </div>

                                  {/* Pause */}
                                  <div className="col-span-6 sm:col-span-1">
                                    <input
                                      type="number"
                                      min={0}
                                      step={5}
                                      value={Number(m.break_minutes || 0)}
                                      onChange={(e) =>
                                        onEdit(r.id, {
                                          break_minutes: Number(
                                            e.target.value || 0,
                                          ),
                                        })
                                      }
                                      className="w-full rounded-lg border border-slate-200 bg-white/95 px-2 py-1 text-right text-sm shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                                    />
                                  </div>

                                  {/* Projekt */}
                                  <div className="col-span-12 sm:col-span-2">
                                    <input
                                      type="text"
                                      value={m.project?.title ?? ''}
                                      placeholder={
                                        m.project_id ? '(Projekt zugeordnet)' : ''
                                      }
                                      disabled
                                      className="w-full rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-500"
                                      title={m.project_id || undefined}
                                    />
                                  </div>

                                  {/* Dauer */}
                                  <div className="col-span-6 sm:col-span-1 text-right text-[11px] text-slate-700">
                                    <div className="font-mono text-xs">
                                      {fmtHMS(dur)}
                                    </div>
                                    {isRunning && (
                                      <div className="mt-0.5 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-100">
                                        läuft
                                      </div>
                                    )}
                                  </div>

                                  {/* Aktionen */}
                                  <div className="col-span-6 sm:col-span-2 flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => save(r.id)}
                                      disabled={savingId === r.id}
                                      title="Eintrag speichern"
                                      className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-800 shadow-sm outline-none hover:bg-slate-50 disabled:opacity-50"
                                    >
                                      <span className="inline-flex items-center gap-1">
                                        <PencilSquareIcon className="h-4 w-4" />
                                        {savingId === r.id
                                          ? '…'
                                          : 'Speichern'}
                                      </span>
                                    </button>
                                    <button
                                      onClick={() => del(r.id)}
                                      disabled={deletingId === r.id}
                                      title="Eintrag löschen"
                                      className="rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm outline-none hover:bg-rose-700 disabled:opacity-50"
                                    >
                                      <span className="inline-flex items-center gap-1">
                                        <TrashIcon className="h-4 w-4" />
                                        {deletingId === r.id
                                          ? '…'
                                          : 'Löschen'}
                                      </span>
                                    </button>
                                  </div>
                                </div>

                                {/* Notiz – eigene Zeile über die volle Breite */}
                                <div className="mt-2">
                                  <label className="mb-1 block text-[11px] text-slate-600">
                                    Notiz
                                  </label>
                                  <textarea
                                    value={m.notes ?? ''}
                                    onChange={(e) =>
                                      onEdit(r.id, { notes: e.target.value })
                                    }
                                    rows={2}
                                    className="w-full min-h-[36px] max-h-28 resize-none overflow-y-auto rounded-lg border border-slate-200 bg-white/95 px-2 py-1 text-sm shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                                    placeholder="Optionale Notiz zum Einsatz …"
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="hidden border-t border-slate-100 bg-white/90 px-5 py-3 text-right text-[11px] text-slate-700 lg:block">
                  Gesamtzeit im Zeitraum:{' '}
                  <span className="font-mono font-semibold">
                    {fmtHMS(total)}
                  </span>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

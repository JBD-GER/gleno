// app/(app)/dashboard/projekt/[id]/ProjectTimeEntriesModal.tsx
'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  XMarkIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'

type ProjectTimeEntry = {
  id: string
  project_id: string
  employee_id: string
  employee_first_name: string | null
  employee_last_name: string | null
  work_date: string
  start_time: string | null
  end_time: string | null
  break_minutes: number
  notes: string | null
  created_at: string
  updated_at: string
}

type Props = {
  projectId: string
  open: boolean
  onClose: () => void
}

/* ---------- Helpers ---------- */
const pad = (n: number) => String(n).padStart(2, '0')

const localDateStr = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const secondsBetween = (a: string | null, b: string | null) => {
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

const formatEmployeeName = (first: string | null, last: string | null) => {
  const f = first?.trim() || ''
  const l = last?.trim() || ''
  if (!f && !l) return 'Unbekannt'
  return `${f} ${l}`.trim()
}

const safeJson = async (res: Response) => {
  const txt = await res.text()
  try {
    return JSON.parse(txt)
  } catch {
    return { error: txt }
  }
}

export default function ProjectTimeEntriesModal({
  projectId,
  open,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [entries, setEntries] = useState<ProjectTimeEntry[]>([])

  const [from, setFrom] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return localDateStr(d)
  })
  const [to, setTo] = useState<string>(() => localDateStr(new Date()))

  const lastQueryRef = useRef<string>('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)

      const url = `/api/projects/${projectId}/time-entries${
        params.toString() ? `?${params.toString()}` : ''
      }`

      if (lastQueryRef.current === url && entries.length > 0) {
        setLoading(false)
        return
      }
      lastQueryRef.current = url

      const res = await fetch(url, { cache: 'no-store' })
      const body = await safeJson(res)

      if (!res.ok)
        throw new Error(body?.error || 'Laden der Zeiteinträge fehlgeschlagen.')

      const list = Array.isArray(body) ? body : []
      setEntries(list)
    } catch (e: any) {
      setError(e?.message || 'Fehler beim Laden.')
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, from, to, projectId])

  const totalSeconds = useMemo(() => {
    return entries.reduce((acc, e) => {
      const sec =
        secondsBetween(e.start_time, e.end_time) -
        Number(e.break_minutes || 0) * 60
      return acc + Math.max(0, sec)
    }, 0)
  }, [entries])

  /* ---------- CSV Export (gefiltert) ---------- */
  const exportCsv = () => {
    if (!entries.length) {
      alert('Keine Zeiteinträge im gewählten Zeitraum – nichts zu exportieren.')
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
      'Notiz',
      'Erstellt_am',
      'Geändert_am',
    ]

    const lines: string[] = []
    lines.push(header.join(';'))

    entries.forEach((e) => {
      const durSec =
        secondsBetween(e.start_time, e.end_time) -
        Number(e.break_minutes || 0) * 60
      const durHours = (Math.max(0, durSec) / 3600).toFixed(2)
      const employee = formatEmployeeName(
        e.employee_first_name,
        e.employee_last_name,
      )

      lines.push(
        [
          esc(employee),
          esc(e.work_date ?? ''),
          esc(e.start_time ?? ''),
          esc(e.end_time ?? ''),
          esc(Number(e.break_minutes || 0)),
          esc(Math.max(0, durSec)),
          esc(durHours),
          esc(e.notes ?? ''),
          esc(e.created_at),
          esc(e.updated_at),
        ].join(';'),
      )
    })

    const csv = lines.join('\r\n')
    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')

    a.href = url
    a.download = `projekt_${projectId}_zeiteintraege_${from}_bis_${to}.csv`

    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /* ---------- UI ---------- */
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
              <Dialog.Panel className="mx-2 w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-[0_24px_90px_rgba(15,23,42,0.45)] backdrop-blur-2xl ring-1 ring-white/70 sm:mx-0">
                {/* Header */}
                <div className="border-b border-slate-100 bg-white/90 px-4 py-3 sm:px-5 sm:py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Dialog.Title className="text-base font-semibold text-slate-900 sm:text-lg">
                        Zeiteinträge – dieses Projekt
                      </Dialog.Title>
                      <p className="mt-1 text-[11px] text-slate-600">
                        Hier siehst du alle erfassten Arbeitszeiten zu diesem
                        Projekt – inkl. Mitarbeiter, Dauer &amp; Notizen.
                      </p>
                    </div>
                    <button
                      onClick={onClose}
                      className="rounded-full p-2 text-slate-500 outline-none hover:bg-slate-100 hover:text-slate-800"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Filter & Aktionen */}
                  <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="min-w-[130px]">
                        <label className="mb-1 block text-[11px] text-slate-600">
                          Von
                        </label>
                        <input
                          type="date"
                          value={from}
                          onChange={(e) => setFrom(e.target.value)}
                          className="w-full rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                        />
                      </div>
                      <div className="min-w-[130px]">
                        <label className="mb-1 block text-[11px] text-slate-600">
                          Bis
                        </label>
                        <input
                          type="date"
                          value={to}
                          onChange={(e) => setTo(e.target.value)}
                          className="w-full rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                        />
                      </div>
                      <div className="mt-2 text-[11px] text-slate-700 sm:mt-0">
                        <span className="inline-block rounded-full bg-slate-50 px-3 py-1">
                          Gesamt:{' '}
                          <span className="font-mono font-semibold">
                            {fmtHMS(totalSeconds)}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                      <button
                        onClick={exportCsv}
                        disabled={entries.length === 0}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-800 shadow-sm outline-none hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
                          <ArrowDownTrayIcon className="h-4 w-4 text-slate-700" />
                        </span>
                        <span>CSV-Export</span>
                      </button>

                      <button
                        onClick={load}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm outline-none hover:bg-slate-800 disabled:opacity-50"
                      >
                        <ArrowPathIcon
                          className={`h-4 w-4 ${
                            loading ? 'animate-spin' : ''
                          }`}
                        />
                        Aktualisieren
                      </button>
                    </div>
                  </div>
                </div>

                {/* Fehler */}
                {error && (
                  <div className="mx-4 mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 sm:mx-5">
                    {error}
                  </div>
                )}

                {/* Content */}
                <div className="max-h-[65vh] overflow-y-auto px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                  {/* Mobile: Karten */}
                  <div className="space-y-3 md:hidden">
                    {entries.length === 0 && !loading && (
                      <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 text-sm text-slate-600 shadow-sm">
                        Keine Zeiteinträge zu diesem Projekt im Zeitraum.
                      </div>
                    )}

                    {loading && (
                      <div className="grid gap-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-28 animate-pulse rounded-2xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100"
                          />
                        ))}
                      </div>
                    )}

                    {entries.map((e) => {
                      const dur =
                        secondsBetween(e.start_time, e.end_time) -
                        Number(e.break_minutes || 0) * 60
                      const employee = formatEmployeeName(
                        e.employee_first_name,
                        e.employee_last_name,
                      )

                      return (
                        <div
                          key={e.id}
                          className="rounded-2xl border border-slate-200 bg-white/95 p-3 text-[13px] text-slate-800 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                {employee}
                              </div>
                              <div className="mt-0.5 text-xs text-slate-500">
                                Datum:{' '}
                                <span className="font-mono">{e.work_date}</span>
                              </div>
                            </div>
                            <div className="text-right text-xs text-slate-700">
                              Dauer:{' '}
                              <span className="font-mono font-semibold">
                                {fmtHMS(dur)}
                              </span>
                            </div>
                          </div>

                          {e.notes && (
                            <div className="mt-2 rounded-xl bg-slate-50 px-2.5 py-2 text-xs text-slate-700">
                              {e.notes}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Desktop / Tablet: Tabelle */}
                  <div className="hidden md:block">
                    {entries.length === 0 && !loading && (
                      <div className="rounded-2xl border border-slate-200 bg-white/95 p-6 text-sm text-slate-600 shadow-sm">
                        Keine Zeiteinträge zu diesem Projekt im Zeitraum.
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

                    {entries.length > 0 && (
                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
                        {/* Kopfzeile */}
                        <div className="grid grid-cols-12 items-center border-b border-slate-100 bg-slate-50/80 px-3 py-2 text-[12px] font-medium text-slate-600 backdrop-blur-sm">
                          <div className="col-span-3">Mitarbeiter</div>
                          <div className="col-span-2">Datum</div>
                          <div className="col-span-3">Notiz</div>
                          <div className="col-span-2 text-right">
                            Pause (Min)
                          </div>
                          <div className="col-span-2 text-right">Dauer</div>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {entries.map((e) => {
                            const dur =
                              secondsBetween(e.start_time, e.end_time) -
                              Number(e.break_minutes || 0) * 60
                            const employee = formatEmployeeName(
                              e.employee_first_name,
                              e.employee_last_name,
                            )

                            return (
                              <div
                                key={e.id}
                                className="grid grid-cols-12 items-start gap-2 px-3 py-2.5 text-[13px] text-slate-800 hover:bg-slate-50/70"
                              >
                                <div className="col-span-3">
                                  <div className="font-medium text-slate-900">
                                    {employee}
                                  </div>
                                </div>
                                <div className="col-span-2">
                                  <span className="font-mono text-xs">
                                    {e.work_date}
                                  </span>
                                </div>
                                <div className="col-span-3 text-xs text-slate-700">
                                  {e.notes ? (
                                    <div className="max-h-16 overflow-y-auto rounded-lg bg-slate-50 px-2 py-1">
                                      {e.notes}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400">
                                      Keine Notiz
                                    </span>
                                  )}
                                </div>
                                <div className="col-span-2 text-right text-xs text-slate-700">
                                  {Number(e.break_minutes || 0)} Min
                                </div>
                                <div className="col-span-2 text-right text-xs text-slate-700">
                                  <span className="font-mono font-semibold">
                                    {fmtHMS(dur)}
                                  </span>
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
                <div className="border-t border-slate-100 bg-white/90 px-4 py-3 text-right text-[11px] text-slate-700 sm:px-5">
                  Gesamtzeit:{' '}
                  <span className="font-mono font-semibold">
                    {fmtHMS(totalSeconds)}
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

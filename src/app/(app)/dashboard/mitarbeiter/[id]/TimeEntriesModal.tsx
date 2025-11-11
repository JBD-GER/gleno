'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, PencilSquareIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

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

/* ---------------- helpers ---------------- */
const pad = (n: number) => String(n).padStart(2, '0')
const localDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const toLocalDatetimeInput = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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

export default function TimeEntriesModal({ employeeId, employeeName, open, onClose }: Props) {
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

  /* ---------------- load ---------------- */
  const lastQueryRef = useRef<string>('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const url = `/api/employees/${employeeId}/time-entries${params.toString() ? `?${params.toString()}` : ''}`

      if (lastQueryRef.current === url && rows.length > 0) {
        setLoading(false)
        return
      }
      lastQueryRef.current = url

      const res = await fetch(url, { cache: 'no-store' })
      const body = await safeJson(res)
      if (!res.ok) throw new Error(body?.error || 'Laden fehlgeschlagen')

      setRows(Array.isArray(body) ? body : [])
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
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, from, to, employeeId])

  const total = useMemo(() => {
    return rows.reduce((acc, r) => {
      const m = merged(r)
      const sec = seconds(m.start_time ?? null, m.end_time ?? null) - (Number(m.break_minutes || 0) * 60)
      return acc + Math.max(0, sec)
    }, 0)
  }, [rows, edit])

  const onEdit = (id: string, patch: Partial<Entry>) => {
    setEdit(s => ({ ...s, [id]: { ...(s[id] || {}), ...patch } }))
  }

  const save = async (id: string) => {
    const m = merged(rows.find(r => r.id === id)!)
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
      setRows(prev => prev.filter(r => r.id !== id))
      const { [id]: _, ...rest } = edit
      setEdit(rest)
    } catch (e: any) {
      setError(e?.message || 'Fehler beim Löschen')
    } finally {
      setDeletingId(null)
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
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        {/* Panel */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-3 sm:p-6">
            <Transition.Child
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-2"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-2"
            >
              <Dialog.Panel className="w-full max-w-6xl rounded-2xl border border-white/60 bg-white/95 p-4 shadow-xl backdrop-blur-xl ring-1 ring-white/60">
                {/* Header (sticky) */}
                <div className="sticky top-0 z-10 -m-4 mb-4 border-b border-slate-100 bg-white/90 px-4 pb-3 pt-2 backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Dialog.Title className="truncate text-lg font-semibold text-slate-900">
                        Zeiteinträge {employeeName ? `– ${employeeName}` : ''}
                      </Dialog.Title>
                      <p className="text-xs text-slate-600">Ansehen, bearbeiten & löschen</p>
                    </div>
                    <button className="rounded-lg p-2 hover:bg-slate-50" onClick={onClose}>
                      <XMarkIcon className="h-5 w-5 text-slate-700" />
                    </button>
                  </div>

                  {/* Filterzeile */}
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[repeat(5,minmax(0,1fr))] sm:items-end">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Von</label>
                      <input
                        type="date"
                        value={from}
                        onChange={e => setFrom(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Bis</label>
                      <input
                        type="date"
                        value={to}
                        onChange={e => setTo(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="hidden sm:block" />
                    <div className="hidden sm:block" />
                    <div className="flex items-end justify-between sm:justify-end gap-3">
                      <div className="text-xs text-slate-700 whitespace-nowrap">
                        Gesamt: <span className="font-mono">{fmtHMS(total)}</span>
                      </div>
                      <button
                        onClick={load}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow disabled:opacity-50"
                      >
                        <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Laden
                      </button>
                    </div>
                  </div>
                </div>

                {/* Fehler */}
                {error && (
                  <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                    {error}
                  </div>
                )}

                {/* Content */}
                <div className="max-h-[70vh] overflow-y-auto pr-1">
                  {/* Mobile: Karten */}
                  <div className="space-y-3 md:hidden">
                    {rows.length === 0 && !loading && (
                      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                        Keine Einträge im Zeitraum.
                      </div>
                    )}
                    {loading && (
                      <div className="grid gap-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-100" />
                        ))}
                      </div>
                    )}
                    {rows.map((r) => {
                      const m = merged(r)
                      const dur = Math.max(
                        0,
                        seconds(m.start_time ?? null, m.end_time ?? null) - (Number(m.break_minutes || 0) * 60),
                      )
                      return (
                        <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                          <div className="grid grid-cols-1 gap-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[11px] text-slate-600 mb-1">Datum</label>
                                <input
                                  type="date"
                                  value={m.work_date ?? ''}
                                  onChange={(e) => onEdit(r.id, { work_date: e.target.value })}
                                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
                                />
                              </div>
                              <div className="text-right text-xs text-slate-700">
                                Dauer: <span className="font-mono">{fmtHMS(dur)}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[11px] text-slate-600 mb-1">Start</label>
                                <input
                                  type="datetime-local"
                                  value={toLocalDatetimeInput(m.start_time)}
                                  onChange={(e) => onEdit(r.id, { start_time: fromLocalDatetimeInput(e.target.value) })}
                                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] text-slate-600 mb-1">Ende</label>
                                <input
                                  type="datetime-local"
                                  value={toLocalDatetimeInput(m.end_time)}
                                  onChange={(e) => onEdit(r.id, { end_time: fromLocalDatetimeInput(e.target.value) })}
                                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[11px] text-slate-600 mb-1">Pause (Min)</label>
                                <input
                                  type="number"
                                  min={0}
                                  step={5}
                                  value={Number(m.break_minutes || 0)}
                                  onChange={(e) => onEdit(r.id, { break_minutes: Number(e.target.value || 0) })}
                                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] text-slate-600 mb-1">Projekt</label>
                                <input
                                  type="text"
                                  value={m.project?.title ?? ''}
                                  placeholder={m.project_id ? '(Projekt-ID gesetzt)' : ''}
                                  disabled
                                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-500"
                                  title={m.project_id || undefined}
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] text-slate-600 mb-1">Notiz</label>
                              <input
                                type="text"
                                value={m.notes ?? ''}
                                onChange={(e) => onEdit(r.id, { notes: e.target.value })}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => save(r.id)}
                                disabled={savingId === r.id}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                              >
                                <span className="inline-flex items-center gap-1">
                                  <PencilSquareIcon className="h-4 w-4" />
                                  {savingId === r.id ? 'Speichert…' : 'Speichern'}
                                </span>
                              </button>
                              <button
                                onClick={() => del(r.id)}
                                disabled={deletingId === r.id}
                                className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                              >
                                <span className="inline-flex items-center gap-1">
                                  <TrashIcon className="h-4 w-4" />
                                  {deletingId === r.id ? 'Löscht…' : 'Löschen'}
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Desktop/Tablet: Grid-Liste (kein horizontales Scrollen) */}
                  <div className="hidden md:block">
                    {rows.length === 0 && !loading && (
                      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
                        Keine Einträge im Zeitraum.
                      </div>
                    )}

                    {loading && (
                      <div className="grid gap-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
                        ))}
                      </div>
                    )}

                    {rows.length > 0 && (
                      <div className="grid gap-2">
                        {/* Kopfzeile */}
                        <div
                          className="grid grid-cols-12 items-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-[12px] font-medium text-slate-600"
                          style={{ gridTemplateColumns: 'repeat(12, minmax(0, 1fr))' }}
                        >
                          <div className="col-span-2">Datum</div>
                          <div className="col-span-2">Start</div>
                          <div className="col-span-2">Ende</div>
                          <div className="col-span-1">Pause</div>
                          <div className="col-span-2">Projekt</div>
                          <div className="col-span-2">Notiz</div>
                          <div className="col-span-1 text-right">Dauer</div>
                        </div>

                        {/* Zeilen */}
                        {rows.map((r) => {
                          const m = merged(r)
                          const dur = Math.max(
                            0,
                            seconds(m.start_time ?? null, m.end_time ?? null) - (Number(m.break_minutes || 0) * 60),
                          )
                          return (
                            <div
                              key={r.id}
                              className="grid grid-cols-12 items-start gap-2 rounded-lg border border-slate-200 bg-white p-2"
                              style={{ gridTemplateColumns: 'repeat(12, minmax(0, 1fr))' }}
                            >
                              {/* Datum */}
                              <div className="col-span-12 sm:col-span-2">
                                <input
                                  type="date"
                                  value={m.work_date ?? ''}
                                  onChange={(e) => onEdit(r.id, { work_date: e.target.value })}
                                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
                                />
                              </div>

                              {/* Start */}
                              <div className="col-span-12 sm:col-span-2">
                                <input
                                  type="datetime-local"
                                  value={toLocalDatetimeInput(m.start_time)}
                                  onChange={(e) => onEdit(r.id, { start_time: fromLocalDatetimeInput(e.target.value) })}
                                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
                                />
                              </div>

                              {/* Ende */}
                              <div className="col-span-12 sm:col-span-2">
                                <input
                                  type="datetime-local"
                                  value={toLocalDatetimeInput(m.end_time)}
                                  onChange={(e) => onEdit(r.id, { end_time: fromLocalDatetimeInput(e.target.value) })}
                                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
                                />
                              </div>

                              {/* Pause */}
                              <div className="col-span-6 sm:col-span-1">
                                <input
                                  type="number"
                                  min={0}
                                  step={5}
                                  value={Number(m.break_minutes || 0)}
                                  onChange={(e) => onEdit(r.id, { break_minutes: Number(e.target.value || 0) })}
                                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-right text-sm"
                                />
                              </div>

                              {/* Projekt (read only) */}
                              <div className="col-span-12 sm:col-span-2">
                                <input
                                  type="text"
                                  value={m.project?.title ?? ''}
                                  placeholder={m.project_id ? '(Projekt-ID gesetzt)' : ''}
                                  disabled
                                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-500"
                                  title={m.project_id || undefined}
                                />
                              </div>

                              {/* Notiz */}
                              <div className="col-span-12 sm:col-span-2">
                                <input
                                  type="text"
                                  value={m.notes ?? ''}
                                  onChange={(e) => onEdit(r.id, { notes: e.target.value })}
                                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
                                />
                              </div>

                              {/* Dauer + Aktionen */}
                              <div className="col-span-12 sm:col-span-1 flex items-center justify-between sm:justify-end gap-2">
                                <div className="text-right font-mono text-xs text-slate-700 sm:order-1">
                                  {fmtHMS(dur)}
                                </div>
                                <div className="flex items-center gap-2 sm:order-2">
                                  <button
                                    onClick={() => save(r.id)}
                                    disabled={savingId === r.id}
                                    title="Speichern"
                                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[12px] text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                                  >
                                    <span className="inline-flex items-center gap-1">
                                      <PencilSquareIcon className="h-4 w-4" />
                                      {savingId === r.id ? '…' : 'Save'}
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => del(r.id)}
                                    disabled={deletingId === r.id}
                                    title="Löschen"
                                    className="rounded-md bg-rose-600 px-2 py-1 text-[12px] font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                                  >
                                    <span className="inline-flex items-center gap-1">
                                      <TrashIcon className="h-4 w-4" />
                                      {deletingId === r.id ? '…' : 'X'}
                                    </span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="text-xs text-slate-700">
                    Gesamtzeit im Zeitraum: <span className="font-mono">{fmtHMS(total)}</span>
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-lg border border-white/60 bg-white/80 px-4 py-2 text-sm text-slate-900 shadow-sm hover:bg-white"
                  >
                    Schließen
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

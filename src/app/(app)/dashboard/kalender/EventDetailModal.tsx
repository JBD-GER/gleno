'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, Transition, Combobox, Listbox } from '@headlessui/react'
import {
  XMarkIcon, MapPinIcon, UserGroupIcon, ClockIcon,
  PaperClipIcon, ChatBubbleLeftRightIcon, PencilSquareIcon, TrashIcon, CheckIcon, ChevronUpDownIcon
} from '@heroicons/react/24/outline'
import AppointmentDocuments from './components/AppointmentDocuments'
  // 👆 du hast diese Komponenten bereits
import AppointmentNotes from './components/AppointmentsNotes'

export type EventDetail = {
  id: string
  title: string
  start: Date
  end: Date
  notiz: string | null
  mitarbeiter: string
  accent?: string
  location?: string
  customerName?: string
}

type Props = {
  isOpen: boolean
  onClose: () => void
  event?: EventDetail
  onUpdated?: () => void
}

type Person = { id: string; first_name: string | null; last_name?: string | null; email?: string | null }

const NAVY = '#0f172a'
const NAVY_2 = '#1e293b'

/* ---------- Helper ---------- */
const fullName = (p: Person | null | undefined) =>
  p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Unbenannt' : ''

const toInputLocal = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fromInputLocal = (val: string) => {
  const [ymd, hms] = val.split('T')
  const [y, m, d] = ymd.split('-').map(Number)
  const [h, min] = (hms || '00:00').split(':').map(Number)
  return new Date(y, m - 1, d, h, min, 0, 0)
}

export default function EventDetailModal({ isOpen, onClose, event, onUpdated }: Props) {
  const [tab, setTab] = useState<'info'|'docs'|'notes'>('info')
  const [edit, setEdit] = useState(false)

  // Anzeigechips (nur read)
  const accent = event?.accent ?? NAVY
  const chips = useMemo(() => (event?.mitarbeiter || '').split(',').map(s => s.trim()).filter(Boolean), [event])

  // Lookups
  const [customers, setCustomers] = useState<Person[]>([])
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerSearching, setCustomerSearching] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<number | null>(null)
  const [employees, setEmployees] = useState<Person[]>([])

  // Edit-Form
  const [title, setTitle] = useState('')
  const [address, setAddress] = useState('')
  const [hint, setHint] = useState('')
  const [start, setStart] = useState('') // datetime-local
  const [end, setEnd] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Person | null>(null)
  const [selectedEmployees, setSelectedEmployees] = useState<Person[]>([])

  // IDs aus Detail (für Vorselektion & Fallback)
  const [wantedEmpIds, setWantedEmpIds] = useState<string[]>([])
  const [originalCustomerId, setOriginalCustomerId] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [prefillLoading, setPrefillLoading] = useState(false)

  /* ---------- Reset beim Schließen ---------- */
  useEffect(() => {
    if (!isOpen) {
      setTab('info')
      setEdit(false)
      setCustomers([]); setCustomerQuery(''); setCustomerSearching(false)
      setEmployees([])
      setSelectedCustomer(null); setSelectedEmployees([])
      setWantedEmpIds([]); setOriginalCustomerId(null)
      setTitle(''); setAddress(''); setHint(''); setStart(''); setEnd('')
    }
  }, [isOpen])

  /* ---------- Prefill beim Öffnen/Terminwechsel ---------- */
  useEffect(() => {
    setEdit(false) // Bugfix: beim Wechsel nie im Edit bleiben
    if (!event || !isOpen) return

    // Sofort sichtbare Basiswerte
    const baseTitle = event.location || (event.customerName ? event.title.replace(` – ${event.customerName}`, '') : event.title)
    setTitle(baseTitle || '')
    setStart(toInputLocal(event.start))
    setEnd(toInputLocal(event.end))
    setAddress('')
    setHint(event.notiz || '')

    if (event.notiz && event.notiz.includes('Adresse:')) {
      const lines = event.notiz.split('\n')
      const addrLine = lines.find(l => l.startsWith('Adresse:'))
      if (addrLine) {
        setAddress(addrLine.replace(/^Adresse:\s*/,'').trim())
        setHint(lines.filter(l => !l.startsWith('Adresse:')).join('\n').trim())
      }
    }

    // Detaildaten vom Server
    ;(async () => {
      try {
        setPrefillLoading(true)
        const res = await fetch(`/api/appointments/${event.id}`, { credentials: 'include' })
        if (!res.ok) return
        const a = await res.json()

        if (a?.location) setTitle(a.location)
        if (a?.start_time) setStart(toInputLocal(new Date(a.start_time)))
        if (a?.end_time) setEnd(toInputLocal(new Date(a.end_time)))
        if (typeof a?.notes === 'string') {
          const txt = a.notes as string
          if (txt.includes('Adresse:')) {
            const ls = txt.split('\n')
            const al = ls.find((l: string) => l.startsWith('Adresse:'))
            setAddress(al ? al.replace(/^Adresse:\s*/,'').trim() : '')
            setHint(ls.filter((l: string) => !l.startsWith('Adresse:')).join('\n').trim())
          } else setHint(txt)
        }

        // IDs puffern
        const empIds: string[] =
          Array.isArray(a?.employees)
            ? a.employees
                .map((x: any) => x?.employee_id ?? x?.id ?? x?.employees?.id)
                .filter(Boolean)
            : (Array.isArray(a?.employee_ids) ? a.employee_ids : [])
        setWantedEmpIds(empIds)

        // ⬇️ ganz wichtig: ursprüngliche customer_id merken (für Fallback beim Speichern)
        setOriginalCustomerId(a?.customer_id ?? null)

        // Fallback-Name, bis Lookup da ist
        if (event.customerName) {
          setSelectedCustomer({ id: 'tmp', first_name: event.customerName, last_name: '', email: '' })
        }
      } finally {
        setPrefillLoading(false)
      }
    })()
  }, [event?.id, isOpen])

  /* ---------- Lookups nur laden, wenn Edit aktiv ---------- */
  useEffect(() => {
    if (!isOpen || !edit) return
    let cancelled = false

    // Mitarbeiter (alle der Firma)
    ;(async () => {
      try {
        const empRes = await fetch('/api/lookups/employees', { credentials: 'include' })
        const emp = await empRes.json()
        if (!cancelled) setEmployees(Array.isArray(emp) ? emp : [])
      } catch { if (!cancelled) setEmployees([]) }
    })()

    // initiale Kundenliste
    ;(async () => {
      try {
        setCustomerSearching(true)
        const res = await fetch('/api/lookups/customers?limit=100', { credentials: 'include' })
        const data = await res.json()
        if (!cancelled) setCustomers(Array.isArray(data) ? data : [])
      } finally {
        if (!cancelled) setCustomerSearching(false)
      }
    })()

    return () => { cancelled = true }
  }, [isOpen, edit])

  /* ---------- Vorselektion, sobald Lookups da sind ---------- */
  useEffect(() => {
    if (!edit) return
    if (selectedEmployees.length > 0) return
    if (employees.length === 0 || wantedEmpIds.length === 0) return
    const pre = employees.filter(e => wantedEmpIds.includes(e.id))
    if (pre.length) setSelectedEmployees(pre)
  }, [edit, employees, wantedEmpIds, selectedEmployees.length])

  useEffect(() => {
    if (!edit) return
    if (selectedCustomer && selectedCustomer.id !== 'tmp') return
    if (!originalCustomerId) return
    const found = customers.find(c => c.id === originalCustomerId)
    if (found) setSelectedCustomer(found)
  }, [edit, customers, originalCustomerId, selectedCustomer])

  /* ---------- Live-Serversuche Kunden im Edit ---------- */
  useEffect(() => {
    if (!isOpen || !edit) return

    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl

      const q = customerQuery.trim()
      const url = q
        ? `/api/lookups/customers?query=${encodeURIComponent(q)}&limit=50`
        : `/api/lookups/customers?limit=100`

      try {
        setCustomerSearching(true)
        const res = await fetch(url, { credentials: 'include', signal: ctrl.signal })
        const data = await res.json()
        setCustomers(Array.isArray(data) ? data : [])
      } catch { /* aborted */ }
      finally { setCustomerSearching(false) }
    }, 300) as unknown as number

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [customerQuery, isOpen, edit])

  if (!event) return null
  const eventId = event.id

  /* ---------- Actions ---------- */
  async function save() {
    if (!title.trim()) { alert('Titel ist erforderlich.'); return }
    if (!start || !end) { alert('Start und Ende sind erforderlich.'); return }
    const dtS = fromInputLocal(start)
    const dtE = fromInputLocal(end)
    if (dtE.getTime() <= dtS.getTime()) { alert('Ende muss nach Start liegen.'); return }

    setSaving(true)
    try {
      const notesCombined = [hint?.trim() || '', address?.trim() ? `Adresse: ${address.trim()}` : '']
        .filter(Boolean).join('\n')

      // ⬇️ NIE null schicken – auf ursprüngliche ID zurückfallen
      const customerIdToSend =
        selectedCustomer?.id && selectedCustomer.id !== 'tmp'
          ? selectedCustomer.id
          : originalCustomerId

      if (!customerIdToSend) {
        alert('Bitte einen Kunden auswählen.')
        setSaving(false)
        return
      }

      const payload: any = {
        location: title.trim(),
        start_time: dtS.toISOString(),
        end_time: dtE.toISOString(),
        notes: notesCombined,
        customer_id: customerIdToSend,                     // ← Fallback gesichert
        employee_ids: selectedEmployees.map(e => e.id),
      }

      const res = await fetch(`/api/appointments/${eventId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.message || 'Speichern fehlgeschlagen')
      }
      setEdit(false)
      onUpdated?.()
    } catch (err: any) {
      alert(err?.message || 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!confirm('Diesen Termin wirklich löschen?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/appointments/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.message || 'Löschen fehlgeschlagen')
      }
      onUpdated?.()
      onClose()
    } catch (err: any) {
      alert(err?.message || 'Fehler beim Löschen')
    } finally {
      setDeleting(false)
    }
  }

  /* ---------- UI ---------- */
  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[200]" onClose={onClose}>
        {/* Overlay */}
        <Transition.Child as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center">
            <Transition.Child as={Fragment}
              enter="ease-out duration-200" enterFrom="opacity-0 translate-y-1 scale-95" enterTo="opacity-100 translate-y-0 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0 scale-100" leaveTo="opacity-0 translate-y-1 scale-95">
              <Dialog.Panel
                className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/60 bg-white/90 text-left shadow-[0_20px_80px_rgba(2,6,23,0.35)] backdrop-blur-xl"
                style={{ backgroundImage: 'radial-gradient(900px 420px at 120% -30%, rgba(2,6,23,0.10), transparent)' }}
              >
                {/* Kopf */}
                <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${NAVY}, ${NAVY_2})` }} />
                <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-6">
                  <Dialog.Title className="flex-1 min-w-0 break-words text-lg sm:text-xl font-semibold text-slate-900">
                    {event.title}
                  </Dialog.Title>
                  <button onClick={onClose} className="shrink-0 rounded p-1.5 text-slate-600 hover:bg-white/60" aria-label="Schließen">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Tabs + Edit */}
                <div className="mt-2 flex items-center justify-between gap-2 px-4 sm:px-6">
                  <div className="mb-2 -mx-1 flex max-w-full gap-2 overflow-x-auto px-1">
                    <TabButton active={tab==='info'} onClick={() => setTab('info')}>Info</TabButton>
                    <TabButton active={tab==='docs'} onClick={() => setTab('docs')}>
                      <PaperClipIcon className="h-4 w-4" /> Dokumente
                    </TabButton>
                    <TabButton active={tab==='notes'} onClick={() => setTab('notes')}>
                      <ChatBubbleLeftRightIcon className="h-4 w-4" /> Notizen
                    </TabButton>
                  </div>
                  {tab === 'info' && !edit && (
                    <button
                      onClick={() => setEdit(true)}
                      className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-900 shadow-sm backdrop-blur hover:bg-white"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                      Bearbeiten
                    </button>
                  )}
                </div>

                {/* CONTENT */}
                {tab === 'info' && !edit && (
                  <div className="px-4 sm:px-6 pb-6">
                    <div className="mb-3 text-sm text-slate-600 sm:hidden">
                      {event.start.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })} –{' '}
                      {event.end.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>

                    <dl className="space-y-4 text-slate-700">
                      <InfoRow icon={<ClockIcon className="h-5 w-5 text-slate-400" />}>
                        <dt className="text-sm font-medium">Wann</dt>
                        <dd className="text-sm">
                          {event.start.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })} –{' '}
                          {event.end.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
                        </dd>
                      </InfoRow>

                      {(event.location || event.customerName) && (
                        <InfoRow icon={<MapPinIcon className="h-5 w-5 text-slate-400" />}>
                          <dt className="text-sm font-medium">Ort / Kunde</dt>
                          <dd className="text-sm break-words">
                            {event.location ?? '—'}{event.customerName ? ` – ${event.customerName}` : ''}
                          </dd>
                        </InfoRow>
                      )}

                      {event.notiz && (
                        <InfoRow icon={<div className="mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />} >
                          <dt className="text-sm font-medium">Hinweis</dt>
                          <dd className="whitespace-pre-wrap text-sm">{event.notiz}</dd>
                        </InfoRow>
                      )}

                      {chips.length > 0 && (
                        <InfoRow icon={<UserGroupIcon className="h-5 w-5 text-slate-400" />}>
                          <dt className="text-sm font-medium">Mitarbeiter</dt>
                          <dd className="mt-1 flex flex-wrap gap-2">
                            {chips.map((c, i) => (
                              <span key={`${c}-${i}`} className="inline-flex items-center rounded-full border border-white/60 bg-white/80 px-2 py-0.5 text-xs text-slate-900 backdrop-blur">
                                {c}
                              </span>
                            ))}
                          </dd>
                        </InfoRow>
                      )}
                    </dl>
                  </div>
                )}

                {tab === 'info' && edit && (
                  <div className="px-4 sm:px-6 pb-6">
                    <h3 className="mb-3 text-base font-semibold text-slate-900">Termin bearbeiten</h3>

                    {prefillLoading ? (
                      <div className="rounded-lg border border-white/60 bg-white/70 p-4 text-sm text-slate-600">
                        Lade Termindaten …
                      </div>
                    ) : (
                      <form onSubmit={(e) => { e.preventDefault(); save() }} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {/* Titel */}
                        <label className="md:col-span-2">
                          <span className="mb-1 block text-xs font-medium text-slate-600">Titel *</span>
                          <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            placeholder="z. B. Erstgespräch"
                            className="w-full rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none ring-indigo-200/60 backdrop-blur focus:ring-4"
                          />
                        </label>

                        {/* Start */}
                        <label>
                          <span className="mb-1 block text-xs font-medium text-slate-600">Start</span>
                          <input
                            type="datetime-local"
                            value={start}
                            onChange={(e) => setStart(e.target.value)}
                            required
                            className="w-full rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm outline-none ring-indigo-200/60 backdrop-blur focus:ring-4"
                          />
                        </label>

                        {/* Ende */}
                        <label>
                          <span className="mb-1 block text-xs font-medium text-slate-600">Ende</span>
                          <input
                            type="datetime-local"
                            value={end}
                            onChange={(e) => setEnd(e.target.value)}
                            required
                            className="w-full rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm outline-none ring-indigo-200/60 backdrop-blur focus:ring-4"
                          />
                        </label>

                        {/* Kunde (Combobox) */}
                        <div className="md:col-span-2">
                          <span className="mb-1 block text-xs font-medium text-slate-600">Kunde</span>
                          <Combobox value={selectedCustomer} onChange={setSelectedCustomer} nullable>
                            <div className="relative">
                              <Combobox.Input
                                className="w-full rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none ring-indigo-200/60 backdrop-blur focus:ring-4"
                                displayValue={(p: Person) => fullName(p)}
                                placeholder="Kunden suchen…"
                                onChange={(e) => setCustomerQuery(e.target.value)}
                              />
                              <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                <Combobox.Options className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-white/60 bg-white/95 py-1 text-sm shadow-xl backdrop-blur">
                                  {customerSearching && <div className="px-3 py-2 text-slate-500">Suche …</div>}
                                  {!customerSearching && customers.length === 0 && (
                                    <div className="px-3 py-2 text-slate-500">Keine Treffer</div>
                                  )}
                                  {customers.map(c => (
                                    <Combobox.Option
                                      key={c.id}
                                      value={c}
                                      className={({ active }) =>
                                        ['cursor-pointer px-3 py-2', active ? 'bg-slate-100 text-slate-900' : 'text-slate-800'].join(' ')
                                      }
                                    >
                                      <div className="font-medium">{fullName(c)}</div>
                                      {c.email && <div className="text-xs text-slate-500">{c.email}</div>}
                                    </Combobox.Option>
                                  ))}
                                </Combobox.Options>
                              </Transition>
                            </div>
                          </Combobox>
                        </div>

                        {/* Mitarbeiter (multi) */}
                        <div className="md:col-span-2">
                          <span className="mb-1 block text-xs font-medium text-slate-600">Mitarbeiter</span>
                          <Listbox value={selectedEmployees} onChange={setSelectedEmployees} multiple>
                            <div className="relative">
                              <Listbox.Button className="inline-flex w-full items-center justify-between rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-left text-sm text-slate-900 outline-none ring-indigo-200/60 backdrop-blur focus:ring-4">
                                <span className="truncate">
                                  {selectedEmployees.length === 0 ? 'Mitarbeiter wählen…' : `${selectedEmployees.length} ausgewählt`}
                                </span>
                                <ChevronUpDownIcon className="h-4 w-4 text-slate-500" />
                              </Listbox.Button>
                              <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                <Listbox.Options className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-white/60 bg-white/95 py-1 text-sm shadow-xl backdrop-blur">
                                  {employees.length === 0 && <div className="px-3 py-2 text-slate-500">Keine Mitarbeiter</div>}
                                  {employees.map(emp => (
                                    <Listbox.Option
                                      key={emp.id}
                                      value={emp}
                                      className={({ active, selected }) =>
                                        [
                                          'cursor-pointer select-none px-3 py-2 flex items-center gap-2',
                                          active ? 'bg-slate-100 text-slate-900' : 'text-slate-800',
                                          selected ? 'font-medium' : '',
                                        ].join(' ')
                                      }
                                    >
                                      {({ selected }) => (
                                        <>
                                          <span className={`grid h-4 w-4 place-content-center rounded border ${selected ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-300 text-transparent'}`}>
                                            <CheckIcon className="h-3 w-3" />
                                          </span>
                                          <span className="truncate">{fullName(emp)}</span>
                                        </>
                                      )}
                                    </Listbox.Option>
                                  ))}
                                </Listbox.Options>
                              </Transition>
                            </div>
                          </Listbox>
                        </div>

                        {/* Adresse */}
                        <label className="md:col-span-2">
                          <span className="mb-1 block text-xs font-medium text-slate-600">Ort / Adresse</span>
                          <input
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="z. B. Musterstraße 12, Berlin"
                            className="w-full rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none ring-indigo-200/60 backdrop-blur focus:ring-4"
                          />
                        </label>

                        {/* Hinweis */}
                        <label className="md:col-span-2">
                          <span className="mb-1 block text-xs font-medium text-slate-600">Hinweis</span>
                          <textarea
                            rows={3}
                            value={hint}
                            onChange={(e) => setHint(e.target.value)}
                            placeholder="Details, Ansprechpartner, Besonderheiten …"
                            className="w-full rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none ring-indigo-200/60 backdrop-blur focus:ring-4"
                          />
                        </label>

                        {/* Actions */}
                        <div className="md:col-span-2 mt-1 flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={remove}
                            disabled={deleting}
                            className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 shadow-sm hover:bg-rose-100 disabled:opacity-60"
                          >
                            <TrashIcon className="h-4 w-4" />
                            {deleting ? 'Lösche…' : 'Löschen'}
                          </button>

                          <div className="ml-auto flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEdit(false)}
                              className="rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-white"
                            >
                              Abbrechen
                            </button>
                            <button
                              type="submit"
                              disabled={saving}
                              className="rounded-lg border border-white/60 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-white disabled:opacity-60"
                            >
                              {saving ? 'Speichere…' : 'Speichern'}
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* Content: Dokumente / Notizen */}
                {tab === 'docs'  && <div className="px-4 sm:px-6 pb-6"><AppointmentDocuments appointmentId={eventId} /></div>}
                {tab === 'notes' && <div className="px-4 sm:px-6 pb-6"><AppointmentNotes appointmentId={eventId} /></div>}

                {/* Mobile Edit-Button */}
                {tab === 'info' && !edit && (
                  <div className="sm:hidden sticky bottom-0 z-10 border-t border-white/60 bg-white/80 backdrop-blur p-3">
                    <button
                      onClick={() => setEdit(true)}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-white/60 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                      Bearbeiten
                    </button>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

/* ---------- UI-Bausteine ---------- */
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition',
        'border backdrop-blur',
        active ? 'border-white/60 bg-white/80 text-slate-900 shadow-sm' : 'border-transparent bg-white/40 text-slate-600 hover:bg-white/60'
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

'use client'

import React, { useState, useEffect, Fragment, useMemo, useRef } from 'react'
import { Dialog, Transition, Combobox, Listbox } from '@headlessui/react'
import {
  CalendarDaysIcon, ClockIcon, MapPinIcon, UserGroupIcon, XMarkIcon,
  PencilSquareIcon, BriefcaseIcon, CheckIcon, ChevronUpDownIcon
} from '@heroicons/react/24/outline'
import { supabaseClient } from '@/lib/supabase-client'

type Person = { id: string; first_name: string | null; last_name?: string | null; email?: string | null }
type Project = { id: string; title: string }
type Props = { onSuccess?: () => void }

/* Terminarten – INDIVIDUELL oben */
const APPT_TYPES = [
  { key: 'INDIVIDUELL', label: 'Individuell (freier Titel)' },
  { key: 'ERSTGESPRÄCH', label: 'Erstgespräch' },
  { key: 'AUFMASS', label: 'Aufmaß' },
  { key: 'BEMUSTERUNG', label: 'Bemusterung' },
  { key: 'ANGEBOTSBESPRECHUNG', label: 'Angebotsbesprechung' },
  { key: 'AUFTRAGSKLÄRUNG', label: 'Auftragsklärung' },
  { key: 'BAUABLAUFPLANUNG', label: 'Bauablaufplanung' },
  { key: 'TECHNISCHE_FREIGABE', label: 'Technische Freigabe' },
  { key: 'NACHTRAGSBESPRECHUNG', label: 'Nachtragsbesprechung' },
  { key: 'KICKOFF', label: 'Kickoff' },
  { key: 'ZWISCHENBEGEHUNG', label: 'Zwischenbegehung' },
  { key: 'MAENGELTERMIN', label: 'Mängeltermin' },
  { key: 'VORAB_ABNAHME', label: 'Vorab-Abnahme' },
  { key: 'ENDABNAHME', label: 'Endabnahme' },
  { key: 'EINWEISUNG', label: 'Einweisung' },
  { key: 'RECHNUNGSBESPRECHUNG', label: 'Rechnungsbesprechung' },
  { key: 'GEWAEHRLEISTUNGS_CHECK', label: 'Gewährleistungs-Check' },
  { key: 'REKLAMATION', label: 'Reklamation' },
  { key: 'REFERENZFOTOS', label: 'Referenzfotos' },
] as const

function nextHalfHourISO() {
  const d = new Date()
  d.setSeconds(0, 0)
  const add = d.getMinutes() <= 30 ? 30 - d.getMinutes() : 60 - d.getMinutes()
  d.setMinutes(d.getMinutes() + add)
  const tzOffset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - tzOffset * 60000)
  return local.toISOString().slice(0, 16) // "YYYY-MM-DDTHH:mm"
}

const empName = (p: Person) =>
  `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Unbenannt'

export default function AddAppointmentModal({ onSuccess }: Props) {
  const supabase = supabaseClient()

  const [isOpen, setIsOpen] = useState(false)

  // Titel (= weiterhin in appointments.location)
  const [type, setType] = useState<typeof APPT_TYPES[number]>(APPT_TYPES[0])
  const [title, setTitle] = useState('') // nur bei INDIVIDUELL

  const [address, setAddress] = useState('')

  const [start, setStart] = useState(nextHalfHourISO())
  const [duration, setDuration] = useState(60)
  const [hint, setHint] = useState('') // Hinweis

  // Kunden + Projekte
  const [customers, setCustomers] = useState<Person[]>([])
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerSearching, setCustomerSearching] = useState(false)
  const searchAbortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<number | null>(null)

  const [selectedCustomer, setSelectedCustomer] = useState<Person | null>(null)

  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('') // nur ID
  const [loadingProjects, setLoadingProjects] = useState(false)

  // Mitarbeiter (Multi)
  const [employees, setEmployees] = useState<Person[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<Person[]>([])

  const [saving, setSaving] = useState(false)

  /* ------------------ Stammdaten laden ------------------ */
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    ;(async () => {
      try {
        // Mitarbeiter (alle der Firma) via Lookup-API
        const empRes = await fetch('/api/lookups/employees', { credentials: 'include' })
        const emp = await empRes.json()
        if (!cancelled) setEmployees(Array.isArray(emp) ? emp : [])

        // Kunden initial (erste Seite) via Lookup-API
        setCustomerSearching(true)
        const custRes = await fetch('/api/lookups/customers?limit=100', { credentials: 'include' })
        const cust = await custRes.json()
        if (!cancelled) setCustomers(Array.isArray(cust) ? cust : [])
      } catch {
        if (!cancelled) {
          setEmployees([])
          setCustomers([])
        }
      } finally {
        if (!cancelled) setCustomerSearching(false)
      }
    })()
    return () => { cancelled = true }
  }, [isOpen])

  /* ------------------ Live-Serversuche (Kunden) ------------------ */
  useEffect(() => {
    if (!isOpen) return

    // debounce 250ms
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(async () => {
      if (searchAbortRef.current) searchAbortRef.current.abort()
      const ctrl = new AbortController()
      searchAbortRef.current = ctrl

      const q = customerQuery.trim()
      const url = q
        ? `/api/lookups/customers?query=${encodeURIComponent(q)}&limit=50`
        : `/api/lookups/customers?limit=100`

      try {
        setCustomerSearching(true)
        const res = await fetch(url, { credentials: 'include', signal: ctrl.signal })
        const data = await res.json()
        setCustomers(Array.isArray(data) ? data : [])
      } catch {
        /* ignore abort/network */
      } finally {
        setCustomerSearching(false)
      }
    }, 250) as unknown as number

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      if (searchAbortRef.current) searchAbortRef.current.abort()
    }
  }, [customerQuery, isOpen])

  /* ------------------ Projekte nach Kunde laden ------------------ */
  useEffect(() => {
    ;(async () => {
      if (!selectedCustomer?.id) {
        setProjects([])
        setSelectedProjectId('')
        return
      }
      setLoadingProjects(true)
      try {
        // bleibt wie gehabt über Supabase; bei Bedarf später als Lookup-API umbauen
        const { data, error } = await supabase
          .from('projects')
          .select('id, title')
          .eq('customer_id', selectedCustomer.id)
          .order('created_at', { ascending: false })
        if (!error) setProjects(data ?? [])
        setSelectedProjectId('') // Reset bei Kundenwechsel
      } finally {
        setLoadingProjects(false)
      }
    })()
  }, [selectedCustomer, supabase])

  /* ------------------ Submit ------------------ */
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer) {
      alert('Bitte einen Kunden auswählen.')
      return
    }

    setSaving(true)
    try {
      // Start (local datetime) -> echte Date
      const local = new Date(start)
      const dtStart = new Date(
        local.getFullYear(), local.getMonth(), local.getDate(),
        local.getHours(), local.getMinutes(), 0, 0
      )
      const dtEnd = new Date(dtStart.getTime() + duration * 60000)
      const isoStart = dtStart.toISOString()
      const isoEnd = dtEnd.toISOString()

      // Titel bestimmen
      const finalTitle = type.key === 'INDIVIDUELL'
        ? (title.trim() || 'Individueller Termin')
        : type.label

      // Kompatibel: Titel → location; Adresse in Notiz anhängen
      const combinedNotes = [hint, address ? `Adresse: ${address}` : ''].filter(Boolean).join('\n')

      const payload: any = {
        location: finalTitle,
        start_time: isoStart,
        end_time: isoEnd,
        notes: combinedNotes,
        customer_id: selectedCustomer.id,
        employee_ids: selectedEmployees.map(e => e.id),
      }
      if (projects.length > 0 && selectedProjectId) payload.project_id = selectedProjectId
      else payload.project_id = null

      const res = await fetch('/api/appointments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setIsOpen(false)
        onSuccess?.()
        // Reset
        setType(APPT_TYPES[0]); setTitle(''); setAddress('')
        setStart(nextHalfHourISO()); setDuration(60); setHint('')
        setSelectedCustomer(null); setProjects([]); setSelectedProjectId(''); setSelectedEmployees([])
      } else {
        const err = await res.json().catch(() => ({}))
        alert('Fehler: ' + (err?.message ?? 'Unbekannter Fehler'))
      }
    } finally {
      setSaving(false)
    }
  }

  /* ------------------ Der UI-Teil ------------------ */
  return (
    <>
      {/* Trigger-Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-white/60 bg-white/80 px-4 py-2 text-sm font-medium text-slate-900 shadow-sm backdrop-blur hover:bg-white"
      >
        <PencilSquareIcon className="h-5 w-5" />
        Neuer Termin
      </button>

      <Transition show={isOpen} as={Fragment}>
        <Dialog onClose={() => setIsOpen(false)} className="relative z-[200]">
          {/* Overlay */}
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />

          {/* Panel */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-2 scale-95"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-2 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-[0_20px_80px_rgba(2,6,23,0.35)] backdrop-blur-xl">
                {/* Header */}
                <div className="relative">
                  <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#1e293b)' }} />
                  <button onClick={() => setIsOpen(false)} className="absolute right-4 top-3 rounded p-1 text-slate-600 hover:bg-white/60" aria-label="Schließen">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                  <Dialog.Title className="px-6 pb-3 pt-4 text-lg font-semibold text-slate-900">Termin erstellen</Dialog.Title>
                </div>

                {/* Body */}
                <form onSubmit={submit} className="grid grid-cols-1 gap-4 px-6 pb-6 md:grid-cols-2">
                  {/* Art */}
                  <label className="col-span-1 md:col-span-2">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Art des Termins</span>
                    <select
                      value={type.key}
                      onChange={(e) => {
                        const t = APPT_TYPES.find(x => x.key === e.target.value) ?? APPT_TYPES[0]
                        setType(t)
                        if (t.key !== 'INDIVIDUELL') setTitle('')
                      }}
                      className="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none backdrop-blur focus:ring-2 focus:ring-slate-200"
                    >
                      {APPT_TYPES.map(t => (
                        <option key={t.key} value={t.key}>{t.label}</option>
                      ))}
                    </select>
                  </label>

                  {/* Freier Titel */}
                  {type.key === 'INDIVIDUELL' && (
                    <label className="col-span-1 md:col-span-2">
                      <span className="mb-1 block text-sm font-medium text-slate-700">Titel</span>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="z. B. Beratung vor Ort"
                        className="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none backdrop-blur focus:ring-2 focus:ring-slate-200"
                      />
                    </label>
                  )}

                  {/* Kunde – Combobox (Server-Live-Suche) */}
                  <div className="col-span-1 md:col-span-2">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Kunde</span>
                    <Combobox value={selectedCustomer} onChange={(val: Person | null) => {
                      setSelectedCustomer(val)
                      // reset projects on change
                      setProjects([])
                      setSelectedProjectId('')
                    }} nullable>
                      <div className="relative">
                        <Combobox.Input
                          className="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none backdrop-blur focus:ring-2 focus:ring-slate-200"
                          displayValue={(p: Person) =>
                            p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() : ''
                          }
                          placeholder="Kunden suchen…"
                          onChange={(e) => setCustomerQuery(e.target.value)}
                        />
                        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                          <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-white/60 bg-white/95 py-1 text-sm shadow-lg backdrop-blur">
                            {customerSearching && (
                              <div className="px-3 py-2 text-slate-500">Suche …</div>
                            )}
                            {!customerSearching && customers.length === 0 && (
                              <div className="px-3 py-2 text-slate-500">Keine Treffer</div>
                            )}
                            {customers.map((c) => (
                              <Combobox.Option
                                key={c.id}
                                value={c}
                                className={({ active }) =>
                                  `cursor-pointer px-3 py-2 ${active ? 'bg-slate-100 text-slate-900' : 'text-slate-700'}`
                                }
                              >
                                <div className="font-medium">
                                  {(c.first_name ?? '') + ' ' + (c.last_name ?? '')}
                                </div>
                                {c.email && <div className="text-xs text-slate-500">{c.email}</div>}
                              </Combobox.Option>
                            ))}
                          </Combobox.Options>
                        </Transition>
                      </div>
                    </Combobox>
                  </div>

                  {/* Projekt – nur wenn vorhanden */}
                  {selectedCustomer && projects.length > 0 && (
                    <div className="col-span-1 md:col-span-2">
                      <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                        <BriefcaseIcon className="h-4 w-4" /> Projekt
                      </span>
                      <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none backdrop-blur focus:ring-2 focus:ring-slate-200"
                      >
                        <option value="">— Kein Projekt auswählen —</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>
                      {loadingProjects && (
                        <div className="mt-1 text-xs text-slate-500">Lade Projekte…</div>
                      )}
                    </div>
                  )}

                  {/* Ort/Adresse */}
                  <label className="col-span-1 md:col-span-2">
                    <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <MapPinIcon className="h-4 w-4" /> Ort / Adresse (optional)
                    </span>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="z. B. Musterstraße 12, Berlin"
                      className="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none backdrop-blur focus:ring-2 focus:ring-slate-200"
                    />
                  </label>

                  {/* Start */}
                  <label>
                    <span className="mb-1 flex items一起 gap-2 text-sm font-medium text-slate-700">
                      <CalendarDaysIcon className="h-4 w-4" /> Startzeit
                    </span>
                    <input
                      type="datetime-local"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      required
                      className="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none backdrop-blur focus:ring-2 focus:ring-slate-200"
                    />
                  </label>

                  {/* Dauer */}
                  <label>
                    <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <ClockIcon className="h-4 w-4" /> Dauer (Minuten)
                    </span>
                    <input
                      type="number"
                      value={duration}
                      min={5}
                      onChange={(e) => setDuration(+e.target.value)}
                      required
                      className="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none backdrop-blur focus:ring-2 focus:ring-slate-200"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[30, 60, 90, 120, 180].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setDuration(m)}
                          className={`rounded-md px-2 py-1 text-xs border ${
                            duration === m
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-white/60 bg-white/80 text-slate-900 hover:bg-white'
                          }`}
                        >
                          {m} min
                        </button>
                      ))}
                    </div>
                  </label>

                  {/* Mitarbeiter – Multi */}
                  <div className="col-span-1 md:col-span-2">
                    <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <UserGroupIcon className="h-4 w-4" /> Mitarbeiter
                    </span>
                    <Listbox value={selectedEmployees} onChange={setSelectedEmployees} multiple>
                      <div className="relative">
                        <Listbox.Button className="inline-flex w-full items-center justify-between rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-left text-sm text-slate-800 outline-none backdrop-blur focus:ring-2 focus:ring-slate-200">
                          <span className="truncate">
                            {selectedEmployees.length === 0
                              ? 'Mitarbeiter wählen…'
                              : `${selectedEmployees.length} ausgewählt`}
                          </span>
                          <ChevronUpDownIcon className="h-4 w-4 text-slate-500" />
                        </Listbox.Button>
                        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                          <Listbox.Options className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-white/60 bg-white/95 py-1 text-sm shadow-lg backdrop-blur">
                            {employees.length === 0 && (
                              <div className="px-3 py-2 text-slate-500">Keine Mitarbeiter</div>
                            )}
                            {employees.map((emp) => (
                              <Listbox.Option
                                key={emp.id}
                                value={emp}
                                className={({ active, selected }) =>
                                  [
                                    'cursor-pointer select-none px-3 py-2 flex items-center gap-2',
                                    active ? 'bg-slate-100 text-slate-900' : 'text-slate-700',
                                    selected ? 'font-medium' : '',
                                  ].join(' ')
                                }
                              >
                                {({ selected }) => (
                                  <>
                                    <span className={`grid h-4 w-4 place-content-center rounded border ${selected ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-300 text-transparent'}`}>
                                      <CheckIcon className="h-3 w-3" />
                                    </span>
                                    <span className="truncate">{empName(emp)}</span>
                                  </>
                                )}
                              </Listbox.Option>
                            ))}
                          </Listbox.Options>
                        </Transition>
                      </div>
                    </Listbox>
                  </div>

                  {/* Hinweis */}
                  <label className="col-span-1 md:col-span-2">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Hinweis</span>
                    <textarea
                      value={hint}
                      onChange={(e) => setHint(e.target.value)}
                      rows={3}
                      placeholder="Details, Ansprechpartner, Besonderheiten …"
                      className="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none backdrop-blur focus:ring-2 focus:ring-slate-200"
                    />
                  </label>

                  {/* Actions */}
                  <div className="col-span-1 md:col-span-2 flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-900 shadow-sm backdrop-blur hover:bg-white"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-95 disabled:opacity-60"
                    >
                      <span className="inline-flex items-center gap-2">
                        <CalendarDaysIcon className="h-5 w-5" />
                        {saving ? 'Speichere …' : 'Speichern'}
                      </span>
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

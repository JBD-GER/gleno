'use client'

import React, {
  useState,
  useEffect,
  Fragment,
  useMemo,
  useRef,
} from 'react'
import { Dialog, Transition, Combobox, Listbox } from '@headlessui/react'
import {
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  XMarkIcon,
  PencilSquareIcon,
  BriefcaseIcon,
  CheckIcon,
  ChevronUpDownIcon,
} from '@heroicons/react/24/outline'
import { supabaseClient } from '@/lib/supabase-client'

type Person = {
  id: string
  first_name: string | null
  last_name?: string | null
  email?: string | null
}
type Project = { id: string; title: string }

type AddAppointmentModalProps = {
  onSuccess?: () => void
  /** kontrolliert von außen (Slot-Klick). Wenn weggelassen -> eigene Steuerung + Trigger-Button */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** vorbelegte Startzeit z. B. vom Kalender-Slot (`YYYY-MM-DDTHH:mm`) */
  initialStart?: string
}

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
  return local.toISOString().slice(0, 16)
}

const empName = (p: Person) =>
  `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Unbenannt'

export default function AddAppointmentModal({
  onSuccess,
  open,
  onOpenChange,
  initialStart,
}: AddAppointmentModalProps) {
  const supabase = supabaseClient()

  const isControlled = typeof open === 'boolean'
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = isControlled ? (open as boolean) : internalOpen

  const setOpen = (val: boolean) => {
    if (!isControlled) setInternalOpen(val)
    onOpenChange?.(val)
  }

  const defaultStart = useMemo(
    () => initialStart ?? nextHalfHourISO(),
    [initialStart],
  )

  const [type, setType] = useState<(typeof APPT_TYPES)[number]>(APPT_TYPES[0])
  const [title, setTitle] = useState('')
  const [address, setAddress] = useState('')
  const [start, setStart] = useState(defaultStart)
  const [duration, setDuration] = useState(60)
  const [hint, setHint] = useState('')

  const [customers, setCustomers] = useState<Person[]>([])
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerSearching, setCustomerSearching] = useState(false)
  const debounceRef = useRef<number | null>(null)

  const [selectedCustomer, setSelectedCustomer] = useState<Person | null>(null)

  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [loadingProjects, setLoadingProjects] = useState(false)

  const [employees, setEmployees] = useState<Person[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<Person[]>([])

  const [saving, setSaving] = useState(false)

  /* wenn initialStart sich ändert (Slot-Klick), Start entsprechend setzen */
  useEffect(() => {
    if (initialStart) setStart(initialStart)
  }, [initialStart])

  /* Stammdaten laden, sobald Modal offen ist */
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    ;(async () => {
      try {
        const empRes = await fetch('/api/lookups/employees', {
          credentials: 'include',
        })
        const emp = await empRes.json()
        if (!cancelled) setEmployees(Array.isArray(emp) ? emp : [])

        setCustomerSearching(true)
        const custRes = await fetch('/api/lookups/customers?limit=100', {
          credentials: 'include',
        })
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
    return () => {
      cancelled = true
    }
  }, [isOpen])

  /* Live-Kundensuche – debounced, ohne AbortError-Fehler */
  useEffect(() => {
    if (!isOpen) return

    if (debounceRef.current) window.clearTimeout(debounceRef.current)

    let cancelled = false
    debounceRef.current = window.setTimeout(async () => {
      const q = customerQuery.trim()
      const url = q
        ? `/api/lookups/customers?query=${encodeURIComponent(q)}&limit=50`
        : `/api/lookups/customers?limit=100`

      try {
        setCustomerSearching(true)
        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setCustomers(Array.isArray(data) ? data : [])
      } catch (e: any) {
        if (!cancelled && e?.name !== 'AbortError') {
          console.error(e)
        }
      } finally {
        if (!cancelled) setCustomerSearching(false)
      }
    }, 250) as unknown as number

    return () => {
      cancelled = true
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [customerQuery, isOpen])

  /* Projekte nach Kunde */
  useEffect(() => {
    ;(async () => {
      if (!selectedCustomer?.id) {
        setProjects([])
        setSelectedProjectId('')
        return
      }
      setLoadingProjects(true)
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, title')
          .eq('customer_id', selectedCustomer.id)
          .order('created_at', { ascending: false })
        if (!error) setProjects(data ?? [])
        setSelectedProjectId('')
      } finally {
        setLoadingProjects(false)
      }
    })()
  }, [selectedCustomer, supabase])

  /* Submit */
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer) {
      alert('Bitte einen Kunden auswählen.')
      return
    }

    setSaving(true)
    try {
      const local = new Date(start)
      const dtStart = new Date(
        local.getFullYear(),
        local.getMonth(),
        local.getDate(),
        local.getHours(),
        local.getMinutes(),
        0,
        0,
      )
      const dtEnd = new Date(dtStart.getTime() + duration * 60000)
      const isoStart = dtStart.toISOString()
      const isoEnd = dtEnd.toISOString()

      const finalTitle =
        type.key === 'INDIVIDUELL'
          ? title.trim() || 'Individueller Termin'
          : type.label

      const combinedNotes = [hint, address ? `Adresse: ${address}` : '']
        .filter(Boolean)
        .join('\n')

      const payload: any = {
        location: finalTitle,
        start_time: isoStart,
        end_time: isoEnd,
        notes: combinedNotes,
        customer_id: selectedCustomer.id,
        employee_ids: selectedEmployees.map((e) => e.id),
      }
      if (projects.length > 0 && selectedProjectId)
        payload.project_id = selectedProjectId
      else payload.project_id = null

      const res = await fetch('/api/appointments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setOpen(false)
        onSuccess?.()
        // Reset
        setType(APPT_TYPES[0])
        setTitle('')
        setAddress('')
        setStart(initialStart ?? nextHalfHourISO())
        setDuration(60)
        setHint('')
        setSelectedCustomer(null)
        setProjects([])
        setSelectedProjectId('')
        setSelectedEmployees([])
      } else {
        const err = await res.json().catch(() => ({}))
        alert('Fehler: ' + (err?.message ?? 'Unbekannter Fehler'))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Trigger-Button nur, wenn nicht kontrolliert */}
      {!isControlled && (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm backdrop-blur hover:bg-slate-50 active:scale-[0.98] transition"
        >
          <PencilSquareIcon className="h-5 w-5" />
          Neuer Termin
        </button>
      )}

      <Transition show={isOpen} as={Fragment}>
        <Dialog onClose={() => setOpen(false)} className="relative z-[200]">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-2 scale-95"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-2 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/70 bg-white/92 shadow-[0_20px_70px_rgba(15,23,42,0.35)] backdrop-blur-xl">
                {/* Top-Bar */}
                <div className="relative">
                  <div
                    className="h-1.5 w-full"
                    style={{
                      background: 'linear-gradient(90deg,#0f172a,#1e293b)',
                    }}
                  />
                  <button
                    onClick={() => setOpen(false)}
                    className="absolute right-4 top-3 rounded-full p-1 text-slate-600 hover:bg-slate-100"
                    aria-label="Schließen"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                  <Dialog.Title className="px-6 pb-1 pt-4 text-lg font-semibold text-slate-900">
                    Termin erstellen
                  </Dialog.Title>
                  <p className="px-6 pb-3 text-xs text-slate-500">
                    Wählen Sie Art, Kunde, Mitarbeiter und Dauer – alles in einem
                    schlanken Flow.
                  </p>
                </div>

                <form
                  onSubmit={submit}
                  className="grid grid-cols-1 gap-4 px-6 pb-6 md:grid-cols-2"
                >
                  {/* Art */}
                  <label className="col-span-1 md:col-span-2">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Art des Termins
                    </span>
                    <select
                      value={type.key}
                      onChange={(e) => {
                        const t =
                          APPT_TYPES.find(
                            (x) => x.key === e.target.value,
                          ) ?? APPT_TYPES[0]
                        setType(t)
                        if (t.key !== 'INDIVIDUELL') setTitle('')
                      }}
                      className="w-full rounded-xl border border-slate-100 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none backdrop-blur focus:ring-2 focus:ring-slate-200"
                    >
                      {APPT_TYPES.map((t) => (
                        <option key={t.key} value={t.key}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Freier Titel */}
                  {type.key === 'INDIVIDUELL' && (
                    <label className="col-span-1 md:col-span-2">
                      <span className="mb-1 block text-sm font-medium text-slate-700">
                        Titel
                      </span>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="z. B. Beratung vor Ort"
                        className="w-full rounded-xl border border-slate-100 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none backdrop-blur focus:ring-2 focus:ring-slate-200"
                      />
                    </label>
                  )}

                  {/* Kunde */}
                  <div className="col-span-1 md:col-span-2">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Kunde
                    </span>
                    <Combobox
                      value={selectedCustomer}
                      onChange={(val: Person | null) => {
                        setSelectedCustomer(val)
                        setProjects([])
                        setSelectedProjectId('')
                      }}
                      nullable
                    >
                      <div className="relative">
                        <Combobox.Input
                          className="w-full rounded-xl border border-slate-100 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none backdrop-blur focus:ring-2 focus:ring-slate-200"
                          displayValue={(p: Person) =>
                            p
                              ? `${p.first_name ?? ''} ${
                                  p.last_name ?? ''
                                }`.trim()
                              : ''
                          }
                          placeholder="Kunden suchen…"
                          onChange={(e) =>
                            setCustomerQuery(e.target.value)
                          }
                        />
                        <Transition
                          as={Fragment}
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                        >
                          <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-100 bg-white/98 py-1 text-sm shadow-lg backdrop-blur">
                            {customerSearching && (
                              <div className="px-3 py-2 text-slate-500">
                                Suche …
                              </div>
                            )}
                            {!customerSearching &&
                              customers.length === 0 && (
                                <div className="px-3 py-2 text-slate-500">
                                  Keine Treffer
                                </div>
                              )}
                            {customers.map((c) => (
                              <Combobox.Option
                                key={c.id}
                                value={c}
                                className={({ active }) =>
                                  `cursor-pointer px-3 py-2 ${
                                    active
                                      ? 'bg-slate-100 text-slate-900'
                                      : 'text-slate-700'
                                  }`
                                }
                              >
                                <div className="font-medium">
                                  {(c.first_name ?? '') +
                                    ' ' +
                                    (c.last_name ?? '')}
                                </div>
                                {c.email && (
                                  <div className="text-xs text-slate-500">
                                    {c.email}
                                  </div>
                                )}
                              </Combobox.Option>
                            ))}
                          </Combobox.Options>
                        </Transition>
                      </div>
                    </Combobox>
                  </div>

                  {/* Projekt */}
                  {selectedCustomer && projects.length > 0 && (
                    <div className="col-span-1 md:col-span-2">
                      <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                        <BriefcaseIcon className="h-4 w-4" /> Projekt
                      </span>
                      <select
                        value={selectedProjectId}
                        onChange={(e) =>
                          setSelectedProjectId(e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-100 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none backdrop-blur focus:ring-2 focus:ring-slate-200"
                      >
                        <option value="">— Kein Projekt auswählen —</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                      {loadingProjects && (
                        <div className="mt-1 text-xs text-slate-500">
                          Lade Projekte…
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ort/Adresse */}
                  <label className="col-span-1 md:col-span-2">
                    <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <MapPinIcon className="h-4 w-4" /> Ort / Adresse
                      (optional)
                    </span>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="z. B. Musterstraße 12, Berlin"
                      className="w-full rounded-xl border border-slate-100 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none backdrop-blur focus:ring-2 focus:ring-slate-200"
                    />
                  </label>

                  {/* Startzeit + Mitarbeiter in EINER Zeile (auf Desktop) */}
                  <div className="col-span-1 md:col-span-2 grid gap-4 md:grid-cols-2">
                    {/* Start */}
                    <label>
                      <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                        <CalendarDaysIcon className="h-4 w-4" /> Startzeit
                      </span>
                      <input
                        type="datetime-local"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-100 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none backdrop-blur focus:ring-2 focus:ring-slate-200"
                      />
                    </label>

                    {/* Mitarbeiter */}
                    <div>
                      <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                        <UserGroupIcon className="h-4 w-4" /> Mitarbeiter
                      </span>
                      <Listbox
                        value={selectedEmployees}
                        onChange={setSelectedEmployees}
                        multiple
                      >
                        <div className="relative">
                          <Listbox.Button className="inline-flex w-full items-center justify-between rounded-xl border border-slate-100 bg-white/80 px-3 py-2 text-left text-sm text-slate-800 outline-none backdrop-blur focus:ring-2 focus:ring-slate-200">
                            <span className="truncate">
                              {selectedEmployees.length === 0
                                ? 'Mitarbeiter wählen…'
                                : `${selectedEmployees.length} ausgewählt`}
                            </span>
                            <ChevronUpDownIcon className="h-4 w-4 text-slate-500" />
                          </Listbox.Button>
                          <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                          >
                            <Listbox.Options className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-100 bg-white/98 py-1 text-sm shadow-lg backdrop-blur">
                              {employees.length === 0 && (
                                <div className="px-3 py-2 text-slate-500">
                                  Keine Mitarbeiter
                                </div>
                              )}
                              {employees.map((emp) => (
                                <Listbox.Option
                                  key={emp.id}
                                  value={emp}
                                  className={({ active, selected }) =>
                                    [
                                      'flex cursor-pointer select-none items-center gap-2 px-3 py-2',
                                      active
                                        ? 'bg-slate-100 text-slate-900'
                                        : 'text-slate-700',
                                      selected ? 'font-medium' : '',
                                    ].join(' ')
                                  }
                                >
                                  {({ selected }) => (
                                    <>
                                      <span
                                        className={`grid h-4 w-4 place-content-center rounded border ${
                                          selected
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-300 text-transparent'
                                        }`}
                                      >
                                        <CheckIcon className="h-3 w-3" />
                                      </span>
                                      <span className="truncate">
                                        {empName(emp)}
                                      </span>
                                    </>
                                  )}
                                </Listbox.Option>
                              ))}
                            </Listbox.Options>
                          </Transition>
                        </div>
                      </Listbox>
                    </div>
                  </div>

                  {/* Dauer – JETZT GANZZEILIG */}
                  <label className="col-span-1 md:col-span-2">
                    <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <ClockIcon className="h-4 w-4" /> Dauer
                    </span>
                    <div className="rounded-xl border border-slate-100 bg-white/70 p-1 backdrop-blur">
                      <div className="grid grid-cols-5 gap-1">
                        {[30, 60, 90, 120, 180].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setDuration(m)}
                            className={[
                              'rounded-lg px-2 py-1 text-xs font-medium transition',
                              duration === m
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'bg-white/60 text-slate-800 hover:bg-white',
                            ].join(' ')}
                          >
                            {m} min
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="number"
                      value={duration}
                      min={5}
                      onChange={(e) => setDuration(+e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-100 bg-white/80 px-3 py-2 text-xs text-slate-900 outline-none backdrop-blur focus:ring-2 focus:ring-slate-200"
                    />
                    <p className="mt-1 text-[10px] text-slate-500">
                      Schnell eine Dauer anklicken oder individuell in Minuten anpassen.
                    </p>
                  </label>

                  {/* Hinweis */}
                  <label className="col-span-1 md:col-span-2">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Hinweis
                    </span>
                    <textarea
                      value={hint}
                      onChange={(e) => setHint(e.target.value)}
                      rows={3}
                      placeholder="Details, Ansprechpartner, Besonderheiten …"
                      className="w-full rounded-xl border border-slate-100 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none backdrop-blur focus:ring-2 focus:ring-slate-200"
                    />
                  </label>

                  {/* Actions */}
                  <div className="col-span-1 flex items-center justify-end gap-2 pt-1 md:col-span-2">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-xl border border-slate-100 bg-white/80 px-3 py-2 text-sm text-slate-900 shadow-sm backdrop-blur hover:bg-white"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-95 disabled:opacity-60"
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

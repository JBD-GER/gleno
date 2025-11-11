'use client'

import React, { useEffect, useState, type ComponentType, type SVGProps } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import {
  XMarkIcon,
  PlusIcon,
  MinusIcon,
  ChevronDownIcon,
  ClipboardDocumentListIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline'

/* ======================= Types ======================= */
interface Customer { id: string; first_name: string; last_name: string }
interface Offer { id: string; offer_number: string }
interface Material { id: string; name: string; unit: string }
interface Employee { id: string; first_name: string | null; last_name: string | null }

type RoomState = {
  name: string
  width?: number | null
  length?: number | null
  notes?: string
  tasks: { work: string; description?: string }[]
  materials: { material_id: string; quantity: number; notes?: string }[]
}

/* ======================= UI-Helper ======================= */

function OfferChip({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition',
        'border backdrop-blur shadow-sm',
        active
          ? 'border-slate-900/10 bg-slate-900/90 text-white hover:bg-slate-900'
          : 'border-slate-200/80 bg-white/95 text-slate-900 hover:bg-white',
        'focus:outline-none focus:ring-4 focus:ring-indigo-200/60',
      ].join(' ')}
      aria-pressed={active}
    >
      <span className="tabular-nums">{label}</span>
      <span
        className={[
          'h-1.5 w-1.5 rounded-full transition',
          active ? 'bg-white' : 'bg-slate-300 group-hover:bg-slate-400',
        ].join(' ')}
      />
    </button>
  )
}

type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>
function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: HeroIcon
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200/70 bg-white/85 p-4 backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-lg bg-white/90 p-2 ring-1 ring-inset ring-slate-200/70 shadow">
          <Icon className="h-5 w-5 text-slate-900" />
        </div>
        <h3 className="text-sm font-medium text-slate-900">{title}</h3>
      </div>
      {children}
    </section>
  )
}

/* ======================= Hauptkomponente ======================= */

export default function ProjectForm({
  projectId,
  onClose,
}: {
  projectId: string | null
  onClose: () => void
}) {
  const supa = supabaseClient()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [offers,   setOffers]    = useState<Offer[]>([])
  const [materials, setMaterials]= useState<Material[]>([])
  const [employees, setEmployees]= useState<Employee[]>([])

  const [customerId, setCustomerId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [objectName, setObjectName] = useState('')
  const [floor, setFloor] = useState('')

  const [offerIds, setOfferIds] = useState<string[]>([])
  const [offerQuery, setOfferQuery] = useState('')

  // Mitarbeiter-Zuweisung
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [employeeQuery, setEmployeeQuery] = useState('')

  const [rooms, setRooms] = useState<RoomState[]>([])
  const [loading, setLoading] = useState(false)

  // Hilf: dedupe array of strings
  const dedupe = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)))

  // Stammdaten laden (inkl. Company-Auflösung und gefilterten Mitarbeitern)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        // 1) User ermitteln
        const { data: { user } } = await supa.auth.getUser()
        if (!user) throw new Error('no user')

        // 2) Prüfen, ob User Mitarbeiter ist -> companyId = employees.user_id
        const { data: empRec } = await supa
          .from('employees')
          .select('id, user_id')
          .eq('auth_user_id', user.id)
          .maybeSingle()

        const companyId = empRec?.user_id ?? user.id

        // 3) Stammdaten + gefilterte Mitarbeiter laden
        const [{ data: custs }, { data: mats }, { data: emps }] = await Promise.all([
          supa.from('customers').select('id, first_name, last_name'),
          supa.from('materials').select('id, name, unit'),
          supa.from('employees')
              .select('id, first_name, last_name')
              .eq('user_id', companyId)                    // **nur Mitarbeiter der Firma**
              .order('first_name', { ascending: true }),
        ])
        if (!alive) return
        setCustomers((custs as any) ?? [])
        setMaterials((mats as any) ?? [])
        setEmployees((emps as any) ?? [])
      } catch {
        if (!alive) return
        setCustomers([]); setMaterials([]); setEmployees([])
      }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Angebote zum Kunden laden
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!customerId) { setOffers([]); setOfferIds([]); return }
      try {
        const { data } = await supa.from('offers').select('id, offer_number').eq('customer_id', customerId)
        if (!alive) return
        setOffers((data as any) ?? [])
        setOfferIds([]) // reset Auswahl beim Kundenwechsel
        setOfferQuery('')
      } catch {
        if (!alive) return
        setOffers([]); setOfferIds([]); setOfferQuery('')
      }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  // Edit: Projekt laden inkl. Assignees & Räume
  useEffect(() => {
    if (!projectId) return
    let alive = true
    ;(async () => {
      try {
        const { data } = await supa
          .from('projects')
          .select(`
            id, customer_id, title, description, address, object_name, floor,
            project_offers ( offer_id ),
            project_rooms (
              id, name, width, length, notes,
              project_room_tasks ( work, description ),
              project_room_materials ( material_id, quantity, notes )
            ),
            assignees:project_assignees ( employee_id )
          `)
          .eq('id', projectId)
          .single()

        if (!alive || !data) return

        setCustomerId(data.customer_id)
        setTitle(data.title)
        setDescription(data.description ?? '')
        setAddress(data.address ?? '')
        setObjectName(data.object_name ?? '')
        setFloor(data.floor ?? '')
        setOfferIds((data.project_offers ?? []).map((x: any) => x.offer_id))

        // **dedupe** (falls Altbestände doppelte assignees liefern)
        setAssigneeIds(dedupe((data.assignees ?? []).map((x: any) => x.employee_id)))

        setRooms((data.project_rooms ?? []).map((r: any) => ({
          name: r.name,
          width: r.width ?? null,
          length: r.length ?? null,
          notes: r.notes ?? '',
          tasks: (r.project_room_tasks ?? []).map((t: any) => ({ work: t.work, description: t.description ?? '' })),
          materials: (r.project_room_materials ?? []).map((m: any) => ({ material_id: m.material_id, quantity: m.quantity, notes: m.notes ?? '' })),
        })))
      } catch {
        /* noop */
      }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerId || !title) { alert('Bitte Kunde und Titel angeben.'); return }
    setLoading(true)

    // **Assignees dedupen** bevor es zur API geht
    const cleanAssignees = dedupe(assigneeIds)

    const payload = {
      customer_id: customerId,
      title,
      description,
      address,
      object_name: objectName,
      floor,
      offer_ids: offerIds,
      assignee_ids: cleanAssignees,
      rooms,
    }

    try {
      const res = await fetch(projectId ? `/api/projects/${projectId}` : '/api/projects', {
        method: projectId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? res.statusText)
      }
      onClose()
    } catch (err: any) {
      alert(`Speichern fehlgeschlagen: ${err?.message ?? 'Unbekannter Fehler'}`)
      setLoading(false)
    }
  }

  // shared styles
  const inputBase =
    'w-full rounded-lg border bg-white/95 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-4 transition'
  const inputCls =
    `${inputBase} border-slate-200/80 placeholder-slate-400 focus:border-slate-300 ring-indigo-200/60`
  const subtleBtn =
    'inline-flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white/95 px-3 py-2 text-sm text-slate-900 shadow-sm hover:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-200/60'

  const initials = (e: Employee) =>
    `${(e.first_name ?? '').trim()[0] ?? ''}${(e.last_name ?? '').trim()[0] ?? ''}`.toUpperCase()

  const toggleAssignee = (id: string) =>
    setAssigneeIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      return dedupe(next)
    })

  const filteredEmployees = employees.filter(e =>
    `${e.first_name ?? ''} ${e.last_name ?? ''}`.toLowerCase().includes(employeeQuery.trim().toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 md:p-6 backdrop-blur">
      <form
        onSubmit={onSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA') {
            e.preventDefault()
          }
        }}
        className="w-full max-w-[1000px] max-h-[92vh] overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 shadow-[0_20px_80px_rgba(2,6,23,0.35)] backdrop-blur-xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/85 px-4 py-4 sm:px-6 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-medium text-slate-900">
              {projectId ? 'Projekt bearbeiten' : 'Neues Projekt'}
            </h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className={subtleBtn}>Abbrechen</button>
              <button type="submit" disabled={loading} className={`${subtleBtn} font-medium disabled:opacity-60`}>
                {loading ? 'Speichert…' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[72vh] overflow-auto px-4 py-5 sm:px-6 space-y-6">
          {/* Allgemein */}
          <Section title="Allgemein" icon={ClipboardDocumentListIcon}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-6">
                <label className="mb-1 block text-xs font-medium text-slate-600">Titel</label>
                <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required autoComplete="off" />
              </div>

              <div className="md:col-span-3">
                <label className="mb-1 block text-xs font-medium text-slate-600">Objekt</label>
                <input className={inputCls} value={objectName} onChange={(e) => setObjectName(e.target.value)} autoComplete="off" />
              </div>

              <div className="md:col-span-3">
                <label className="mb-1 block text-xs font-medium text-slate-600">Etage</label>
                <input className={inputCls} value={floor} onChange={(e) => setFloor(e.target.value)} autoComplete="off" />
              </div>

              <div className="md:col-span-12">
                <label className="mb-1 block text-xs font-medium text-slate-600">Adresse</label>
                <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="off" />
              </div>

              <div className="md:col-span-12">
                <label className="mb-1 block text-xs font-medium text-slate-600">Beschreibung</label>
                <textarea className={inputCls} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <div className="md:col-span-6">
                <label className="mb-1 block text-xs font-medium text-slate-600">Kunde</label>
                <div className="relative">
                  <select
                    className={`${inputCls} appearance-none pr-9`}
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    required
                  >
                    <option value="">— auswählen —</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>
          </Section>

          {/* Mitarbeiter zuweisen */}
          <Section title="Mitarbeiter zuweisen" icon={BuildingOffice2Icon}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-8">
                <label className="mb-1 block text-xs font-medium text-slate-600">Mitarbeiter</label>

                {/* Suche */}
                <div className="mb-2 flex items-center gap-2">
                  <input
                    value={employeeQuery}
                    onChange={(e) => setEmployeeQuery(e.target.value)}
                    placeholder="Nach Name suchen…"
                    className="w-full rounded-lg border border-slate-200/80 bg-white/95 px-3 py-2 text-sm text-slate-900 outline-none placeholder-slate-400 focus:border-slate-300 focus:ring-4 ring-indigo-200/60 transition"
                    autoComplete="off"
                  />
                  <div className="text-xs text-slate-500 whitespace-nowrap">
                    {assigneeIds.length} ausgewählt
                  </div>
                </div>

                {/* Chips */}
                <div className="flex flex-wrap gap-2">
                  {filteredEmployees.map((e) => {
                    const active = assigneeIds.includes(e.id)
                    const label = `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim() || 'Unbenannt'
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => toggleAssignee(e.id)}
                        className={[
                          'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition border backdrop-blur shadow-sm',
                          active ? 'border-slate-900/10 bg-slate-900/90 text-white hover:bg-slate-900'
                                 : 'border-slate-200/80 bg-white/95 text-slate-900 hover:bg-white',
                          'focus:outline-none focus:ring-4 focus:ring-indigo-200/60',
                        ].join(' ')}
                      >
                        <span className="font-medium">{label}</span>
                        <span className={['h-5 w-5 grid place-content-center rounded-full text-[11px] font-semibold',
                          active ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-700'].join(' ')}>
                          {initials(e)}
                        </span>
                      </button>
                    )
                  })}
                  {employees.length === 0 && (
                    <span className="text-sm text-slate-500">Keine Mitarbeiter gefunden.</span>
                  )}
                </div>

                {/* Aktionen */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={subtleBtn}
                    onClick={() => setAssigneeIds(dedupe(employees.map(e => e.id)))}
                    disabled={employees.length === 0}
                  >
                    Alle auswählen
                  </button>
                  <button
                    type="button"
                    className={subtleBtn}
                    onClick={() => setAssigneeIds([])}
                    disabled={assigneeIds.length === 0}
                  >
                    Keine
                  </button>
                </div>
              </div>

              <div className="md:col-span-4">
                <div className="rounded-xl border border-slate-200/70 bg-white/85 p-3 text-xs text-slate-600 backdrop-blur">
                  Zugewiesene Mitarbeiter sehen das Projekt in ihrer Übersicht.  
                  Sie können kommentieren sowie Dokumente und Vorher/Nachher-Bilder hochladen, aber keine Stammdaten ändern.
                </div>
              </div>
            </div>
          </Section>

          {/* Angebote (optional) */}
          <Section title="Angebote (optional)" icon={BuildingOffice2Icon}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-8">
                <label className="mb-1 block text-xs font-medium text-slate-600">Angebote auswählen</label>

                {/* Suche */}
                <div className="mb-2 flex items-center gap-2">
                  <input
                    value={offerQuery}
                    onChange={(e) => setOfferQuery(e.target.value)}
                    placeholder="Nach Angebotsnummer suchen…"
                    className="w-full rounded-lg border border-slate-200/80 bg-white/95 px-3 py-2 text-sm text-slate-900 outline-none placeholder-slate-400 focus:border-slate-300 focus:ring-4 ring-indigo-200/60 transition"
                    autoComplete="off"
                  />
                  <div className="text-xs text-slate-500 whitespace-nowrap">{offerIds.length} ausgewählt</div>
                </div>

                {/* Chips */}
                <div className="flex flex-wrap gap-2">
                  {offers
                    .filter((o) => o.offer_number?.toLowerCase().includes(offerQuery.trim().toLowerCase()))
                    .map((o) => {
                      const active = offerIds.includes(o.id)
                      return (
                        <OfferChip
                          key={o.id}
                          active={active}
                          label={o.offer_number}
                          onClick={() => {
                            setOfferIds((prev) =>
                              prev.includes(o.id) ? prev.filter((id) => id !== o.id) : [...prev, o.id]
                            )
                          }}
                        />
                      )
                    })}
                  {offers.length === 0 && (
                    <span className="text-sm text-slate-500">Keine Angebote vorhanden (Kunde wählen?).</span>
                  )}
                </div>

                {/* Aktionen */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" className={subtleBtn} onClick={() => setOfferIds(offers.map((o) => o.id))} disabled={offers.length === 0}>
                    Alle auswählen
                  </button>
                  <button type="button" className={subtleBtn} onClick={() => setOfferIds([])} disabled={offerIds.length === 0}>
                    Keine
                  </button>
                </div>
              </div>

              <div className="md:col-span-4">
                <div className="rounded-xl border border-slate-200/70 bg-white/85 p-3 text-xs text-slate-600 backdrop-blur">
                  Mehrfachauswahl möglich. Die gewählten Angebote werden mit dem Projekt verknüpft.
                </div>
              </div>
            </div>
          </Section>

          {/* Räume */}
          <Section title="Räume" icon={BuildingOffice2Icon}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs text-slate-600">Lege einen oder mehrere Räume mit Arbeiten & Materialien an.</p>
              <button
                type="button"
                className={subtleBtn}
                onClick={() => setRooms((prev) => [...prev, { name: '', width: null, length: null, notes: '', tasks: [], materials: [] }])}
              >
                <PlusIcon className="h-4 w-4" /> Raum hinzufügen
              </button>
            </div>

            <div className="space-y-4">
              {rooms.map((r, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200/70 bg-white/85 p-4 backdrop-blur space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                    <div className="md:col-span-6">
                      <label className="mb-1 block text-xs font-medium text-slate-600">Raumname</label>
                      <input
                        className={inputCls}
                        value={r.name}
                        onChange={(e) => {
                          setRooms((prev) => {
                            const arr = [...prev]; arr[idx] = { ...arr[idx], name: e.target.value }; return arr
                          })
                        }}
                        autoComplete="off"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="mb-1 block text-xs font-medium text-slate-600">Breite (m)</label>
                      <input
                        type="number"
                        step="0.01"
                        className={inputCls}
                        value={r.width ?? ''}
                        onChange={(e) => {
                          setRooms((prev) => {
                            const arr = [...prev]; arr[idx] = { ...arr[idx], width: e.target.value ? parseFloat(e.target.value) : null }; return arr
                          })
                        }}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="mb-1 block text-xs font-medium text-slate-600">Länge (m)</label>
                      <input
                        type="number"
                        step="0.01"
                        className={inputCls}
                        value={r.length ?? ''}
                        onChange={(e) => {
                          setRooms((prev) => {
                            const arr = [...prev]; arr[idx] = { ...arr[idx], length: e.target.value ? parseFloat(e.target.value) : null }; return arr
                          })
                        }}
                      />
                    </div>

                    <div className="md:col-span-12">
                      <label className="mb-1 block text-xs font-medium text-slate-600">Notizen</label>
                      <textarea
                        className={inputCls}
                        rows={2}
                        value={r.notes ?? ''}
                        onChange={(e) => {
                          setRooms((prev) => {
                            const arr = [...prev]; arr[idx] = { ...arr[idx], notes: e.target.value }; return arr
                          })
                        }}
                      />
                    </div>
                  </div>

                  {/* Arbeiten */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-slate-900">Arbeiten</div>
                    {r.tasks.map((t, i2) => (
                      <div key={i2} className="grid grid-cols-1 gap-2 md:grid-cols-12">
                        <div className="md:col-span-4">
                          <input
                            className={inputCls}
                            placeholder="Arbeit"
                            value={t.work}
                            onChange={(e) => {
                              setRooms((prev) => {
                                const arr = [...prev]; const tasks = [...arr[idx].tasks]; tasks[i2] = { ...tasks[i2], work: e.target.value }; arr[idx] = { ...arr[idx], tasks }; return arr
                              })
                            }}
                            autoComplete="off"
                          />
                        </div>
                        <div className="md:col-span-7">
                          <input
                            className={inputCls}
                            placeholder="Beschreibung"
                            value={t.description ?? ''}
                            onChange={(e) => {
                              setRooms((prev) => {
                                const arr = [...prev]; const tasks = [...arr[idx].tasks]; tasks[i2] = { ...tasks[i2], description: e.target.value }; arr[idx] = { ...arr[idx], tasks }; return arr
                              })
                            }}
                            autoComplete="off"
                          />
                        </div>
                        <div className="md:col-span-1">
                          <button
                            type="button"
                            className="w-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100 focus:outline-none focus:ring-4 focus:ring-rose-200/60"
                            onClick={() => {
                              setRooms((prev) => {
                                const arr = [...prev]; arr[idx] = { ...arr[idx], tasks: arr[idx].tasks.filter((_, j) => j !== i2) }; return arr
                              })
                            }}
                          >
                            <MinusIcon className="mx-auto h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className={subtleBtn}
                      onClick={() => {
                        setRooms((prev) => {
                          const arr = [...prev]; arr[idx] = { ...arr[idx], tasks: [...arr[idx].tasks, { work: '', description: '' }] }; return arr
                        })
                      }}
                    >
                      <PlusIcon className="h-4 w-4" /> Arbeit hinzufügen
                    </button>
                  </div>

                  {/* Materialien */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-slate-900">Materialien</div>
                    {r.materials.map((m, i3) => (
                      <div key={i3} className="grid grid-cols-1 items-center gap-2 md:grid-cols-12">
                        <div className="md:col-span-5">
                          <select
                            className={inputCls}
                            value={m.material_id}
                            onChange={(e) => {
                              setRooms((prev) => {
                                const arr = [...prev]; const mats = [...arr[idx].materials]; mats[i3] = { ...mats[i3], material_id: e.target.value }; arr[idx] = { ...arr[idx], materials: mats }; return arr
                              })
                            }}
                          >
                            <option value="">— Material —</option>
                            {materials.map((mat) => (
                              <option key={mat.id} value={mat.id}>{mat.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <input
                            type="number"
                            step="0.01"
                            className={inputCls}
                            placeholder="Menge"
                            value={m.quantity}
                            onChange={(e) => {
                              setRooms((prev) => {
                                const arr = [...prev]; const mats = [...arr[idx].materials]; mats[i3] = { ...mats[i3], quantity: Number(e.target.value || 0) }; arr[idx] = { ...arr[idx], materials: mats }; return arr
                              })
                            }}
                          />
                        </div>
                        <div className="md:col-span-4">
                          <input
                            className={inputCls}
                            placeholder="Notiz"
                            value={m.notes ?? ''}
                            onChange={(e) => {
                              setRooms((prev) => {
                                const arr = [...prev]; const mats = [...arr[idx].materials]; mats[i3] = { ...mats[i3], notes: e.target.value }; arr[idx] = { ...arr[idx], materials: mats }; return arr
                              })
                            }}
                            autoComplete="off"
                          />
                        </div>
                        <div className="md:col-span-1">
                          <button
                            type="button"
                            className="w-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100 focus:outline-none focus:ring-4 focus:ring-rose-200/60"
                            onClick={() => {
                              setRooms((prev) => {
                                const arr = [...prev]; arr[idx] = { ...arr[idx], materials: arr[idx].materials.filter((_, j) => j !== i3) }; return arr
                              })
                            }}
                          >
                            <MinusIcon className="mx-auto h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className={subtleBtn}
                      onClick={() => {
                        setRooms((prev) => {
                          const arr = [...prev]; arr[idx] = { ...arr[idx], materials: [...arr[idx].materials, { material_id: '', quantity: 0, notes: '' }] }; return arr
                        })
                      }}
                    >
                      <PlusIcon className="h-4 w-4" /> Material hinzufügen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </form>

      {/* Close-Hitbox */}
      <button
        type="button"
        aria-label="Schließen"
        className="absolute right-4 top-4 grid h-10 w-10 place-content-center rounded-full border border-slate-200/80 bg-white/95 shadow backdrop-blur hover:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-200/60"
        onClick={onClose}
      >
        <XMarkIcon className="h-5 w-5 text-slate-900" />
      </button>
    </div>
  )
}

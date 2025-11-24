'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  KeyIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'

type FleetItem = {
  id: string
  license_plate: string
  vehicle_type: string
  brand: string | null
  model: string | null
  build_year: number | null
  color: string | null
  mileage_km: number | null
  fuel_type: string
  status: string
  key_location: string | null
  parking_location: string | null
  insurance_provider: string | null
  inspection_due_date: string | null
  notes: string | null
  created_at?: string
  updated_at?: string
}

const VEHICLE_TYPES = ['PKW', 'Transporter', 'LKW', 'Anhänger', 'Sonstiges'] as const
const FUEL_TYPES = ['Benzin', 'Diesel', 'Elektro', 'Hybrid', 'Gas'] as const
const STATUSES = ['Verfügbar', 'In Nutzung', 'Werkstatt', 'Reserviert', 'Außer Betrieb'] as const

type VehicleType = (typeof VEHICLE_TYPES)[number]
type FuelType = (typeof FUEL_TYPES)[number]
type StatusType = (typeof STATUSES)[number]
type SortKey = 'az' | 'za' | 'new' | 'old'

type FleetForm = {
  license_plate: string
  vehicle_type: VehicleType
  brand: string
  model: string
  build_year: string
  color: string
  mileage_km: string
  fuel_type: FuelType
  status: StatusType
  key_location: string
  parking_location: string
  insurance_provider: string
  inspection_due_date: string
  notes: string
}

export default function FleetManager() {
  const [items, setItems] = useState<FleetItem[]>([])
  const [loading, setLoading] = useState(true)

  // Modal
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FleetItem | null>(null)

  // Suche + Sort
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('az')

  // Form
  const [form, setForm] = useState<FleetForm>({
    license_plate: '',
    vehicle_type: 'PKW',
    brand: '',
    model: '',
    build_year: '',
    color: '',
    mileage_km: '',
    fuel_type: 'Benzin',
    status: 'Verfügbar',
    key_location: '',
    parking_location: '',
    insurance_provider: '',
    inspection_due_date: '',
    notes: '',
  })
  const isEdit = !!editing

  async function load() {
    setLoading(true)
    const res = await fetch('/api/fleet', { cache: 'no-store' })
    const data = await res.json()
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setEditing(null)
    setForm({
      license_plate: '',
      vehicle_type: 'PKW',
      brand: '',
      model: '',
      build_year: '',
      color: '',
      mileage_km: '',
      fuel_type: 'Benzin',
      status: 'Verfügbar',
      key_location: '',
      parking_location: '',
      insurance_provider: '',
      inspection_due_date: '',
      notes: '',
    })
    setOpen(true)
  }

  function openEdit(v: FleetItem) {
    setEditing(v)
    setForm({
      license_plate: v.license_plate ?? '',
      vehicle_type: (v.vehicle_type as VehicleType) ?? 'PKW',
      brand: v.brand ?? '',
      model: v.model ?? '',
      build_year: v.build_year ? String(v.build_year) : '',
      color: v.color ?? '',
      mileage_km: v.mileage_km ? String(v.mileage_km) : '',
      fuel_type: (v.fuel_type as FuelType) ?? 'Benzin',
      status: (v.status as StatusType) ?? 'Verfügbar',
      key_location: v.key_location ?? '',
      parking_location: v.parking_location ?? '',
      insurance_provider: v.insurance_provider ?? '',
      inspection_due_date: v.inspection_due_date ?? '',
      notes: v.notes ?? '',
    })
    setOpen(true)
  }

  async function onDelete(id: string) {
    if (!confirm('Fahrzeug wirklich löschen?')) return
    const res = await fetch(`/api/fleet/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      alert(j?.error ?? 'Fehler beim Löschen')
      return
    }
    await load()
    if (editing?.id === id) setEditing(null)
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.license_plate.trim()) {
      alert('Kennzeichen ist erforderlich.')
      return
    }
    const payload = {
      ...form,
      build_year: form.build_year ? Number(form.build_year) : null,
      mileage_km: form.mileage_km ? Number(form.mileage_km) : null,
      inspection_due_date: form.inspection_due_date || null,
      brand: form.brand || null,
      model: form.model || null,
      color: form.color || null,
      key_location: form.key_location || null,
      parking_location: form.parking_location || null,
      insurance_provider: form.insurance_provider || null,
      notes: form.notes || null,
    }

    const method = isEdit ? 'PUT' : 'POST'
    const url = isEdit ? `/api/fleet/${editing?.id}` : '/api/fleet'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      alert(j?.error ?? 'Fehler beim Speichern')
      return
    }
    await load()
    setOpen(false)
    setEditing(null)
  }

  // Filter/Sort
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = items.filter(
      (v) =>
        !q ||
        [
          v.license_plate,
          v.brand,
          v.model,
          v.vehicle_type,
          v.key_location,
          v.parking_location,
        ]
          .filter(Boolean)
          .some((x) => String(x).toLowerCase().includes(q)),
    )
    list = list.sort((a, b) => {
      if (sort === 'new')
        return (
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime()
        )
      if (sort === 'old')
        return (
          new Date(a.created_at ?? 0).getTime() -
          new Date(b.created_at ?? 0).getTime()
        )
      if (sort === 'az')
        return a.license_plate.localeCompare(b.license_plate, 'de', {
          sensitivity: 'base',
        })
      return b.license_plate.localeCompare(a.license_plate, 'de', {
        sensitivity: 'base',
      })
    })
    return list
  }, [items, query, sort])

  // Styles
  const btnWhite =
    'inline-flex items-center gap-2 rounded-lg border border-white/60 bg-white/80 px-4 py-2 text-sm font-medium text-slate-900 shadow-sm backdrop-blur hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200'
  const input =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100'

  return (
    <div className="space-y-5">
      {/* Toolbar – weiße Glasbox */}
      <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/85 shadow-[0_10px_30px_rgba(2,6,23,0.12)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_260px_at_110%_-20%,rgba(15,23,42,0.08),transparent)]" />
        <div className="relative p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Suche */}
              <div className="relative sm:w-80">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Suche nach Kennzeichen, Marke, Modell, Ort…"
                  className={input + ' pr-8'}
                />
                <svg
                  className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </div>

              {/* Sort */}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className={input + ' sm:w-48'}
                title="Sortierung"
              >
                <option value="az">Kennzeichen A–Z</option>
                <option value="za">Kennzeichen Z–A</option>
                <option value="new">Neueste zuerst</option>
                <option value="old">Älteste zuerst</option>
              </select>

              {/* Count */}
              <span className="inline-flex items-center rounded-full border border-white/60 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-700 backdrop-blur">
                Fahrzeuge: {visible.length}
              </span>
            </div>

            <div className="flex items-center justify-end">
              <button onClick={openCreate} className={btnWhite}>
                <PlusIcon className="h-5 w-5" />
                Fahrzeug hinzufügen
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Liste als Kacheln */}
      {loading ? (
        <div className="text-slate-600">Lade…</div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-10 text-center backdrop-blur">
          <p className="text-sm text-slate-600">
            Noch keine Fahrzeuge.{' '}
            <button
              onClick={openCreate}
              className="underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
            >
              Jetzt anlegen
            </button>
            .
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((v) => (
            <article
              key={v.id}
              className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/85 p-5 shadow-[0_10px_30px_rgba(2,6,23,0.12)] backdrop-blur-xl"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_260px_at_120%_-20%,rgba(15,23,42,0.08),transparent)]" />
              <div className="relative">
                {/* Header */}
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-700 backdrop-blur">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
                        {v.license_plate?.[0]?.toUpperCase() ?? 'F'}
                      </span>
                      Fahrzeug
                    </div>
                    <h3
                      className="truncate text-lg font-semibold tracking-tight text-slate-900"
                      title={v.license_plate}
                    >
                      {v.license_plate}
                    </h3>
                    <div className="mt-0.5 text-xs text-slate-600">
                      {v.vehicle_type} · {v.fuel_type}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <div className="flex gap-2">
                      <IconButton
                        label="Bearbeiten"
                        onClick={() => openEdit(v)}
                        icon={<PencilSquareIcon className="h-4 w-4" />}
                      />
                      <IconButton
                        label="Löschen"
                        tone="danger"
                        onClick={() => onDelete(v.id)}
                        icon={<TrashIcon className="h-4 w-4" />}
                      />
                    </div>
                  </div>
                </div>

                {/* Kacheln */}
                <div className="grid grid-cols-1 gap-2">
                  <GlassTile
                    label="Marke / Modell"
                    value={
                      [v.brand, v.model].filter(Boolean).join(' ') || '—'
                    }
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <GlassTile
                      label="Baujahr"
                      value={v.build_year ? String(v.build_year) : '—'}
                      mono
                    />
                    <GlassTile
                      label="Kilometerstand"
                      value={
                        v.mileage_km != null ? `${v.mileage_km} km` : '—'
                      }
                      mono
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <GlassTile label="Farbe" value={v.color || '—'} />
                    <GlassTile
                      label="Versicherung"
                      value={v.insurance_provider || '—'}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <GlassTile
                      label="Schlüssel"
                      value={v.key_location || '—'}
                      Icon={KeyIcon}
                    />
                    <GlassTile
                      label="Stellplatz"
                      value={v.parking_location || '—'}
                      Icon={MapPinIcon}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <GlassTile
                      label="HU/TÜV"
                      value={v.inspection_due_date || '—'}
                    />
                    <StatusBadge status={v.status as StatusType} />
                  </div>
                  {v.notes ? (
                    <GlassTile label="Notizen" value={v.notes} multiline />
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal via Portal (global) */}
      <PortalModal
        open={open}
        title={isEdit ? 'Fahrzeug bearbeiten' : 'Neues Fahrzeug hinzufügen'}
        onClose={() => {
          setOpen(false)
          setEditing(null)
        }}
      >
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:gap-4">
          <Field label="Kennzeichen *">
            <input
              required
              value={form.license_plate}
              onChange={(e) =>
                setForm({
                  ...form,
                  license_plate: e.target.value.toUpperCase(),
                })
              }
              placeholder="z. B. H-AB 1234"
              className={input}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Fahrzeugtyp">
              <Select<VehicleType>
                value={form.vehicle_type}
                options={VEHICLE_TYPES}
                onChange={(v) => setForm({ ...form, vehicle_type: v })}
              />
            </Field>
            <Field label="Kraftstoff">
              <Select<FuelType>
                value={form.fuel_type}
                options={FUEL_TYPES}
                onChange={(v) => setForm({ ...form, fuel_type: v })}
              />
            </Field>
            <Field label="Status">
              <Select<StatusType>
                value={form.status}
                options={STATUSES}
                onChange={(v) => setForm({ ...form, status: v })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Marke">
              <input
                value={form.brand}
                onChange={(e) =>
                  setForm({ ...form, brand: e.target.value })
                }
                placeholder="z. B. VW"
                className={input}
              />
            </Field>
            <Field label="Modell">
              <input
                value={form.model}
                onChange={(e) =>
                  setForm({ ...form, model: e.target.value })
                }
                placeholder="z. B. Transporter T6"
                className={input}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Baujahr">
              <input
                inputMode="numeric"
                value={form.build_year}
                onChange={(e) =>
                  setForm({ ...form, build_year: e.target.value })
                }
                placeholder="z. B. 2021"
                className={input}
              />
            </Field>
            <Field label="Farbe">
              <input
                value={form.color}
                onChange={(e) =>
                  setForm({ ...form, color: e.target.value })
                }
                placeholder="z. B. Weiß"
                className={input}
              />
            </Field>
            <Field label="Kilometerstand">
              <input
                inputMode="numeric"
                value={form.mileage_km}
                onChange={(e) =>
                  setForm({ ...form, mileage_km: e.target.value })
                }
                placeholder="z. B. 84500"
                className={input}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Schlüssel-Standort">
              <input
                value={form.key_location}
                onChange={(e) =>
                  setForm({ ...form, key_location: e.target.value })
                }
                placeholder="Büro · Brett 1 · Haken 7"
                className={input}
              />
            </Field>
            <Field label="Stellplatz">
              <input
                value={form.parking_location}
                onChange={(e) =>
                  setForm({
                    ...form,
                    parking_location: e.target.value,
                  })
                }
                placeholder="Halle A · Platz 12"
                className={input}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Versicherung">
              <input
                value={form.insurance_provider}
                onChange={(e) =>
                  setForm({
                    ...form,
                    insurance_provider: e.target.value,
                  })
                }
                placeholder="z. B. Allianz"
                className={input}
              />
            </Field>
            <Field label="Nächste HU/TÜV">
              <input
                type="date"
                value={form.inspection_due_date}
                onChange={(e) =>
                  setForm({
                    ...form,
                    inspection_due_date: e.target.value,
                  })
                }
                className={input}
              />
            </Field>
          </div>

          <Field label="Notizen">
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) =>
                setForm({ ...form, notes: e.target.value })
              }
              placeholder="Wartungen, Schäden, Besonderheiten…"
              className={input}
            />
          </Field>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setEditing(null)
              }}
              className="rounded-lg border border-white/60 bg-white/80 px-4 py-2 text-sm font-medium text-slate-900 shadow-sm backdrop-blur hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="rounded-lg border border-white/60 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm backdrop-blur hover:bg白 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {isEdit ? 'Änderungen speichern' : 'Anlegen'}
            </button>
          </div>
        </form>
      </PortalModal>
    </div>
  )
}

/* --- kleine UI-Teile --- */
function GlassTile({
  label,
  value,
  Icon,
  mono,
  multiline,
}: {
  label: string
  value: string
  Icon?: any
  mono?: boolean
  multiline?: boolean
}) {
  return (
    <div className="rounded-lg border border-white/60 bg-white/70 px-3 py-2 backdrop-blur">
      <div className="flex items-start gap-2">
        {Icon && <Icon className="mt-0.5 h-4 w-4 text-slate-500" />}
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">
            {label}
          </div>
          <div
            className={[
              'text-sm text-slate-900',
              mono ? 'font-mono tabular-nums' : '',
              multiline ? '' : 'truncate',
            ].join(' ')}
            title={typeof value === 'string' ? value : undefined}
          >
            {value || '—'}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: StatusType }) {
  const tone =
    status === 'Verfügbar'
      ? 'bg-emerald-100 text-emerald-800 ring-emerald-200/60'
      : status === 'In Nutzung'
      ? 'bg-sky-100 text-sky-800 ring-sky-200/60'
      : status === 'Werkstatt'
      ? 'bg-amber-100 text-amber-800 ring-amber-200/60'
      : status === 'Reserviert'
      ? 'bg-indigo-100 text-indigo-800 ring-indigo-200/60'
      : 'bg-rose-100 text-rose-800 ring-rose-200/60'
  return (
    <div className="rounded-lg border border-white/60 bg-white/70 px-3 py-2 backdrop-blur">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        Status
      </div>
      <span
        className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone}`}
      >
        {status}
      </span>
    </div>
  )
}

function IconButton({
  icon,
  label,
  onClick,
  tone = 'default',
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  tone?: 'default' | 'danger'
}) {
  const base =
    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition border backdrop-blur'
  const styles =
    tone === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
      : 'border-white/60 bg-white/80 text-slate-900 hover:bg-white'
  return (
    <button
      onClick={onClick}
      className={`${base} ${styles}`}
      aria-label={label}
      title={label}
    >
      {icon} <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group">
      <label className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </label>
      {children}
    </div>
  )
}

function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: readonly T[]
  onChange: (v: T) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

/* --- Globales Portal-Modal --- */
function PortalModal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  if (!open || !mounted) return null

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-3xl origin-center animate-in fade-in zoom-in-95 duration-150 overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-[0_20px_80px_rgba(2,6,23,0.35)] backdrop-blur-xl">
        <div className="border-b border-white/60 bg-white/70 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

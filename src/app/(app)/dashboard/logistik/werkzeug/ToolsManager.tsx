'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  WrenchScrewdriverIcon,
  TagIcon,
  IdentificationIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  CurrencyEuroIcon,
  MapPinIcon,
  BuildingOffice2Icon,
  UserIcon,
} from '@heroicons/react/24/outline'

type ToolItem = {
  id: string
  name: string
  category: string
  manufacturer: string | null
  model: string | null
  serial_number: string | null
  condition: string
  status: string
  storage_location: string | null
  assigned_employee_id: string | null
  assigned_employee_label: string | null
  purchase_date: string | null
  purchase_price: number | null
  warranty_expiry: string | null
  next_inspection_due: string | null
  last_service_date: string | null
  notes: string | null
  created_at?: string
  updated_at?: string
}

const CATEGORIES = [
  'Fliesenschneider',
  'Rührwerk',
  'Laser',
  'Winkelschleifer',
  'Vakuumsauger',
  'Handwerkzeug',
  'Allgemein',
] as const

const CONDITIONS = ['Neu', 'Gut', 'Gebrauchsspuren', 'Defekt'] as const
const STATUSES   = ['Verfügbar', 'In Nutzung', 'Wartung', 'Reserviert', 'Verloren'] as const

type CategoryType  = typeof CATEGORIES[number]
type ConditionType = typeof CONDITIONS[number]
type StatusType    = typeof STATUSES[number]

type ToolForm = {
  name: string
  category: CategoryType
  manufacturer: string
  model: string
  serial_number: string
  condition: ConditionType
  status: StatusType
  storage_location: string
  assigned_employee_id: string
  assigned_employee_label: string
  purchase_date: string
  purchase_price: string
  warranty_expiry: string
  next_inspection_due: string
  last_service_date: string
  notes: string
}

/* ---------- Styling Shortcuts ---------- */
const inputGlass =
  'w-full rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 outline-none ring-offset-2 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 backdrop-blur'

const btnPrimary =
  'inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm ' +
  'transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2'

const btnGlass =
  'inline-flex items-center gap-2 rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-sm text-slate-900 shadow-sm ' +
  'backdrop-blur hover:bg-white transition-colors'

const chip =
  'inline-flex items-center rounded-full border border-white/60 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-700 backdrop-blur'

/* ---------- Helpers ---------- */
function show(v: string | number | null | undefined) {
  if (v === null || v === undefined) return '—'
  const s = String(v).trim()
  return s === '' ? '—' : s
}
function euro(n: number | null | undefined) {
  if (n === null || n === undefined) return '—'
  try {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)
  } catch { return String(n) }
}

/* ---------- Glass Tile ---------- */
function GlassTile({
  title, value, Icon, mono,
}: { title: string; value?: string | number | null; Icon: any; mono?: boolean }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-white/60 bg-white/70 p-3 shadow-sm backdrop-blur-xl ring-1 ring-transparent"
      style={{ backgroundImage: 'radial-gradient(400px 180px at 120% -30%, rgba(15,23,42,0.06), transparent)' }}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-white/60 bg-white/80 p-2 shadow">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">{title}</p>
          <p className={`truncate text-sm font-medium text-slate-900 ${mono ? 'font-mono tabular-nums' : ''}`}>
            {show(value)}
          </p>
        </div>
      </div>
    </div>
  )
}

/* ---------- Main Component ---------- */
export default function ToolsManager() {
  const [items, setItems] = useState<ToolItem[]>([])
  const [loading, setLoading] = useState(true)

  // Modal
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ToolItem | null>(null)
  const isEdit = useMemo(() => !!editing, [editing])

  // Form
  const [form, setForm] = useState<ToolForm>({
    name: '',
    category: 'Allgemein',
    manufacturer: '',
    model: '',
    serial_number: '',
    condition: 'Gut',
    status: 'Verfügbar',
    storage_location: '',
    assigned_employee_id: '',
    assigned_employee_label: '',
    purchase_date: '',
    purchase_price: '',
    warranty_expiry: '',
    next_inspection_due: '',
    last_service_date: '',
    notes: '',
  })

  async function load() {
    setLoading(true)
    const res = await fetch('/api/tools', { cache: 'no-store' })
    const data = await res.json()
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    setForm({
      name: '',
      category: 'Allgemein',
      manufacturer: '',
      model: '',
      serial_number: '',
      condition: 'Gut',
      status: 'Verfügbar',
      storage_location: '',
      assigned_employee_id: '',
      assigned_employee_label: '',
      purchase_date: '',
      purchase_price: '',
      warranty_expiry: '',
      next_inspection_due: '',
      last_service_date: '',
      notes: '',
    })
    setOpen(true)
  }

  function openEdit(item: ToolItem) {
    setEditing(item)
    setForm({
      name: item.name ?? '',
      category: (item.category as CategoryType) ?? 'Allgemein',
      manufacturer: item.manufacturer ?? '',
      model: item.model ?? '',
      serial_number: item.serial_number ?? '',
      condition: (item.condition as ConditionType) ?? 'Gut',
      status: (item.status as StatusType) ?? 'Verfügbar',
      storage_location: item.storage_location ?? '',
      assigned_employee_id: item.assigned_employee_id ?? '',
      assigned_employee_label: item.assigned_employee_label ?? '',
      purchase_date: item.purchase_date ?? '',
      purchase_price: item.purchase_price ? String(item.purchase_price) : '',
      warranty_expiry: item.warranty_expiry ?? '',
      next_inspection_due: item.next_inspection_due ?? '',
      last_service_date: item.last_service_date ?? '',
      notes: item.notes ?? '',
    })
    setOpen(true)
  }

  async function onDelete(id: string) {
    if (!confirm('Werkzeug wirklich löschen?')) return
    const res = await fetch(`/api/tools/${id}`, { method: 'DELETE' })
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
    if (!form.name.trim()) {
      alert('Name ist erforderlich.')
      return
    }

    const payload = {
      name: form.name.trim(),
      category: form.category,
      manufacturer: form.manufacturer || null,
      model: form.model || null,
      serial_number: form.serial_number || null,
      condition: form.condition,
      status: form.status,
      storage_location: form.storage_location || null,
      assigned_employee_id: form.assigned_employee_id || null,
      assigned_employee_label: form.assigned_employee_label || null,
      purchase_date: form.purchase_date || null,
      purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
      warranty_expiry: form.warranty_expiry || null,
      next_inspection_due: form.next_inspection_due || null,
      last_service_date: form.last_service_date || null,
      notes: form.notes || null,
    }

    const method = isEdit ? 'PUT' : 'POST'
    const url = isEdit ? `/api/tools/${editing?.id}` : '/api/tools'
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

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className={chip}>Werkzeuge: {items.length}</span>
        <button onClick={openCreate} className={btnGlass + ' px-4 py-2'}>
          <PlusIcon className="h-5 w-5" />
          Werkzeug hinzufügen
        </button>
      </div>

      {/* Liste: eine Box pro Werkzeug */}
      {loading ? (
        <div className="p-6 text-slate-600">Lade…</div>
      ) : items.length === 0 ? (
        <div className="p-6 text-slate-600">
          Noch keine Werkzeuge.{' '}
          <button onClick={openCreate} className="text-slate-900 underline decoration-slate-300 hover:decoration-slate-500">
            Jetzt anlegen
          </button>
          .
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {items.map((t) => (
            <div
              key={t.id}
              className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-4 shadow-[0_10px_30px_rgba(2,6,23,0.08)] backdrop-blur-xl"
              style={{ backgroundImage: 'radial-gradient(900px 360px at 120% -30%, rgba(15,23,42,0.06), transparent)' }}
            >
              {/* Header */}
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-xs text-slate-700 backdrop-blur">
                    <WrenchScrewdriverIcon className="h-4 w-4 text-slate-900" />
                    Werkzeug
                  </div>
                  <h3 className="mt-2 truncate text-lg font-semibold tracking-tight text-slate-900">
                    {t.name}
                  </h3>
                  <p className="truncate text-sm text-slate-600 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-700 backdrop-blur">
                      <TagIcon className="h-3.5 w-3.5" />
                      {show(t.category)}
                    </span>
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className={chip}>{show(t.status)}</span>
                  <button onClick={() => openEdit(t)} className={btnGlass} title="Bearbeiten">
                    <PencilSquareIcon className="h-5 w-5" />
                    <span className="hidden sm:inline">Bearbeiten</span>
                  </button>
                  <button
                    onClick={() => onDelete(t.id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100"
                    title="Löschen"
                  >
                    <TrashIcon className="h-5 w-5" />
                    <span className="hidden sm:inline">Löschen</span>
                  </button>
                </div>
              </div>

              {/* Tiles */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <GlassTile title="Hersteller"          value={t.manufacturer}            Icon={IdentificationIcon} />
                <GlassTile title="Modell"               value={t.model}                   Icon={IdentificationIcon} />
                <GlassTile title="Seriennummer"         value={t.serial_number}           Icon={DocumentTextIcon} />
                <GlassTile title="Zustand"              value={t.condition}               Icon={TagIcon} />
                <GlassTile title="Ablageort"            value={t.storage_location}        Icon={BuildingOffice2Icon} />
                <GlassTile title="Zugewiesen an"        value={t.assigned_employee_label} Icon={UserIcon} />
                <GlassTile title="Kaufdatum"            value={t.purchase_date}           Icon={CalendarDaysIcon} />
                <GlassTile title="Kaufpreis"            value={euro(t.purchase_price)}    Icon={CurrencyEuroIcon} mono />
                <GlassTile title="Garantie bis"         value={t.warranty_expiry}         Icon={CalendarDaysIcon} />
                <GlassTile title="Nächste Prüfung"      value={t.next_inspection_due}     Icon={CalendarDaysIcon} />
                <GlassTile title="Letzter Service"      value={t.last_service_date}       Icon={CalendarDaysIcon} />
                <GlassTile title="Notizen"              value={t.notes}                   Icon={DocumentTextIcon} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal – via Portal (fullpage) */}
      <GlassModal
        open={open}
        title={isEdit ? 'Werkzeug bearbeiten' : 'Neues Werkzeug hinzufügen'}
        onClose={() => { setOpen(false); setEditing(null) }}
      >
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:gap-4">
          <Field label="Name *">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="z. B. Fliesenschneider Sigma 3C"
              className={inputGlass}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Kategorie">
              <Select<CategoryType>
                value={form.category}
                options={CATEGORIES}
                onChange={(v) => setForm({ ...form, category: v })}
              />
            </Field>
            <Field label="Zustand">
              <Select<ConditionType>
                value={form.condition}
                options={CONDITIONS}
                onChange={(v) => setForm({ ...form, condition: v })}
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
            <Field label="Hersteller">
              <input
                value={form.manufacturer}
                onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                placeholder="z. B. Sigma"
                className={inputGlass}
              />
            </Field>
            <Field label="Modell">
              <input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="z. B. 3C"
                className={inputGlass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Seriennummer">
              <input
                value={form.serial_number}
                onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                placeholder="optional"
                className={inputGlass}
              />
            </Field>
            <Field label="Ablageort">
              <input
                value={form.storage_location}
                onChange={(e) => setForm({ ...form, storage_location: e.target.value })}
                placeholder="z. B. Halle A, Regal 3"
                className={inputGlass}
              />
            </Field>
            <Field label="Mitarbeiter-ID (optional)">
              <input
                value={form.assigned_employee_id}
                onChange={(e) => setForm({ ...form, assigned_employee_id: e.target.value })}
                placeholder="UUID aus Mitarbeiterliste"
                className={inputGlass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Kaufdatum">
              <input
                type="date"
                value={form.purchase_date}
                onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                className={inputGlass}
              />
            </Field>
            <Field label="Kaufpreis (€)">
              <input
                inputMode="decimal"
                value={form.purchase_price}
                onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
                placeholder="z. B. 299.90"
                className={inputGlass}
              />
            </Field>
            <Field label="Garantie bis">
              <input
                type="date"
                value={form.warranty_expiry}
                onChange={(e) => setForm({ ...form, warranty_expiry: e.target.value })}
                className={inputGlass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Nächste Prüfung">
              <input
                type="date"
                value={form.next_inspection_due}
                onChange={(e) => setForm({ ...form, next_inspection_due: e.target.value })}
                className={inputGlass}
              />
            </Field>
            <Field label="Letzter Service">
              <input
                type="date"
                value={form.last_service_date}
                onChange={(e) => setForm({ ...form, last_service_date: e.target.value })}
                className={inputGlass}
              />
            </Field>
          </div>

          <Field label="Zugewiesen an (Label)">
            <input
              value={form.assigned_employee_label}
              onChange={(e) => setForm({ ...form, assigned_employee_label: e.target.value })}
              placeholder="Nur Anzeige (z. B. Max Mustermann)"
              className={inputGlass}
            />
          </Field>

          <Field label="Notizen">
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Besonderheiten, fehlende Teile, Schutzklasse, Zubehör…"
              className={inputGlass}
            />
          </Field>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button type="button" onClick={() => { setOpen(false); setEditing(null) }} className={btnGlass}>
              Abbrechen
            </button>
            <button type="submit" className={btnPrimary}>
              {isEdit ? 'Änderungen speichern' : 'Anlegen'}
            </button>
          </div>
        </form>
      </GlassModal>
    </div>
  )
}

/* ---------- UI-Helfer ---------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group">
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  )
}

function Select<T extends string>({
  value, options, onChange,
}: {
  value: T
  options: readonly T[]
  onChange: (v: T) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={inputGlass}
    >
      {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  )
}

/* ---------- Glass Modal via Portal (mobil scroll-freundlich) ---------- */
function GlassModal({
  open, title, onClose, children,
}: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Body-Scroll sperren, solange Modal offen ist
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // ESC schließt
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Klick auf Overlay schließt
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose()
  }

  // Fokus ins Panel (A11y)
  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  if (!open || !mounted) return null

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[1000] bg-slate-900/50 backdrop-blur-sm"
    >
      {/* Panel: Handy = fullscreen & scroll, ab sm = zentriert/gerundet */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="glass-modal-title"
        className="
          absolute inset-0 flex flex-col h-[100dvh] w-full
          sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
          sm:h-auto sm:max-h-[90vh] sm:w-[min(90vw,48rem)]
          overflow-hidden rounded-none sm:rounded-2xl
          border border-white/60 bg-white/90 shadow-[0_20px_80px_rgba(2,6,23,0.25)] backdrop-blur-xl
        "
        style={{ backgroundImage: 'radial-gradient(1000px 400px at 110% -30%, rgba(30,64,175,0.08), transparent)' }}
      >
        {/* Header bleibt sichtbar beim Scrollen */}
        <div className="sticky top-0 z-10 border-b border-white/60 bg-white/80 px-5 py-4 backdrop-blur">
          <h3 id="glass-modal-title" className="text-base font-semibold text-slate-900">{title}</h3>
        </div>

        {/* Inhalt: eigener Scroll-Container (hier liegt dein langes Formular) */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}


'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'

type Supplier = {
  id: string
  name: string
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  notes: string | null
  created_at?: string
  updated_at?: string
}

type SortKey = 'az' | 'za' | 'new' | 'old'

export default function SuppliersManager() {
  const [items, setItems] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)

  // Modal
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)

  // Form
  const [form, setForm] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    notes: '',
  })
  const isEdit = !!editing

  // Suche + Sort
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('az')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/suppliers', { cache: 'no-store' })
    const data = await res.json()
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', contact_email: '', contact_phone: '', address: '', notes: '' })
    setOpen(true)
  }

  function openEdit(s: Supplier) {
    setEditing(s)
    setForm({
      name: s.name ?? '',
      contact_email: s.contact_email ?? '',
      contact_phone: s.contact_phone ?? '',
      address: s.address ?? '',
      notes: s.notes ?? '',
    })
    setOpen(true)
  }

  async function onDelete(id: string) {
    if (!confirm('Diesen Lieferanten wirklich löschen?')) return
    const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      alert(j?.error ?? 'Fehler beim Löschen')
      return
    }
    await load()
    if (editing?.id === id) setEditing(null)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const method = isEdit ? 'PUT' : 'POST'
    const url = isEdit ? `/api/suppliers/${editing?.id}` : '/api/suppliers'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        address: form.address || null,
        notes: form.notes || null,
      }),
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

  // Gefiltert + sortiert
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = items.filter((s) =>
      !q ||
      [s.name, s.contact_email, s.contact_phone, s.address, s.notes]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q))
    )
    list = list.sort((a, b) => {
      if (sort === 'new') return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      if (sort === 'old') return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
      if (sort === 'az')  return a.name.localeCompare(b.name, 'de', { sensitivity: 'base' })
      return b.name.localeCompare(a.name, 'de', { sensitivity: 'base' }) // 'za'
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
      {/* Toolbar: jetzt in weißer Glas-Box */}
      <section className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-[0_10px_30px_rgba(2,6,23,0.08)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_260px_at_110%_-20%,rgba(15,23,42,0.08),transparent)]" />
        <div className="relative p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Suche */}
              <div className="relative sm:w-80">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Suche in Firma, Name, E-Mail, Telefon, Adresse…"
                  className={input + ' pr-8'}
                />
                <svg className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                     viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
                </svg>
              </div>

              {/* Sortierung */}
              <select
                value={sort}
                onChange={(e)=>setSort(e.target.value as SortKey)}
                className={input + ' sm:w-48'}
                title="Sortierung"
              >
                <option value="az">A–Z</option>
                <option value="za">Z–A</option>
                <option value="new">Neueste zuerst</option>
                <option value="old">Älteste zuerst</option>
              </select>
            </div>

            {/* Neuer Eintrag */}
            <div className="flex items-center justify-end">
              <button onClick={openCreate} className={btnWhite}>
                <PlusIcon className="h-5 w-5" />
                Lieferant hinzufügen
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Kartenliste */}
      {loading ? (
        <div className="text-slate-600">Lade…</div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center backdrop-blur">
          <p className="text-sm text-slate-600">
            Keine Einträge gefunden. <button onClick={openCreate} className="underline decoration-slate-300 underline-offset-2 hover:text-slate-900">Jetzt anlegen</button>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((s) => (
            <article
              key={s.id}
              className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-5 shadow-[0_10px_30px_rgba(2,6,23,0.08)] backdrop-blur-xl"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_300px_at_120%_-20%,rgba(15,23,42,0.08),transparent)]" />
              <div className="relative">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h3 className="min-w-0 truncate text-lg font-semibold text-slate-900" title={s.name}>
                    {s.name}
                  </h3>
                  <div className="shrink-0">
                    <div className="flex gap-2">
                      <IconButton
                        label="Bearbeiten"
                        onClick={() => openEdit(s)}
                        icon={<PencilSquareIcon className="h-4 w-4" />}
                      />
                      <IconButton
                        label="Löschen"
                        tone="danger"
                        onClick={() => onDelete(s.id)}
                        icon={<TrashIcon className="h-4 w-4" />}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 text-sm text-slate-800">
                  <Row label="E-Mail"   value={s.contact_email || '—'} />
                  <Row label="Telefon" value={s.contact_phone || '—'} />
                  <Row label="Adresse" value={s.address || '—'} />
                  {s.notes ? <Row label="Notizen" value={s.notes} multiline /> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal via Portal – global */}
      <PortalModal
        open={open}
        title={isEdit ? 'Lieferant bearbeiten' : 'Neuen Lieferanten hinzufügen'}
        onClose={() => { setOpen(false); setEditing(null) }}
      >
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:gap-4">
          <Field label="Name *">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="z. B. Fliesenhandel Meyer GmbH"
              className={input}
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="E-Mail">
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                placeholder="kontakt@lieferant.de"
                className={input}
              />
            </Field>
            <Field label="Telefon">
              <input
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                placeholder="+49 511 123456"
                className={input}
              />
            </Field>
          </div>

          <Field label="Adresse">
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Straße Nr., PLZ Ort"
              className={input}
            />
          </Field>

          <Field label="Notizen">
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="z. B. Zahlungsbedingungen, Ansprechpartner, Rabatte …"
              className={input}
            />
          </Field>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { setOpen(false); setEditing(null) }}
              className="rounded-lg border border-white/60 bg-white/80 px-4 py-2 text-sm font-medium text-slate-900 shadow-sm backdrop-blur hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="rounded-lg border border-white/60 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm backdrop-blur hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {isEdit ? 'Änderungen speichern' : 'Anlegen'}
            </button>
          </div>
        </form>
      </PortalModal>
    </div>
  )
}

/* ---------- UI-Helfer ---------- */
function Row({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="rounded-lg border border-white/60 bg-white/70 px-3 py-2 backdrop-blur">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-slate-900 ${multiline ? '' : 'truncate'}`}>{value}</div>
    </div>
  )
}

function IconButton({
  icon, label, onClick, tone = 'default',
}: { icon: React.ReactNode; label: string; onClick: () => void; tone?: 'default' | 'danger' }) {
  const base = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition border backdrop-blur'
  const styles = tone === 'danger'
    ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
    : 'border-white/60 bg-white/80 text-slate-900 hover:bg-white'
  return (
    <button onClick={onClick} className={`${base} ${styles}`} aria-label={label} title={label}>
      {icon} <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div className="group"><label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>{children}</div>)
}

/* ---------- Portal-Modal ---------- */
function PortalModal({
  open, title, onClose, children,
}: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
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
      <div className="w-full max-w-xl origin-center animate-in fade-in zoom-in-95 duration-150 overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-[0_20px_80px_rgba(2,6,23,0.35)] backdrop-blur-xl">
        <div className="border-b border-white/60 bg-white/70 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body
  )
}

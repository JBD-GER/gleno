'use client'

import React, { useEffect, useMemo, useState } from 'react'
import MaterialModal from './MaterialModal'
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  TagIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline'

type Material = {
  id: string
  name: string
  unit: string
  quantity: number
  critical_quantity: number
  category: string
  article_number: string
  color: string
  pattern: string
}

/* ---- Style Shortcuts (wie bei Werkzeug) ---- */
const btnPrimary =
  'inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2'
const btnGlass =
  'inline-flex items-center gap-2 rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-sm text-slate-900 shadow-sm backdrop-blur hover:bg-white transition-colors'
const chipGlass =
  'inline-flex items-center rounded-full border border-white/60 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-700 backdrop-blur'

/* kleine Glas-Kachel */
function Tile({ title, value, Icon, mono }: { title: string; value?: string | number | null; Icon: any; mono?: boolean }) {
  const shown = (v: any) => {
    if (v === null || v === undefined) return '—'
    const s = String(v).trim()
    return s === '' ? '—' : s
  }
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-white/60 bg-white/70 p-3 shadow-sm backdrop-blur-xl"
      style={{ backgroundImage: 'radial-gradient(350px 160px at 120% -30%, rgba(15,23,42,0.06), transparent)' }}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-white/60 bg-white/80 p-2 shadow">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">{title}</p>
          <p className={`truncate text-sm font-medium text-slate-900 ${mono ? 'font-mono tabular-nums' : ''}`}>
            {shown(value)}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function MaterialsManager() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Material | null>(null)
  const [activeCategory, setActiveCategory] = useState('Alle')
  const [query, setQuery] = useState('')

  const fetchMaterials = async () => {
    const res = await fetch('/api/logistik/materials', { cache: 'no-store' })
    const data: Material[] = await res.json()
    setMaterials(Array.isArray(data) ? data : [])
  }
  useEffect(() => { fetchMaterials() }, [])

  const categoryOptions = useMemo(
    () => Array.from(new Set(materials.map(m => m.category).filter(Boolean))),
    [materials]
  )
  const patternOptions = useMemo(
    () => Array.from(new Set(materials.map(m => m.pattern).filter(Boolean))),
    [materials]
  )

  const tabs = ['Alle', ...categoryOptions]

  const filtered = useMemo(() => {
    const byCat = activeCategory === 'Alle'
      ? materials
      : materials.filter(m => m.category === activeCategory)

    const q = query.trim().toLowerCase()
    if (!q) return byCat
    return byCat.filter(m =>
      [m.name, m.article_number, m.category, m.pattern]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q))
    )
  }, [materials, activeCategory, query])

  const handleAdd = () => { setEditing(null); setShowModal(true) }
  const handleEdit = (m: Material) => { setEditing(m); setShowModal(true) }
  const handleDelete = async (id: string) => {
    if (!confirm('Wirklich löschen?')) return
    await fetch(`/api/logistik/materials/${id}`, { method: 'DELETE' })
    fetchMaterials()
  }
  const handleSave = async (form: Omit<Material, 'id'>) => {
    if (editing) {
      await fetch(`/api/logistik/materials/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } else {
      await fetch('/api/logistik/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    }
    setShowModal(false)
    fetchMaterials()
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {/* Tabs */}
          <div className="inline-flex overflow-hidden rounded-lg border border-white/60 bg-white/80 p-0.5 backdrop-blur">
            {tabs.map(tab => {
              const active = activeCategory === tab
              return (
                <button
                  key={tab}
                  onClick={() => setActiveCategory(tab)}
                  className={[
                    'px-3 py-1.5 text-sm font-medium transition',
                    active
                      ? 'rounded-md bg-slate-900 text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-900'
                  ].join(' ')}
                >
                  {tab}
                </button>
              )
            })}
          </div>

          {/* Suche */}
          <div className="relative sm:ml-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Suche nach Name, Art.-Nr., Kategorie…"
              className="w-full rounded-lg border border-white/60 bg-white/80 px-3 py-2 pr-8 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:w-80 backdrop-blur"
            />
            <svg
              className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
            </svg>
          </div>
        </div>

<button
  onClick={handleAdd}
  className={btnGlass + ' px-4 py-2'} // weißer Glas-Button
>
  <PlusIcon className="h-5 w-5" />
  Material hinzufügen
</button>

      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/60 bg-white/60 p-10 text-center backdrop-blur">
          <p className="text-sm text-slate-700">
            Keine Einträge gefunden. Passe die Suche/Kategorie an oder lege neues Material an.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(m => {
            const ratio = m.critical_quantity > 0
              ? Math.min(m.quantity / m.critical_quantity, 1)
              : 1
            const danger = m.critical_quantity > 0 && m.quantity <= m.critical_quantity

            return (
              <div
                key={m.id}
                className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-5 shadow-[0_10px_30px_rgba(2,6,23,0.08)] backdrop-blur-xl"
                style={{ backgroundImage: 'radial-gradient(900px 360px at 120% -30%, rgba(15,23,42,0.06), transparent)' }}
              >
                {/* Header */}
                <div className="relative flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-xs text-slate-700 backdrop-blur">
                      <ClipboardDocumentListIcon className="h-4 w-4 text-slate-900" />
                      Material
                    </div>
                    <h2 className="mt-2 truncate text-base font-semibold text-slate-900" title={m.name}>
                      {m.name}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={chipGlass}><TagIcon className="mr-1 h-3.5 w-3.5" />{m.category || '—'}</span>
                      <span className={chipGlass}><BeakerIcon className="mr-1 h-3.5 w-3.5" />{m.pattern || '—'}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <div
                      className="h-8 w-8 rounded-md border border-white/60 shadow-inner"
                      title={m.color}
                      style={{ backgroundColor: m.color }}
                    />
                  </div>
                </div>

                {/* Tiles */}
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Tile title="Einheit" value={m.unit} Icon={DocumentTextIcon} />
                  <Tile title="Artikel-Nr." value={m.article_number || '—'} Icon={DocumentTextIcon} mono />
                  <Tile title="Musterung" value={m.pattern || '—'} Icon={BeakerIcon} />
                  <Tile title="Kategorie" value={m.category || '—'} Icon={TagIcon} />
                </div>

                {/* Progress */}
                <div className="relative mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/60 ring-1 ring-inset ring-white/60 backdrop-blur">
                  <div
                    className={`h-full transition-[width] duration-500 ${danger ? 'bg-gradient-to-r from-rose-500 to-orange-400' : 'bg-gradient-to-r from-emerald-500 to-teal-400'}`}
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
                <div className="mt-1.5 text-right text-xs text-slate-600">
                  {m.quantity} / {m.critical_quantity} {m.unit}
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2">
                  <button onClick={() => handleEdit(m)} className={btnGlass}>
                    <PencilSquareIcon className="h-5 w-5" />
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100"
                  >
                    <TrashIcon className="h-5 w-5" />
                    Löschen
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <MaterialModal
        showModal={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        editing={editing}
        categories={categoryOptions}
        patterns={patternOptions}
        colorOptions={[
          { name: 'Rot',     value: '#FF0000' },
          { name: 'Grün',    value: '#00FF00' },
          { name: 'Blau',    value: '#0000FF' },
          { name: 'Gelb',    value: '#FFFF00' },
          { name: 'Magenta', value: '#FF00FF' },
          { name: 'Cyan',    value: '#00FFFF' },
        ]}
      />
    </div>
  )
}

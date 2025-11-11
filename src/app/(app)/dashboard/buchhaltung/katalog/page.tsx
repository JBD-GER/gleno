// src/app/(app)/dashboard/buchhaltung/katalog/page.tsx
'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type CatalogItem = {
  id: string
  kind: 'product' | 'service'
  name: string
  unit: string
  unit_price: number
  description?: string | null
  created_at?: string
  updated_at?: string
}

export default function CatalogPage() {
  const router = useRouter()
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Suche (debounced)
  const [q, setQ] = useState('')
  const qDebounced = useDebouncedValue(q, 250)

  // Formular
  const [kind, setKind] = useState<'product' | 'service'>('service')
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('Std.')
  const [unitPrice, setUnitPrice] = useState<number | ''>('') // leeres Feld erlaubt
  const [description, setDescription] = useState('')

  const nameRef = useRef<HTMLInputElement>(null)

  /* --------- Laden (mit Abort-Guards) --------- */
  async function load(signal?: AbortSignal) {
    setLoading(true); setErr(null)
    try {
      const res = await fetch('/api/catalog/items?q=' + encodeURIComponent(qDebounced), { signal })
      // falls genau hier abgebrochen wird, keine weiteren Aktionen
      if (signal?.aborted) return
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Fehler beim Laden')
      if (!signal?.aborted) setItems(Array.isArray(data) ? data : [])
    } catch (e: any) {
      // unterschiedliche Browser werfen unterschiedliche Abort-Fehlersignaturen
      if (e?.name === 'AbortError' || e?.code === 20) return
      setErr(e?.message || 'Fehler beim Laden')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }

  useEffect(() => {
    const ctrl = new AbortController()
    // nicht awaiten → verhindert "unhandled" bei sofortigem Abort in StrictMode
    void load(ctrl.signal)
    return () => { ctrl.abort() }
  }, [qDebounced])

  /* --------- Anlegen --------- */
  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    try {
      const res = await fetch('/api/catalog/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          name: name.trim(),
          unit: unit.trim(),
          unit_price: Number(unitPrice || 0),
          description: description.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Speichern fehlgeschlagen')

      // reset + reload
      setName('')
      setUnit(kind === 'service' ? 'Std.' : 'Stk.')
      setUnitPrice('')
      setDescription('')
      setNotice('Eintrag gespeichert.')
      nameRef.current?.focus()
      await load() // ohne Signal → normaler Refresh
      dismissNoticeSoon()
    } catch (e: any) {
      setErr(e?.message || 'Speichern fehlgeschlagen')
    }
  }

  /* --------- Löschen (optimistisch + Undo) --------- */
  const lastDeletedRef = useRef<CatalogItem | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function onDelete(id: string) {
    const item = items.find(i => i.id === id)
    if (!item) return
    if (!confirm(`„${item.name}“ wirklich löschen?`)) return

    lastDeletedRef.current = item
    setDeletingId(id)
    setItems(prev => prev.filter(x => x.id !== id))

    try {
      const res = await fetch(`/api/catalog/items/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Löschen fehlgeschlagen')
      setNotice('Eintrag gelöscht. Rückgängig machen?')
      dismissNoticeSoon()
    } catch (e: any) {
      // Rollback
      setItems(prev => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)))
      alert(e?.message || 'Löschen fehlgeschlagen')
    } finally {
      setDeletingId(null)
    }
  }

  async function undoDelete() {
    const item = lastDeletedRef.current
    if (!item) return
    try {
      const res = await fetch('/api/catalog/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id, // wenn euer POST keine IDs akzeptiert → Key weglassen
          kind: item.kind,
          name: item.name,
          unit: item.unit,
          unit_price: item.unit_price,
          description: item.description || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Wiederherstellen fehlgeschlagen')
      await load()
      setNotice('Löschung rückgängig gemacht.')
      dismissNoticeSoon()
    } catch (e: any) {
      alert(e?.message || 'Wiederherstellen fehlgeschlagen')
    } finally {
      lastDeletedRef.current = null
    }
  }

  /* --------- Abgeleitete Daten --------- */
  const filtered = useMemo(() => {
    if (!qDebounced.trim()) return items
    const s = qDebounced.trim().toLowerCase()
    return items.filter(i =>
      `${i.name} ${i.unit} ${i.unit_price} ${i.description || ''}`.toLowerCase().includes(s)
    )
  }, [qDebounced, items])

  /* --------- UI Helpers --------- */
  function dismissNoticeSoon() {
    window.setTimeout(() => setNotice(null), 2500)
  }
  const priceFmt = (n: number) => n.toFixed(2).replace('.', ',')

  return (
    <div className="w-full p-4 sm:p-6">
      {/* Header / Breadcrumb – Glas */}
      <div className="mb-6 flex flex-col-reverse items-start justify-between gap-3 rounded-2xl border border-gray-200 bg-white/60 p-4 backdrop-blur-md transition-colors sm:flex-row sm:items-center sm:p-6 supports-[backdrop-filter]:bg-white/40">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Katalog</h1>
          <p className="mt-1 text-sm text-gray-600">Produkte & Dienstleistungen zentral verwalten.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-gray-200 bg-white/70 px-3 py-2 text-sm text-gray-700 backdrop-blur-sm transition hover:bg-white/90 active:scale-[0.99]"
          >
            Zurück
          </button>
        </div>
      </div>

      {/* Meldungen */}
      {err && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-rose-700 backdrop-blur-sm">
          <span>⚠️</span>
          <div className="text-sm">{err}</div>
        </div>
      )}
      {notice && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-emerald-800 backdrop-blur-sm">
          <div className="text-sm">{notice}</div>
          {/Rückgängig/.test(notice) && (
            <button
              onClick={undoDelete}
              className="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700"
            >
              Rückgängig
            </button>
          )}
        </div>
      )}

      {/* Formularkarte – Glas */}
      <form onSubmit={onCreate} className="mb-8 rounded-2xl border border-gray-200 bg-white/60 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/40">
        <div className="border-b border-gray-100/80 px-4 py-3 sm:px-6">
          <h2 className="text-base font-semibold text-gray-900">Neuen Katalogeintrag anlegen</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-6 sm:p-6">
          {/* Typ – Segment Control */}
          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-900">Typ</label>
            <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-gray-300 text-sm">
              <button
                type="button"
                onClick={() => { setKind('service'); setUnit('Std.') }}
                className={`px-3 py-2 transition ${kind==='service' ? 'bg-slate-900 text-white' : 'bg-white/70 text-gray-700 hover:bg-white/90 backdrop-blur-sm'}`}
                aria-pressed={kind==='service'}
              >
                Dienstleistung
              </button>
              <button
                type="button"
                onClick={() => { setKind('product'); setUnit('Stk.') }}
                className={`border-l border-gray-300 px-3 py-2 transition ${kind==='product' ? 'bg-slate-900 text-white' : 'bg-white/70 text-gray-700 hover:bg-white/90 backdrop-blur-sm'}`}
                aria-pressed={kind==='product'}
              >
                Produkt
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">Beispiele: Dienstleistung = Arbeitszeit, Produkt = Material.</p>
          </div>

          {/* Name */}
          <div className="lg:col-span-4">
            <label className="mb-2 block text-sm font-medium text-gray-900">Name *</label>
            <input
              ref={nameRef}
              value={name}
              onChange={e=>setName(e.target.value)}
              required
              placeholder={kind==='service' ? 'z. B. Malerarbeiten' : 'z. B. Parkett Eiche gebürstet'}
              className="w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2 text-sm outline-none ring-indigo-200/60 backdrop-blur-sm transition focus:ring-4"
            />
          </div>

          {/* Einheit */}
          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-900">Einheit *</label>
            <input
              value={unit}
              onChange={e=>setUnit(e.target.value)}
              required
              placeholder={kind==='service' ? 'Std.' : 'Stk.'}
              className="w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2 text-sm outline-none ring-indigo-200/60 backdrop-blur-sm transition focus:ring-4"
            />
          </div>

          {/* Preis */}
          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-900">Preis / Einheit (netto) *</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min={0}
                value={unitPrice}
                onChange={e=>setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                required
                placeholder="0,00"
                className="w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2 pr-12 text-right text-sm outline-none ring-indigo-200/60 backdrop-blur-sm transition focus:ring-4"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-gray-500">EUR</span>
            </div>
          </div>

          {/* Beschreibung */}
          <div className="lg:col-span-6">
            <label className="mb-2 block text-sm font-medium text-gray-900">Beschreibung (optional)</label>
            <textarea
              value={description}
              onChange={e=>setDescription(e.target.value)}
              rows={3}
              placeholder="Kurzbeschreibung, Lieferumfang, Besonderheiten…"
              className="w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2 text-sm outline-none ring-indigo-200/60 backdrop-blur-sm transition focus:ring-4"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100/80 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => { setName(''); setUnit(kind==='service'?'Std.':'Stk.'); setUnitPrice(''); setDescription('') }}
            className="rounded-lg border border-gray-200 bg-white/70 px-4 py-2 text-sm text-gray-700 backdrop-blur-sm transition hover:bg-white/90"
          >
            Zurücksetzen
          </button>
          <button
            type="submit"
            disabled={!name.trim() || unitPrice === '' || Number(unitPrice) < 0}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Speichern
          </button>
        </div>
      </form>

      {/* Suchkopf – Sticky + Glas */}
      <div className="sticky top-[0.25rem] z-10 mb-3">
        <div className="rounded-xl border border-gray-200 bg-white/60 p-3 backdrop-blur-md supports-[backdrop-filter]:bg-white/40">
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <input
                value={q}
                onChange={e=>setQ(e.target.value)}
                placeholder="Im Katalog suchen…"
                className="w-full rounded-lg border border-gray-300 bg-white/70 px-10 py-2 text-sm outline-none ring-indigo-200/60 backdrop-blur-sm transition focus:ring-4"
                aria-label="Im Katalog suchen"
              />
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">🔎</span>
              {q && (
                <button
                  type="button"
                  onClick={()=>setQ('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-white/70"
                  aria-label="Suche löschen"
                >
                  Löschen
                </button>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {loading ? 'Lade…' : `${filtered.length} Einträge`}
            </div>
          </div>
        </div>
      </div>

      {/* Liste – Glas */}
      <section className="rounded-2xl border border-gray-200 bg-white/60 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/40">
        {/* Desktop-Tabelle */}
        <div className="hidden md:block">
          <table className="min-w-full table-fixed text-sm">
            <thead className="bg-gray-50/80 text-gray-600 backdrop-blur">
              <tr>
                <Th>Typ</Th>
                <Th>Name</Th>
                <Th>Einheit</Th>
                <Th className="text-right">Preis/Einheit (netto)</Th>
                <Th>Beschreibung</Th>
                <Th className="w-28"></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/80">
              {loading ? (
                <SkeletonRows rows={6} cols={[80, 240, 80, 140, 320, 100]} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-sm text-gray-500">
                    Keine Einträge. Lege oben einen neuen Katalogeintrag an.
                  </td>
                </tr>
              ) : (
                filtered.map(it => (
                  <tr key={it.id} className="transition-colors hover:bg-white/70">
                    <Td>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                        it.kind === 'service'
                          ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                          : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                      }`}>
                        {it.kind === 'service' ? 'Dienstleistung' : 'Produkt'}
                      </span>
                    </Td>
                    <Td className="truncate">{it.name}</Td>
                    <Td>{it.unit}</Td>
                    <Td className="text-right tabular-nums">{priceFmt(it.unit_price)} €</Td>
                    <Td className="max-w-2xl truncate text-gray-700">{it.description}</Td>
                    <Td className="text-right">
                      <button
                        onClick={()=>onDelete(it.id)}
                        disabled={deletingId === it.id}
                        className="rounded-md border border-rose-200 bg-white/70 px-2 py-1 text-rose-700 backdrop-blur-sm transition hover:bg-rose-50 disabled:opacity-50"
                      >
                        Löschen
                      </button>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile-Cards */}
        <div className="md:hidden">
          {loading ? (
            <div className="space-y-3 p-3">
              {Array.from({length: 5}).map((_,i)=>(
                <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white/50 p-3 backdrop-blur">
                  <div className="mb-2 h-4 w-24 rounded bg-gray-200" />
                  <div className="mb-2 h-5 w-2/3 rounded bg-gray-200" />
                  <div className="mb-2 h-4 w-1/3 rounded bg-gray-200" />
                  <div className="h-4 w-full rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="grid grid-cols-1 gap-3 p-3">
              {filtered.map(it => (
                <li key={it.id} className="rounded-xl border border-gray-200 bg-white/60 p-3 backdrop-blur-sm">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                      it.kind === 'service'
                        ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                        : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                    }`}>
                      {it.kind === 'service' ? 'Dienstleistung' : 'Produkt'}
                    </span>
                    <button
                      onClick={()=>onDelete(it.id)}
                      disabled={deletingId === it.id}
                      className="rounded-md border border-rose-200 bg-white/70 px-2 py-1 text-xs text-rose-700 backdrop-blur-sm transition hover:bg-rose-50 disabled:opacity-50"
                    >
                      Löschen
                    </button>
                  </div>
                  <div className="text-base font-medium text-gray-900">{it.name}</div>
                  <div className="mt-1 text-xs text-gray-600">
                    Einheit: <span className="font-medium text-gray-800">{it.unit}</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-gray-900">
                    {priceFmt(it.unit_price)} € <span className="font-normal text-gray-500">pro {it.unit}</span>
                  </div>
                  {it.description && (
                    <p className="mt-2 line-clamp-3 text-sm text-gray-700">{it.description}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

/* =================== kleine UI-Hilfskomponenten =================== */
function Th({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  return <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${className}`}>{children}</th>
}
function Td({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>
}
function SkeletonRows({ rows, cols }: { rows: number; cols: number[] }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="animate-pulse">
          {cols.map((w, c) => (
            <td key={c} className="px-4 py-3">
              <div className="h-4 rounded bg-gray-200" style={{ width: w }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 p-6 text-center">
      <svg width="64" height="64" viewBox="0 0 24 24" className="text-gray-300">
        <path fill="currentColor" d="M19 3H5a2 2 0 0 0-2 2v13a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V5a2 2 0 0 0-2-2m0 2v2H5V5zM5 10h14v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/>
      </svg>
      <div className="text-sm text-gray-500">Noch keine Einträge gefunden.</div>
      <div className="text-xs text-gray-400">Lege oben einen neuen Katalogeintrag an.</div>
    </div>
  )
}

/* =================== Hook: Debounce =================== */
function useDebouncedValue<T>(value: T, delay = 250) {
  const [deb, setDeb] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return deb
}

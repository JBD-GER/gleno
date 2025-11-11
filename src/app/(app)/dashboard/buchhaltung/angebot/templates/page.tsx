// ✅ PFAD: src/app/(app)/dashboard/buchhaltung/angebot/templates/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DocumentDuplicateIcon, TrashIcon, PencilSquareIcon } from '@heroicons/react/24/outline'

type Position = {
  type: 'item' | 'heading' | 'description' | 'subtotal' | 'separator'
  description?: string
  quantity?: number
  unit?: string
  unitPrice?: number
}

type TemplateRow = {
  id: string
  name: string
  title?: string | null
  intro?: string | null
  tax_rate: number
  positions: Position[]
  created_at?: string | null
  updated_at?: string | null
}

export default function TemplatesPage() {
  const [rows, setRows] = useState<TemplateRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/angebot/templates', { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.message || 'Fehler beim Laden')
        if (alive) setRows(data as TemplateRow[])
      } catch (e: any) {
        if (alive) setError(e?.message || 'Unbekannter Fehler')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const remove = async (id: string) => {
    const row = rows?.find(r => r.id === id)
    if (!row) return
    if (!confirm(`Template „${row.name}“ wirklich löschen?`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/angebot/templates/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Löschen fehlgeschlagen')
      setRows(prev => (prev ?? []).filter(r => r.id !== id))
    } catch (e: any) {
      alert(e?.message || 'Konnte Template nicht löschen.')
    } finally {
      setDeletingId(null)
    }
  }

  const fmtDate = (iso?: string | null) => {
    if (!iso) return '—'
    try {
      const d = new Date(iso)
      return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
    } catch {
      return iso
    }
  }

  return (
    <div className="px-6 py-6">
      {/* HEADER */}
      <div className="relative mb-6 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(1200px_240px_at_0%_0%,rgba(99,102,241,0.08),transparent_55%),radial-gradient(1200px_220px_at_100%_100%,rgba(20,184,166,0.10),transparent_55%)] pointer-events-none" />
        <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <DocumentDuplicateIcon className="h-7 w-7 text-slate-700" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Angebots-Templates
              </h1>
              <p className="text-sm text-slate-600">
                Vorlagen anlegen, bearbeiten und löschen. Nutze sie später beim Angebotserstellen.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/buchhaltung/angebot/templates/neu"
              className="group relative inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
            >
              <span className="absolute -inset-0.5 -z-10 rounded-xl bg-gradient-to-r from-indigo-500/30 to-teal-400/30 blur" />
              Neues Template
            </Link>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        {loading ? (
          <div className="grid place-items-center p-16 text-slate-600">Lade Templates…</div>
        ) : error ? (
          <div className="grid place-items-center p-16">
            <div className="text-center">
              <p className="text-rose-700">Fehler: {error}</p>
              <p className="mt-1 text-xs text-slate-500">Bitte Seite neu laden.</p>
            </div>
          </div>
        ) : !rows || rows.length === 0 ? (
          <div className="grid place-items-center p-16">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full border border-dashed border-slate-300 p-2">
                <div className="h-full w-full rounded-full bg-slate-100" />
              </div>
              <p className="text-slate-600">Noch keine Templates vorhanden.</p>
              <p className="mt-1 text-xs text-slate-500">
                Lege dein erstes Template an, um es später für Angebote zu verwenden.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="max-h-[75vh] overflow-auto">
              <table className="min-w-full text-left">
                <thead className="sticky top-0 z-10 bg-slate-50/70 backdrop-blur supports-[backdrop-filter]:bg-slate-50/60">
                  <tr className="text-[12.5px] uppercase tracking-wide text-slate-600">
                    {['Name', 'Titel', 'Positionen', 'USt', 'Aktualisiert', 'Aktionen'].map((h) => (
                      <th key={h} className="px-5 py-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="[&_tr:hover_td]:bg-slate-50">
                  {rows.map((tpl) => (
                    <tr key={tpl.id} className="group border-t border-slate-100 transition-colors">
                      <td className="px-5 py-4 text-sm font-medium text-slate-900">{tpl.name}</td>
                      <td className="px-5 py-4 text-sm text-slate-800">{tpl.title || '—'}</td>
                      <td className="px-5 py-4 text-sm text-slate-800">{tpl.positions?.length ?? 0}</td>
                      <td className="px-5 py-4 text-sm text-slate-800">{(tpl.tax_rate ?? 0)}%</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{fmtDate(tpl.updated_at)}</td>
                      <td className="px-5 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/buchhaltung/angebot/templates/${tpl.id}`}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                            title="Bearbeiten"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                            Bearbeiten
                          </Link>
                          <button
                            onClick={() => remove(tpl.id)}
                            disabled={deletingId === tpl.id}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-60"
                            title="Löschen"
                          >
                            <TrashIcon className="h-4 w-4" />
                            {deletingId === tpl.id ? 'Lösche…' : 'Löschen'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Templates sind dauerhaft gespeichert. Du kannst sie beim Angebotserstellen wiederverwenden.
      </p>
    </div>
  )
}

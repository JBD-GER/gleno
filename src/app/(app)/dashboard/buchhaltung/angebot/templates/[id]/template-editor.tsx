// ✅ PFAD: src/app/(app)/dashboard/buchhaltung/angebot/templates/[id]/template-editor.tsx
'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AddMenu from '../../angebot-erstellen/AddMenu'
import type { Position } from '../../angebot-erstellen/AngebotContext'
import type React from 'react'
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DroppableProvided,
  DraggableProvided,
} from '@hello-pangea/dnd'

type Template = {
  id: string
  name: string
  title?: string | null
  intro?: string | null
  tax_rate: number
  positions: Position[]
}

// Robuster Number-Parser (akzeptiert "2,5" & "2.5")
function toNum(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const n = parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export default function TemplateEditor({ initial }: { initial: Template }) {
  const router = useRouter()
  const [tpl, setTpl] = useState<Template>({ ...initial, positions: initial.positions ?? [] })
  const [saving, setSaving] = useState(false)

  // Bridge für AddMenu (kompatibel zu Dispatch<SetStateAction<Position[]>>)
  const setPositionsBridge: React.Dispatch<React.SetStateAction<Position[]>> = (next) => {
    setTpl((t) => {
      const prev = t.positions ?? []
      const value = typeof next === 'function' ? (next as (p: Position[]) => Position[])(prev) : next
      return { ...t, positions: value }
    })
  }

  const updatePos = (i: number, key: keyof Position, v: any) => {
    setPositionsBridge((ps) => {
      const copy = [...ps]
      // Mengen/Preise immer als Zahl speichern (mit Komma-Support)
      if (key === 'quantity' || key === 'unitPrice') {
        // @ts-ignore
        copy[i][key] = toNum(v)
      } else {
        // @ts-ignore
        copy[i][key] = v
      }
      return copy
    })
  }

  const removePos = (i: number) =>
    setPositionsBridge(ps => ps.filter((_, idx) => idx !== i))

  const onDragEnd = (res: DropResult) => {
    if (!res.destination) return
    const from = res.source.index
    const to = res.destination.index
    setPositionsBridge(ps => {
      const arr = [...ps]
      const [m] = arr.splice(from, 1)
      arr.splice(to, 0, m)
      return arr
    })
  }

  // Summen (robust gegen leere Felder/NaN)
  const netTotal = useMemo(
    () => (tpl.positions ?? []).reduce((sum, p) => {
      if (p.type !== 'item') return sum
      const qty = toNum(p.quantity)
      const price = toNum(p.unitPrice)
      return sum + qty * price
    }, 0),
    [tpl.positions]
  )

  const grossTotal = useMemo(
    () => netTotal * (1 + toNum(tpl.tax_rate) / 100),
    [netTotal, tpl.tax_rate]
  )

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/angebot/templates/${tpl.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: tpl.title ?? null,
          intro: tpl.intro ?? null,
          tax_rate: toNum(tpl.tax_rate),
          positions: tpl.positions,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload?.message || 'Fehler')
      // Zur Übersicht zurück
      router.replace('/dashboard/buchhaltung/angebot/templates')
      router.refresh()
    } catch (e: any) {
      alert(e?.message || 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 px-6 py-6">
      {/* Header */}
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">
          Template bearbeiten – <span className="text-slate-600">{tpl.name}</span>
        </h1>
        <div className="flex items-center gap-2">
          <a
            href="/dashboard/buchhaltung/angebot/templates"
            className="rounded-lg border border-slate-200 px-4 py-2 text-slate-800 hover:bg-slate-50"
          >
            Zurück
          </a>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
          >
            {saving ? 'Speichert…' : 'Speichern'}
          </button>
        </div>
      </div>

      {/* Titel */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 font-semibold text-gray-900">Titel</h3>
        <input
          type="text"
          value={tpl.title ?? ''}
          onChange={e => setTpl(t => ({ ...t, title: e.target.value }))}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 outline-none ring-indigo-200/60 focus:ring-4"
        />
      </div>

      {/* Einleitung */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 font-semibold text-gray-900">Einleitung</h3>
        <textarea
          value={tpl.intro ?? ''}
          onChange={e => setTpl(t => ({ ...t, intro: e.target.value }))}
          className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 outline-none ring-indigo-200/60 focus:ring-4"
          rows={3}
        />
      </div>

      {/* Positionen */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Positionen</h3>
          <AddMenu positions={tpl.positions} setPositions={setPositionsBridge} />
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="pos">
              {(provided: DroppableProvided) => (
                <table
                  className="w-full table-fixed border-collapse"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {/* Feste Spaltenbreiten → saubere Ausrichtung */}
                  <colgroup>
                    <col className="w-[45%]" />
                    <col className="w-[12%]" />
                    <col className="w-[13%]" />
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                    <col className="w-[0%]" />
                  </colgroup>

                  <thead className="bg-gray-50 text-[13px] uppercase tracking-wide text-gray-600">
                    <tr className="border-b border-gray-200">
                      <th className="px-3 py-2.5 text-left">Position</th>
                      <th className="px-3 py-2.5 text-left">Anzahl</th>
                      <th className="px-3 py-2.5 text-left">Einheit</th>
                      <th className="px-3 py-2.5 text-left">Preis</th>
                      <th className="px-3 py-2.5 text-right">Total</th>
                      <th className="px-3 py-2.5" />
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {tpl.positions.map((p, i) => (
                      <Draggable key={i} draggableId={`pos-${i}`} index={i}>
                        {(prov: DraggableProvided) => (
                          <tr
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            className="transition-colors hover:bg-gray-50"
                          >
                            {p.type === 'item' ? (
                              <>
                                <td className="px-3 align-middle">
                                  <input
                                    type="text"
                                    placeholder="Bezeichnung"
                                    value={p.description ?? ''}
                                    onChange={e => updatePos(i, 'description', e.target.value)}
                                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm outline-none ring-indigo-200/60 focus:ring-4"
                                  />
                                </td>

                                <td className="px-3 align-middle">
                                  <input
                                    // number: schnelle Eingabe mit Pfeilen; toNum fängt Komma/NAN ab
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={p.quantity ?? 0}
                                    onChange={e => updatePos(i, 'quantity', e.target.value)}
                                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-right text-sm outline-none ring-indigo-200/60 focus:ring-4"
                                  />
                                </td>

                                <td className="px-3 align-middle">
                                  <input
                                    type="text"
                                    placeholder="Einheit"
                                    value={p.unit ?? ''}
                                    onChange={e => updatePos(i, 'unit', e.target.value)}
                                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-center text-sm outline-none ring-indigo-200/60 focus:ring-4"
                                  />
                                </td>

                                <td className="px-3 align-middle">
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    placeholder="Preis"
                                    value={p.unitPrice ?? 0}
                                    onChange={e => updatePos(i, 'unitPrice', e.target.value)}
                                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-right text-sm outline-none ring-indigo-200/60 focus:ring-4"
                                  />
                                </td>

                                <td className="px-3 align-middle text-right text-sm font-medium text-gray-900">
                                  {(() => {
                                    const rowTotal = toNum(p.quantity) * toNum(p.unitPrice)
                                    return `€${rowTotal.toFixed(2)}`
                                  })()}
                                </td>

                                <td className="px-3 align-middle">
                                  <button
                                    type="button"
                                    onClick={() => removePos(i)}
                                    className="inline-flex h-9 items-center rounded-md px-2 text-sm text-red-600 hover:bg-red-50"
                                    title="Position entfernen"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </>
                            ) : (
                              <td colSpan={6} className="px-3 py-2 align-middle">
                                {p.type === 'heading' && (
                                  <input
                                    type="text"
                                    value={p.description ?? ''}
                                    onChange={e => updatePos(i, 'description', e.target.value)}
                                    className="h-9 w-full border-b border-black bg-transparent px-1 text-sm font-semibold outline-none"
                                  />
                                )}
                                {p.type === 'description' && (
                                  <textarea
                                    value={p.description ?? ''}
                                    onChange={e => updatePos(i, 'description', e.target.value)}
                                    className="w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-sm outline-none ring-indigo-200/60 focus:ring-4"
                                    rows={2}
                                  />
                                )}
                                {p.type === 'subtotal' && (
                                  <div className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm font-semibold">
                                    <span>{p.description || 'Zwischensumme'}:</span>
                                    <span>
                                      €
                                      {tpl.positions
                                        .slice(0, i)
                                        .reduce((s, pp) =>
                                          s + (pp.type === 'item'
                                            ? toNum(pp.quantity) * toNum(pp.unitPrice)
                                            : 0
                                          ), 0).toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                {p.type === 'separator' && <hr className="my-2 border-t-2 border-gray-200" />}
                              </td>
                            )}
                          </tr>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </tbody>
                </table>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {/* Footer: Summen & Steuer */}
        <div className="mt-4 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <span className="text-sm text-gray-700">
            Total netto: <span className="font-medium text-gray-900">EUR {netTotal.toFixed(2)}</span>
          </span>
          <div className="space-x-4 text-sm">
            <label className="ml-2 text-gray-700">
              USt
              <select
                value={tpl.tax_rate}
                onChange={e => setTpl(t => ({ ...t, tax_rate: toNum(e.target.value) }))}
                className="ml-2 h-9 rounded-md border border-gray-200 bg-white px-2 outline-none ring-indigo-200/60 focus:ring-4"
              >
                {[0, 7, 19].map(r => (
                  <option key={r} value={r}>{r}%</option>
                ))}
              </select>
            </label>
            <span className="ml-2 font-semibold text-gray-900">
              Total brutto: EUR {grossTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Aktionen */}
        <div className="mt-4 flex justify-end gap-3">
          <a
            href="/dashboard/buchhaltung/angebot/templates"
            className="rounded-lg border border-slate-200 px-4 py-2 text-slate-800 hover:bg-slate-50"
          >
            Abbrechen
          </a>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-black disabled:opacity-60"
          >
            {saving ? 'Speichert…' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}

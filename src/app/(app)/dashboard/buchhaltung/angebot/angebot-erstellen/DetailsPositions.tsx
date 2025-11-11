// src/app/(app)/dashboard/buchhaltung/angebot/angebot-erstellen/DetailsPositions.tsx
'use client'

import React, { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAngebot } from './AngebotContext'
import AddMenu from './AddMenu'
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DroppableProvided,
  DraggableProvided,
} from '@hello-pangea/dnd'

const EUR = (n: number) => `€${(Number.isFinite(n) ? n : 0).toFixed(2)}`

// nur lokaler Hilfstyp für TS
type CustomerWithAddress = {
  street?: string | null
  house_number?: string | null
  postal_code?: string | null
  city?: string | null
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  customer_number?: string | null
  [k: string]: any
}

// === Katalog-Typen (lokal) ===
type CatalogItem = {
  id: string
  kind: 'product' | 'service'
  name: string
  unit: string
  unit_price: number
  description?: string | null
  created_at: string
  updated_at: string
}

// Kleines Modal für Katalog-Auswahl
function CatalogModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean
  onClose: () => void
  onPick: (it: CatalogItem) => void
}) {
  const [items, setItems] = React.useState<CatalogItem[]>([])
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)
  const [q, setQ] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    let ignore = false
    const load = async () => {
      setLoading(true); setErr(null)
      try {
        const res = await fetch('/api/catalog/items?q=' + encodeURIComponent(q))
        const data = await res.json()
        if (!res.ok) throw new Error(data?.message || 'Fehler beim Laden')
        if (!ignore) setItems(Array.isArray(data) ? data : [])
      } catch (e: any) {
        if (!ignore) setErr(e?.message || 'Fehler beim Laden')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [open, q])

  // Esc schließt
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* dialog */}
      <div className="relative z-[101] w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Aus Katalog hinzufügen</h3>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        <div className="mb-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suchen (Name, Einheit, Beschreibung)…"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            autoFocus
          />
        </div>

        <div className="max-h-[50vh] overflow-auto rounded-lg border border-gray-200">
          {loading ? (
            <div className="p-4 text-sm text-gray-500">Lade…</div>
          ) : err ? (
            <div className="p-4 text-sm text-rose-600">{err}</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">Keine Einträge.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left">Typ</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Einheit</th>
                  <th className="px-3 py-2 text-right">Preis/Einheit</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{it.kind === 'service' ? 'Dienstleistung' : 'Produkt'}</td>
                    <td className="px-3 py-2">{it.name}</td>
                    <td className="px-3 py-2">{it.unit}</td>
                    <td className="px-3 py-2 text-right">{it.unit_price.toFixed(2).replace('.', ',')}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => onPick(it)}
                        className="rounded-md bg-primary px-3 py-1 text-white hover:bg-primary-dark"
                      >
                        Übernehmen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-3 flex justify-end">
          <button onClick={onClose} className="rounded-md border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
            Schließen
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DetailsPositions({ onNext }: { onNext: () => void }) {
  const router = useRouter()
  const {
    selectedCustomer,
    offerId,
    setOfferId,
    offerNumber,
    setOfferNumber,

    date,
    validUntil,
    billingSettings,
    title,
    setTitle,
    intro,
    setIntro,
    positions,
    setPositions,
    taxRate,
    setTaxRate,
    discount,
    setDiscount,
  } = useAngebot()

  // Anzeigename (Firma bevorzugt)
  const sc = (selectedCustomer ?? {}) as CustomerWithAddress
  const first = (sc.first_name ?? '').toString().trim()
  const last = (sc.last_name ?? '').toString().trim()
  const company = (sc.company ?? '').toString().trim()
  const displayName = (company || `${first} ${last}`.trim()).trim()

  // Adresszeilen – strukturierte Felder
  const street      = (sc.street ?? '').toString().trim()
  const houseNumber = (sc.house_number ?? '').toString().trim()
  const postal      = (sc.postal_code ?? '').toString().trim()
  const city        = (sc.city ?? '').toString().trim()

  const line1 = displayName
  const line2 = [street, houseNumber].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  const line3 = [postal, city].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  const addressLines = [line1, line2, line3].filter(Boolean)

  // responsive DnD
  const [isMobile, setIsMobile] = React.useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)')
    const apply = () => setIsMobile(mql.matches)
    apply()
    mql.addEventListener?.('change', apply)
    return () => mql.removeEventListener?.('change', apply)
  }, [])

  const removePos = (i: number) => setPositions(ps => ps.filter((_, idx) => idx !== i))
  const updatePos = (i: number, key: keyof typeof positions[0], v: any) => {
    setPositions(ps => {
      const c = [...ps]
      // @ts-ignore
      c[i][key] = v
      return c
    })
  }
  const onDragEnd = (res: DropResult) => {
    if (!res.destination) return
    const from = res.source.index
    const to = res.destination.index
    setPositions(ps => {
      const arr = [...ps]
      const [m] = arr.splice(from, 1)
      arr.splice(to, 0, m)
      return arr
    })
  }

  const did = (i: number) => {
    const anyP: any = positions[i]
    return (anyP?.id ? `pos-${anyP.id}` : `pos-${i}`) as string
  }

  // Summen + Rabatt
  const netSubtotal = useMemo(
    () =>
      positions.reduce(
        (sum: number, p: any) =>
          sum + (p.type === 'item' ? (p.quantity ?? 0) * (p.unitPrice ?? 0) : 0),
        0
      ),
    [positions]
  )

  const calc = useMemo(() => {
    const taxFactor = 1 + (Number(taxRate) || 0) / 100
    const grossBefore = netSubtotal * taxFactor
    if (!discount.enabled || discount.value <= 0) {
      const tax = netSubtotal * (taxFactor - 1)
      return {
        discountAmount: 0,
        netAfterDiscount: netSubtotal,
        taxAmount: tax,
        grossBeforeDiscount: grossBefore,
        grossAfterDiscount: netSubtotal + tax,
      }
    }
    const clamp = (n: number) => (n < 0 ? 0 : n)
    if (discount.base === 'net') {
      let amount =
        discount.type === 'percent'
          ? (netSubtotal * discount.value) / 100
          : discount.value
      amount = Math.min(Math.max(0, amount), netSubtotal)
      const netAfter = clamp(netSubtotal - amount)
      const tax = netAfter * (taxFactor - 1)
      const grossAfter = netAfter + tax
      return {
        discountAmount: amount,
        netAfterDiscount: netAfter,
        taxAmount: tax,
        grossBeforeDiscount: grossBefore,
        grossAfterDiscount: grossAfter,
      }
    } else {
      let amount =
        discount.type === 'percent'
          ? (grossBefore * discount.value) / 100
          : discount.value
      amount = Math.min(Math.max(0, amount), grossBefore)
      const grossAfter = clamp(grossBefore - amount)
      const netAfter = grossAfter / taxFactor
      const tax = grossAfter - netAfter
      return {
        discountAmount: amount,
        netAfterDiscount: netAfter,
        taxAmount: tax,
        grossBeforeDiscount: grossBefore,
        grossAfterDiscount: grossAfter,
      }
    }
  }, [discount, netSubtotal, taxRate])

  // Persistenz/Commit
  const [saving, setSaving] = React.useState(false)

  const handleSaveAndNext = async () => {
    if (!selectedCustomer || saving) return
    setSaving(true)
    try {
      const key = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random()}`)
      const payload = {
        customer: selectedCustomer,
        positions,
        meta: {
          title,
          intro,
          date,
          validUntil,
          taxRate,
          billingSettings,
          commit: true,
          discount: {
            enabled: !!discount?.enabled,
            label: discount?.label ?? 'Rabatt',
            type: discount?.type ?? 'percent',
            base: discount?.base ?? 'net',
            value: Number(discount?.value ?? 0),
          },
          ...(offerId ? { offerId } : {}),
        },
      }

      const res = await fetch('/api/angebot/generate-offer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': key,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        // optional: Fehlerhandling anzeigen
        return
      }

      const newId = res.headers.get('X-Offer-Id')
      const newNo = res.headers.get('X-Offer-Number')
      if (newId) setOfferId(newId)
      if (newNo) setOfferNumber(newNo)

      onNext()
    } finally {
      setSaving(false)
    }
  }

  // ====== NEU: Katalog-Button + Picker ======
  const [catalogOpen, setCatalogOpen] = React.useState(false)
  const handlePickFromCatalog = (it: CatalogItem) => {
    setPositions(ps => {
      const next = [...ps]
      // 1) Detailposition
      next.push({
        type: 'item',
        description: it.name,
        quantity: 1,
        unit: it.unit || 'Stk.',
        unitPrice: Number(it.unit_price) || 0,
      } as any)
      // 2) optionale Beschreibung separat
      const desc = (it.description || '').toString().trim()
      if (desc) {
        next.push({ type: 'description', description: desc } as any)
      }
      return next
    })
    setCatalogOpen(false)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
        2. Details &amp; Positionen
      </h2>

      {/* Obere Box */}
      <div className="grid grid-cols-1 gap-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-2">
        {/* Kunde */}
        <div>
          <h3 className="mb-2 font-semibold text-gray-900">Kunde</h3>
          <textarea
            readOnly
            value={addressLines.join('\n')}
            className="h-24 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 outline-none"
          />
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="text-gray-600">Angebotsnr.</div>
          <div className="font-medium text-gray-900">{offerNumber || 'wird erzeugt'}</div>

          <div className="text-gray-600">Kundennr.</div>
          <div className="font-medium text-gray-900">{sc.customer_number ?? '—'}</div>

          <div className="text-gray-600">Datum</div>
          <div className="font-medium text-gray-900">{date || '—'}</div>

          <div className="text-gray-600">Gültig bis</div>
          <div className="font-medium text-gray-900">{validUntil || '—'}</div>

          <div className="text-gray-600">Kontakt</div>
          <div className="font-medium text-gray-900">{displayName}</div>
        </div>
      </div>

      {/* Titel */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 font-semibold text-gray-900">Titel</h3>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 outline-none ring-indigo-200/60 focus:ring-4"
        />
      </div>

      {/* Einleitung */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 font-semibold text-gray-900">Einleitung</h3>
        <textarea
          value={intro}
          onChange={e => setIntro(e.target.value)}
          className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 outline-none ring-indigo-200/60 focus:ring-4"
          rows={3}
        />
      </div>

      {/* Positionen */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-semibold text-gray-900">Positionen</h3>
          <div className="flex items-center gap-2">
            <AddMenu positions={positions} setPositions={setPositions} />
            {/* NEU: Katalog Button */}
            <button
              type="button"
              onClick={() => setCatalogOpen(true)}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-50"
              title="Aus Katalog hinzufügen"
            >
              Katalog
            </button>
          </div>
        </div>

        {/* Modal */}
        <CatalogModal
          open={catalogOpen}
          onClose={() => setCatalogOpen(false)}
          onPick={handlePickFromCatalog}
        />

        <DragDropContext onDragEnd={onDragEnd}>
          {isMobile ? (
            // ---------- MOBILE ----------
            <Droppable droppableId="pos-mobile">
              {(provided: DroppableProvided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                  {positions.map((p, i) => (
                    <Draggable key={did(i)} draggableId={did(i)} index={i}>
                      {(prov: DraggableProvided) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          className="rounded-lg border border-gray-200 bg-white shadow-sm"
                        >
                          {/* Kopf */}
                          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                            <div
                              style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none', cursor: 'grab' }}
                              className="flex items-center gap-2 text-xs text-gray-500"
                              {...prov.dragHandleProps}
                              title="Ziehen zum Sortieren"
                            >
                              <span aria-hidden>☰</span>
                              <span>Pos. {i + 1}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removePos(i)}
                              className="rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                              title="Position entfernen"
                            >
                              ✕
                            </button>
                          </div>

                          {/* Inhalt je Typ */}
                          {p.type === 'item' ? (
                            <div className="grid grid-cols-1 gap-3 p-3">
                              <label className="flex flex-col gap-1">
                                <span className="text-xs text-gray-600">Bezeichnung</span>
                                <input
                                  type="text"
                                  placeholder="Bezeichnung"
                                  value={(p as any).description ?? ''}
                                  onChange={e => updatePos(i, 'description', e.target.value)}
                                  className="w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-sm outline-none ring-indigo-200/60 focus:ring-4"
                                />
                              </label>

                              <div className="grid grid-cols-3 gap-2">
                                <label className="flex flex-col gap-1">
                                  <span className="text-xs text-gray-600">Anzahl</span>
                                  <input
                                    type="number"
                                    min={1}
                                    value={(p as any).quantity ?? 1}
                                    onChange={e => updatePos(i, 'quantity', Number(e.target.value))}
                                    className="w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-right text-sm outline-none ring-indigo-200/60 focus:ring-4"
                                  />
                                </label>
                                <label className="flex flex-col gap-1">
                                  <span className="text-xs text-gray-600">Einheit</span>
                                  <input
                                    type="text"
                                    placeholder="z. B. Stk."
                                    value={(p as any).unit ?? ''}
                                    onChange={e => updatePos(i, 'unit', e.target.value)}
                                    className="w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-center text-sm outline-none ring-indigo-200/60 focus:ring-4"
                                  />
                                </label>
                                <label className="flex flex-col gap-1">
                                  <span className="text-xs text-gray-600">Preis</span>
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    placeholder="0,00"
                                    value={(p as any).unitPrice ?? 0}
                                    onChange={e => updatePos(i, 'unitPrice', Number(e.target.value))}
                                    className="w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-right text-sm outline-none ring-indigo-200/60 focus:ring-4"
                                  />
                                </label>
                              </div>

                              <div className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm">
                                <span className="text-gray-600">Total</span>
                                <span className="font-semibold text-gray-900">
                                  {EUR(((p as any).quantity ?? 0) * ((p as any).unitPrice ?? 0))}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3">
                              {p.type === 'heading' && (
                                <input
                                  type="text"
                                  value={(p as any).description ?? ''}
                                  onChange={e => updatePos(i, 'description', e.target.value)}
                                  className="w-full border-b border-black bg-transparent px-1 py-1 text-sm font-semibold outline-none"
                                  placeholder="Zwischenüberschrift"
                                />
                              )}

                              {p.type === 'description' && (
                                <textarea
                                  value={(p as any).description ?? ''}
                                  onChange={e => updatePos(i, 'description', e.target.value)}
                                  className="w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-sm outline-none ring-indigo-200/60 focus:ring-4"
                                  rows={3}
                                  placeholder="Beschreibungstext…"
                                />
                              )}

                              {p.type === 'subtotal' && (
                                <div className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm font-semibold">
                                  <span>{(p as any).description || 'Zwischensumme'}:</span>
                                  <span>
                                    {EUR(
                                      positions
                                        .slice(0, i)
                                        .reduce(
                                          (s, pp: any) =>
                                            s + (pp.type === 'item'
                                              ? (pp.quantity ?? 0) * (pp.unitPrice ?? 0)
                                              : 0),
                                          0
                                        )
                                    )}
                                  </span>
                                </div>
                              )}

                              {p.type === 'separator' && <hr className="my-2 border-t-2 border-gray-200" />}
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ) : (
            // ---------- DESKTOP ----------
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <Droppable droppableId="pos-desktop">
                {(provided: DroppableProvided) => (
                  <table className="w-full table-auto border-collapse">
                    <thead className="bg-gray-50 text-[13px] uppercase tracking-wide text-gray-600">
                      <tr className="border-b border-gray-200">
                        <th className="px-3 py-2 text-left">Position</th>
                        <th className="px-3 py-2 text-left">Anzahl</th>
                        <th className="px-3 py-2 text-left">Einheit</th>
                        <th className="px-3 py-2 text-left">Preis</th>
                        <th className="px-3 py-2 text-right">Total</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="divide-y divide-gray-100"
                    >
                      {positions.map((p, i) => (
                        <Draggable key={did(i)} draggableId={did(i)} index={i}>
                          {(prov: DraggableProvided) => (
                            <tr
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              className="transition-colors hover:bg-gray-50"
                            >
                              {p.type === 'item' ? (
                                <>
                                  <td className="px-3 py-2 align-top">
                                    <input
                                      type="text"
                                      placeholder="Bezeichnung"
                                      value={(p as any).description ?? ''}
                                      onChange={e => updatePos(i, 'description', e.target.value)}
                                      className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm outline-none ring-indigo-200/60 focus:ring-4"
                                    />
                                  </td>
                                  <td className="px-3 py-2 align-top">
                                    <input
                                      type="number"
                                      min={1}
                                      value={(p as any).quantity ?? 1}
                                      onChange={e => updatePos(i, 'quantity', Number(e.target.value))}
                                      className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-right text-sm outline-none ring-indigo-200/60 focus:ring-4"
                                    />
                                  </td>
                                  <td className="px-3 py-2 align-top">
                                    <input
                                      type="text"
                                      placeholder="Einheit"
                                      value={(p as any).unit ?? ''}
                                      onChange={e => updatePos(i, 'unit', e.target.value)}
                                      className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-center text-sm outline-none ring-indigo-200/60 focus:ring-4"
                                    />
                                  </td>
                                  <td className="px-3 py-2 align-top">
                                    <input
                                      type="number"
                                      min={0}
                                      step={0.01}
                                      placeholder="Preis"
                                      value={(p as any).unitPrice ?? 0}
                                      onChange={e => updatePos(i, 'unitPrice', Number(e.target.value))}
                                      className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-right text-sm outline-none ring-indigo-200/60 focus:ring-4"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-right align-top text-sm font-medium text-gray-900">
                                    {EUR(((p as any).quantity ?? 0) * ((p as any).unitPrice ?? 0))}
                                  </td>
                                  <td className="px-3 py-2 align-top">
                                    <button
                                      type="button"
                                      onClick={() => removePos(i)}
                                      className="inline-flex items-center rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                                      title="Position entfernen"
                                    >
                                      ✕
                                    </button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td colSpan={5} className="px-3 py-2 align-top">
                                    {p.type === 'heading' && (
                                      <input
                                        type="text"
                                        value={(p as any).description ?? ''}
                                        onChange={e => updatePos(i, 'description', e.target.value)}
                                        className="w-full border-b border-black bg-transparent px-1 py-1 text-sm font-semibold outline-none"
                                      />
                                    )}

                                    {p.type === 'description' && (
                                      <textarea
                                        value={(p as any).description ?? ''}
                                        onChange={e => updatePos(i, 'description', e.target.value)}
                                        className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm outline-none ring-indigo-200/60 focus:ring-4"
                                        rows={2}
                                      />
                                    )}

                                    {p.type === 'subtotal' && (
                                      <div className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm font-semibold">
                                        <span>{(p as any).description || 'Zwischensumme'}:</span>
                                        <span>
                                          {EUR(
                                            positions
                                              .slice(0, i)
                                              .reduce(
                                                (s, pp: any) =>
                                                  s + (pp.type === 'item'
                                                    ? (pp.quantity ?? 0) * (pp.unitPrice ?? 0)
                                                    : 0),
                                                0
                                              )
                                          )}
                                        </span>
                                      </div>
                                    )}

                                    {p.type === 'separator' && <hr className="my-2 border-t-2 border-gray-200" />}
                                  </td>

                                  <td className="px-3 py-2 align-top">
                                    <button
                                      type="button"
                                      onClick={() => removePos(i)}
                                      className="inline-flex items-center rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                                      title="Position entfernen"
                                    >
                                      ✕
                                    </button>
                                  </td>
                                </>
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
            </div>
          )}
        </DragDropContext>

        {/* Rabatt-Konfiguration */}
        <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-3 md:grid-cols-12">
          <div className="md:col-span-12">
            <h4 className="font-semibold text-gray-900">Rabatt</h4>
          </div>

          <label className="flex items-center gap-2 md:col-span-3">
            <input
              type="checkbox"
              checked={discount.enabled}
              onChange={e => setDiscount(s => ({ ...s, enabled: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-800">Rabatt anwenden</span>
          </label>

          <label className="md:col-span-3 flex flex-col gap-1">
            <span className="text-xs text-gray-600">Bezeichnung</span>
            <input
              type="text"
              value={discount.label}
              onChange={e => setDiscount(s => ({ ...s, label: e.target.value }))}
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-sm outline-none ring-indigo-200/60 focus:ring-4"
              placeholder="z. B. Stammkundenrabatt"
            />
          </label>

          <label className="md:col-span-2 flex flex-col gap-1">
            <span className="text-xs text-gray-600">Art</span>
            <select
              value={discount.type}
              onChange={e => setDiscount(s => ({ ...s, type: e.target.value as any }))}
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-sm outline-none ring-indigo-200/60 focus:ring-4"
            >
              <option value="percent">Prozent (%)</option>
              <option value="amount">Fixbetrag (EUR)</option>
            </select>
          </label>

          <label className="md:col-span-2 flex flex-col gap-1">
            <span className="text-xs text-gray-600">Basis</span>
            <select
              value={discount.base}
              onChange={e => setDiscount(s => ({ ...s, base: e.target.value as any }))}
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-sm outline-none ring-indigo-200/60 focus:ring-4"
            >
              <option value="net">Netto</option>
              <option value="gross">Brutto</option>
            </select>
          </label>

          <label className="md:col-span-2 flex flex-col gap-1">
            <span className="text-xs text-gray-600">
              Wert {discount.type === 'percent' ? '(%)' : '(EUR)'}
            </span>
            <input
              type="number"
              min={0}
              step={discount.type === 'percent' ? 0.1 : 0.01}
              value={discount.value}
              onChange={e => setDiscount(s => ({ ...s, value: Math.max(0, Number(e.target.value)) }))}
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-right text-sm outline-none ring-indigo-200/60 focus:ring-4"
            />
          </label>
        </div>

        {/* Summen */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2 text-sm">
            <div className="text-gray-700">
              Zwischensumme netto: <span className="font-medium text-gray-900">{EUR(netSubtotal)}</span>
            </div>

            {discount.enabled && discount.value > 0 && (
              <>
                <div className="text-gray-700">
                  {discount.label || 'Rabatt'} ({discount.base === 'net' ? 'auf Netto' : 'auf Brutto'}
                  {discount.type === 'percent' ? ` ${discount.value}%` : ''}):{' '}
                  <span className="font-medium text-gray-900">−{EUR(calc.discountAmount)}</span>
                </div>
                <div className="text-gray-700">
                  Netto nach Rabatt:{' '}
                  <span className="font-medium text-gray-900">{EUR(calc.netAfterDiscount)}</span>
                </div>
              </>
            )}

            <div className="text-gray-700">
              USt{' '}
              <select
                value={taxRate}
                onChange={e => setTaxRate(Number(e.target.value))}
                className="ml-1 rounded-md border border-gray-200 bg-white px-2 py-1 outline-none ring-indigo-200/60 focus:ring-4"
              >
                {[0, 7, 19].map(r => (
                  <option key={r} value={r}>{r}%</option>
                ))}
              </select>
              : <span className="font-medium text-gray-900">{EUR(calc.taxAmount)}</span>
            </div>

            <div className="text-gray-900 font-semibold">
              Gesamt brutto: <span className="font-semibold text-gray-900">{EUR(calc.grossAfterDiscount)}</span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <textarea
            readOnly
            value="Wir freuen uns über Ihre Auftragsbestätigung"
            className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 outline-none"
            rows={2}
          />
        </div>

        {/* Aktionen */}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end sm:gap-3">
          <button
            onClick={() => router.push('/dashboard/buchhaltung')}
            className="w-full sm:w-auto rounded-lg border border-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-50"
          >
            Abbrechen
          </button>

          <button
            onClick={handleSaveAndNext}
            disabled={saving}
            className={`w-full sm:w-auto rounded-lg px-4 py-2 text-white ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark'}`}
          >
            {saving ? 'Speichere…' : 'Speichern & Weiter'}
          </button>
        </div>
      </div>
    </div>
  )
}

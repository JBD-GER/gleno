'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'

function cls(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(' ')
}

type Props = {
  open: boolean
  onClose: () => void
  requestId: string
}
type DiscountType = 'percent' | 'fixed'

export default function OfferCreateModal({ open, onClose, requestId }: Props) {
  const [title, setTitle] = React.useState('')
  const [net, setNet] = React.useState<number | ''>('')
  const [tax, setTax] = React.useState<number | ''>(19)
  const [discountType, setDiscountType] = React.useState<DiscountType>('percent')
  const [discountLabel, setDiscountLabel] = React.useState('Rabatt')
  const [discountValue, setDiscountValue] = React.useState<number | ''>(0)
  const [files, setFiles] = React.useState<File[]>([])
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [grossPreview, setGrossPreview] = React.useState<number>(0)

  // ESC + Body Scroll Lock
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)

    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  // Brutto-Vorschau berechnen
  React.useEffect(() => {
    const n = Number(net || 0)
    const t = Number(tax || 0)
    const dv = Number(discountValue || 0)

    const after =
      discountType === 'percent'
        ? Math.max(0, n * (1 - dv / 100))
        : Math.max(0, n - dv)

    const gross = after + after * (t / 100)
    setGrossPreview(Math.round(gross * 100) / 100)
  }, [net, tax, discountType, discountValue])

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = Array.from(e.target.files || [])
    if (!f.length) return
    setFiles(prev => [...prev, ...f])
    e.currentTarget.value = ''
  }

  const removeFile = (name: string) => {
    setFiles(prev => prev.filter(f => f.name !== name))
  }

  const submit = async () => {
    setError(null)
    if (!title.trim() || net === '' || tax === '' || !discountLabel.trim() || files.length === 0) {
      setError('Bitte alle Pflichtfelder ausfüllen.')
      return
    }

    setBusy(true)
    try {
      const fd = new FormData()
      fd.set('request_id', requestId)
      fd.set('title', title.trim())
      fd.set('net_total', String(net))
      fd.set('tax_rate', String(tax))
      fd.set('discount_type', discountType)
      fd.set('discount_value', String(discountValue || 0))
      fd.set('discount_label', discountLabel.trim())
      files.forEach(f => fd.append('files[]', f))

      const res = await fetch('/api/markt/offers/create', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) throw new Error(j?.error || res.statusText)

      // Dokumenten-Cloud (Tab „Angebote“) aktualisieren
      window.dispatchEvent(
        new CustomEvent('documents:updated', { detail: { requestId } }),
      )

      onClose()
    } catch (e: any) {
      setError(e.message || 'Fehler beim Anlegen.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  const node = (
    <div className="fixed inset-0 z-[100000] flex items-start justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-900/25 backdrop-blur-xl"
        onClick={() => !busy && onClose()}
      />

      {/* Card */}
      <div
        className={cls(
          'relative z-10 mt-8 w-full max-w-3xl',
          'max-h-[92vh] overflow-y-auto',
          'rounded-3xl border border-white/60 bg-white/90 backdrop-blur-xl',
          'p-6 shadow-[0_10px_34px_rgba(2,6,23,0.12)] ring-1 ring-white/60',
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium text-slate-900">
              Angebot anlegen
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Titel, Nettosumme, MwSt. und Rabatt definieren. Mindestens eine Datei anhängen.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="rounded-xl border border-white/60 bg-white px-3 py-1.5 text-sm hover:shadow-sm"
          >
            Schließen
          </button>
        </div>

        {/* Form */}
        <div className="mt-4 grid grid-cols-1 gap-3">
          {/* Titel */}
          <label className="text-sm">
            <span className="block mb-1 text-xs font-medium text-slate-600">
              Überschrift*
            </span>
            <input
              className="w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm outline-none
                         shadow-sm focus:ring-2 focus:ring-indigo-200 focus:border-transparent"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="z. B. Angebot Badezimmer-Sanierung"
            />
          </label>

          {/* Netto / MwSt / Brutto */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="block mb-1 text-xs font-medium text-slate-600">
                Netto-Summe (€)*
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm outline-none
                           shadow-sm focus:ring-2 focus:ring-indigo-200 focus:border-transparent"
                value={net}
                onChange={e =>
                  setNet(e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </label>

            <label className="text-sm">
              <span className="block mb-1 text-xs font-medium text-slate-600">
                MwSt (%)*</span>
              <input
                type="number"
                min={0}
                max={100}
                step="0.1"
                className="w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm outline-none
                           shadow-sm focus:ring-2 focus:ring-indigo-200 focus:border-transparent"
                value={tax}
                onChange={e =>
                  setTax(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="0, 7, 19 oder individuell"
              />
            </label>

            <div className="text-sm">
              <span className="block mb-1 text-xs font-medium text-slate-600">
                Brutto (Vorschau)
              </span>
              <div className="rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm">
                {grossPreview.toFixed(2)} €
              </div>
            </div>
          </div>

          {/* Rabatt */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="block mb-1 text-xs font-medium text-slate-600">
                Rabatt-Typ*
              </span>
              <select
                className="w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm outline-none
                           shadow-sm focus:ring-2 focus:ring-indigo-200 focus:border-transparent"
                value={discountType}
                onChange={e =>
                  setDiscountType(e.target.value as DiscountType)
                }
              >
                <option value="percent">% Prozent</option>
                <option value="fixed">€ Fix</option>
              </select>
            </label>

            <label className="text-sm">
              <span className="block mb-1 text-xs font-medium text-slate-600">
                Rabatt-Wert*
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm outline-none
                           shadow-sm focus:ring-2 focus:ring-indigo-200 focus:border-transparent"
                value={discountValue}
                onChange={e =>
                  setDiscountValue(
                    e.target.value === '' ? '' : Number(e.target.value),
                  )
                }
              />
            </label>

            <label className="text-sm">
              <span className="block mb-1 text-xs font-medium text-slate-600">
                Rabatt-Bezeichnung*
              </span>
              <input
                className="w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm outline-none
                           shadow-sm focus:ring-2 focus:ring-indigo-200 focus:border-transparent"
                value={discountLabel}
                onChange={e => setDiscountLabel(e.target.value)}
                placeholder="z. B. Neukunden-Rabatt"
              />
            </label>
          </div>

          {/* Dateien */}
          <div className="text-sm">
            <span className="block mb-1 text-xs font-medium text-slate-600">
              Angebots-Dateien* (PDF, PNG, JPG)
            </span>
            <label
              className="inline-flex items-center gap-2 rounded-xl border border-white/60 bg-white/80
                         px-3 py-2 text-sm cursor-pointer shadow-sm hover:bg-white/90"
            >
              <input
                type="file"
                className="hidden"
                accept=".pdf,image/*"
                multiple
                onChange={onFilePick}
              />
              Dateien wählen
            </label>

            {!!files.length && (
              <ul className="mt-2 space-y-1 text-xs">
                {files.map(f => (
                  <li
                    key={f.name}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(f.name)}
                      className="text-slate-500 hover:underline"
                    >
                      entfernen
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <div className="text-xs text-rose-600">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => !busy && onClose()}
              className="rounded-xl border border-white/60 bg-white px-3 py-1.5 text-sm hover:shadow-sm disabled:opacity-60"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={
                busy ||
                !title.trim() ||
                net === '' ||
                tax === '' ||
                !files.length ||
                !discountLabel.trim()
              }
              className={cls(
                'rounded-xl px-3 py-1.5 text-sm text-white',
                'bg-slate-900 hover:opacity-90',
                'disabled:opacity-60 disabled:cursor-not-allowed',
              )}
            >
              {busy ? 'Speichere…' : 'Angebot erstellen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined'
    ? createPortal(node, document.body)
    : node
}

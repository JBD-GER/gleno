// src/components/OfferReviewModal.tsx
'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { supabaseClient } from '@/lib/supabase-client'

function cls(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(' ')
}

function money(n: number) {
  return (Math.round(Number(n || 0) * 100) / 100).toFixed(2) + ' €'
}

/** Extrahiert eine Offer-UUID aus diversen Formaten (OFFER:CTA:<uuid>, offer_<uuid>, etc.). */
function normalizeOfferId(input: string): string | null {
  const s = String(input || '')
  const uuidMatch = s.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  )
  if (uuidMatch) return uuidMatch[0]

  const signMatch = s.match(
    /offer_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  )
  if (signMatch) return signMatch[1]

  const ctaMatch = s.match(/OFFER:[A-Z]+:([0-9a-f-]{36})/i)
  if (ctaMatch) return ctaMatch[1]

  return null
}

type Props = {
  open: boolean
  onClose: () => void
  offerId: string // darf "unsauber" sein – wir normalisieren
  role: 'konsument' | 'partner' | 'admin' | 'unknown'
}

type OfferData = {
  id: string
  request_id: string
  title: string
  net_total: number
  tax_rate: number
  discount_type: 'percent' | 'fixed'
  discount_value: number
  discount_label: string
  gross_total: number
  status: 'created' | 'accepted' | 'declined'
  signature_id: string
  files: { id: string; name: string | null; path: string; url: string | null }[]
}

export default function OfferReviewModal({ open, onClose, offerId, role }: Props) {
  const sb = supabaseClient()
  const [busy, setBusy] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<OfferData | null>(null)

  // ESC + Scroll Lock
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

  // Daten laden
  React.useEffect(() => {
    if (!open) return
    let cancelled = false

    ;(async () => {
      setError(null)
      setLoading(true)
      setData(null)

      try {
        const id = normalizeOfferId(offerId)
        if (!id) throw new Error('Ungültige Angebots-ID (keine UUID gefunden).')

        const { data: offer, error: offErr } = await sb
          .from('market_offers')
          .select(
            'id, request_id, title, net_total, tax_rate, discount_type, discount_value, discount_label, gross_total, status, signature_id',
          )
          .eq('id', id)
          .single()

        if (offErr) throw new Error(offErr.message || 'Angebot nicht gefunden')
        if (!offer) throw new Error('Angebot nicht gefunden')

        const { data: files, error: fileErr } = await sb
          .from('market_offer_files')
          .select('id, name, path')
          .eq('offer_id', id)
          .order('uploaded_at', { ascending: false })

        if (fileErr)
          throw new Error(fileErr.message || 'Dateien laden fehlgeschlagen')

        const urls =
          (files || []).length === 0
            ? []
            : await Promise.all(
                (files || []).map(async f => {
                  try {
                    const { data: u } = await sb.storage
                      .from('markt')
                      .createSignedUrl(f.path, 60 * 10)
                    return {
                      id: f.id,
                      name: f.name,
                      path: f.path,
                      url: u?.signedUrl || null,
                    }
                  } catch {
                    return {
                      id: f.id,
                      name: f.name,
                      path: f.path,
                      url: null,
                    }
                  }
                }),
              )

        if (cancelled) return

        setData({
          id: offer.id,
          request_id: offer.request_id,
          title: offer.title,
          net_total: Number(offer.net_total),
          tax_rate: Number(offer.tax_rate),
          discount_type: offer.discount_type,
          discount_value: Number(offer.discount_value),
          discount_label: offer.discount_label,
          gross_total: Number(offer.gross_total),
          status: offer.status,
          signature_id: offer.signature_id,
          files: urls,
        })
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Fehler beim Laden.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, offerId, sb])

  const accept = async () => {
    setBusy(true)
    setError(null)
    try {
      const id = normalizeOfferId(offerId)
      if (!id) throw new Error('Ungültige Angebots-ID.')
      const res = await fetch(`/api/konsument/offers/${id}/accept`, {
        method: 'POST',
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) throw new Error(j?.error || res.statusText)
      onClose()
    } catch (e: any) {
      setError(e.message || 'Fehler beim Bestätigen.')
    } finally {
      setBusy(false)
    }
  }

  const decline = async () => {
    setBusy(true)
    setError(null)
    try {
      const id = normalizeOfferId(offerId)
      if (!id) throw new Error('Ungültige Angebots-ID.')
      const res = await fetch(`/api/konsument/offers/${id}/decline`, {
        method: 'POST',
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) throw new Error(j?.error || res.statusText)
      onClose()
    } catch (e: any) {
      setError(e.message || 'Fehler beim Ablehnen.')
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
          'relative z-10 mt-8 w-full max-w-2xl',
          'max-h-[92vh] overflow-y-auto',
          'rounded-3xl border border-white/60 bg-white/90 backdrop-blur-xl',
          'p-6 shadow-[0_10px_34px_rgba(2,6,23,0.12)] ring-1 ring-white/60',
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium text-slate-900">Angebot</h3>
            <p className="mt-1 text-xs text-slate-500">
              Prüfe die Angebotsdetails und Anhänge. Eine Zusage ist rechtlich
              verbindlich.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => !busy && onClose()}
            className="rounded-xl border border-white/60 bg-white px-3 py-1.5 text-sm hover:shadow-sm disabled:opacity-60"
          >
            Schließen
          </button>
        </div>

        {/* Content */}
        {loading && (
          <div className="mt-4 text-sm text-slate-600">Lade…</div>
        )}

        {!loading && error && (
          <div className="mt-4 text-xs text-rose-600">{error}</div>
        )}

        {!loading && !error && !data && (
          <div className="mt-4 text-sm text-slate-600">
            Keine Daten gefunden.
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* Titel + Meta */}
            <div className="mt-4 space-y-1">
              <div className="text-sm font-medium text-slate-900">
                {data.title || 'Ohne Titel'}
              </div>
              <div className="text-[10px] text-slate-500">
                Signatur-ID:{' '}
                <span className="font-mono break-all">
                  {data.signature_id || '—'}
                </span>
              </div>
              <div className="text-[10px] text-slate-500">
                Angebots-ID:{' '}
                <span className="font-mono">
                  {data.id?.slice(0, 8) || '—'}
                </span>
              </div>
            </div>

            {/* Beträge */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
              <div className="rounded-2xl border border-white/60 bg-white/80 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">
                  Netto
                </div>
                <div className="text-sm font-medium">
                  {money(data.net_total)}
                </div>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">
                  MwSt.
                </div>
                <div className="text-sm font-medium">
                  {data.tax_rate}%
                </div>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">
                  Rabatt
                </div>
                <div className="text-sm font-medium">
                  {data.discount_type === 'percent'
                    ? `${data.discount_value}%`
                    : money(data.discount_value)}{' '}
                  <span className="text-slate-500">
                    ({data.discount_label || 'Rabatt'})
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-900/10 bg-slate-900 text-white px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-white/70">
                  Brutto Gesamtsumme
                </div>
                <div className="text-sm font-semibold">
                  {money(data.gross_total)}
                </div>
              </div>
            </div>

            {/* Dateien */}
            <div className="mt-5">
              <div className="mb-1 text-xs font-medium text-slate-600">
                Angebots-Unterlagen
              </div>
              {data.files.length === 0 ? (
                <div className="text-xs text-slate-500">
                  Keine Dateien vorhanden.
                </div>
              ) : (
                <ul className="space-y-1 text-sm">
                  {data.files.map(f => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-white/70 px-3 py-1.5 text-xs border border-white/50"
                    >
                      <span className="truncate">
                        {f.name || 'Datei'}
                      </span>
                      {f.url ? (
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-[10px] font-medium text-slate-900 underline"
                        >
                          Öffnen
                        </a>
                      ) : (
                        <span className="shrink-0 text-[10px] text-slate-400">
                          nicht verfügbar
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Aktionen */}
            <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
              {/* Nur Konsument, nur bei Status "created" */}
              {role === 'konsument' && data.status === 'created' && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={decline}
                    className="rounded-xl border border-white/60 bg-white px-3 py-1.5 text-sm
                               hover:shadow-sm disabled:opacity-60"
                  >
                    Ablehnen
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={accept}
                    className="rounded-xl bg-slate-900 px-3 py-1.5 text-sm text-white
                               hover:opacity-90 disabled:opacity-60"
                  >
                    Angebot annehmen
                  </button>
                </>
              )}

              {/* Wenn keine Aktion möglich: nur Close (oben vorhanden) */}
            </div>
          </>
        )}
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(node, document.body) : node
}

// src/components/orders/OrderReviewModal.tsx
'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { supabaseClient } from '@/lib/supabase-client'
import { XMarkIcon } from '@heroicons/react/24/outline'

function money(n: number) {
  const num = Number(n || 0)
  return (Math.round(num * 100) / 100).toFixed(2) + ' €'
}

const WITHDRAWAL_DAYS = 14
const DAY_MS = 24 * 60 * 60 * 1000

type Props = {
  open: boolean
  onClose: () => void
  orderId: string
  role: 'konsument' | 'partner' | 'admin' | 'unknown'
}

type OrderStatus =
  | 'created'
  | 'accepted'
  | 'completed'
  | 'canceled'
  | 'declined'

function cls(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(' ')
}

function statusToLabel(status: OrderStatus | string | null | undefined) {
  const v = String(status || '').toLowerCase() as OrderStatus
  switch (v) {
    case 'created':
      return {
        label: 'Erstellt',
        badge: 'bg-slate-100 text-slate-800 ring-slate-200',
      }
    case 'accepted':
      return {
        label: 'Angenommen',
        badge: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
      }
    case 'completed':
      return {
        label: 'Abgeschlossen',
        badge: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
      }
    case 'declined':
      return {
        label: 'Abgelehnt',
        badge: 'bg-rose-50 text-rose-800 ring-rose-200',
      }
    case 'canceled':
      return {
        label: 'Storniert',
        badge: 'bg-rose-50 text-rose-800 ring-rose-200',
      }
    default:
      return {
        label: status || '—',
        badge: 'bg-slate-100 text-slate-800 ring-slate-200',
      }
  }
}

export default function OrderReviewModal({ open, onClose, orderId, role }: Props) {
  const sb = supabaseClient()
  const [busy, setBusy] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [conversationId, setConversationId] = React.useState<string | null>(null)

  const [data, setData] = React.useState<null | {
    id: string
    request_id: string
    title: string
    net_total: number
    tax_rate: number
    discount_type: 'percent' | 'fixed'
    discount_value: number
    discount_label: string
    gross_total: number
    status: OrderStatus
    created_at: string
    files: {
      id: string
      name: string | null
      path: string
      url: string | null
    }[]
  }>(null)

  // ESC + Body scroll lock
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

  // Daten + Conversation laden
  React.useEffect(() => {
    if (!open) return
    let cancelled = false

    ;(async () => {
      setLoading(true)
      setError(null)
      setNotice(null)
      setData(null)

      try {
        const { data: order, error: oErr } = await sb
          .from('market_orders')
          .select(
            'id, request_id, title, net_total, tax_rate, discount_type, discount_value, discount_label, gross_total, status, created_at',
          )
          .eq('id', orderId)
          .single()

        if (cancelled) return

        if (oErr || !order) {
          setError(oErr?.message || 'Auftrag nicht gefunden')
          setLoading(false)
          return
        }

        const { data: conv } = await sb
          .from('market_conversations')
          .select('id')
          .eq('request_id', order.request_id)
          .maybeSingle()

        if (!cancelled) {
          setConversationId(conv?.id || null)
        }

        const { data: files, error: fErr } = await sb
          .from('market_order_files')
          .select('id, name, path')
          .eq('order_id', orderId)
          .order('uploaded_at', {
            ascending: false,
          })

        if (cancelled) return
        if (fErr) {
          setError(fErr.message || 'Dateien konnten nicht geladen werden.')
        }

        const urls = await Promise.all(
          (files || []).map(async f => {
            try {
              const { data: u } = await sb.storage.from('markt').createSignedUrl(f.path, 60 * 10)
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
          id: String(order.id),
          request_id: String(order.request_id),
          title: String(order.title),
          net_total: Number(order.net_total),
          tax_rate: Number(order.tax_rate),
          discount_type: order.discount_type,
          discount_value: Number(order.discount_value),
          discount_label: String(order.discount_label),
          gross_total: Number(order.gross_total),
          status: String(order.status) as OrderStatus,
          created_at: String(order.created_at),
          files: urls,
        })
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Fehler beim Laden')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, orderId, sb])

  const withinWithdrawal = React.useMemo(() => {
    if (!data?.created_at) return false
    const created = new Date(data.created_at).getTime()
    const now = Date.now()
    const diffDays = Math.floor((now - created) / DAY_MS)
    return diffDays <= WITHDRAWAL_DAYS
  }, [data?.created_at])

  const canCancel = React.useMemo(() => {
    if (!data) return false
    if (data.status === 'canceled' || data.status === 'completed' || data.status === 'declined')
      return false
    return withinWithdrawal
  }, [data, withinWithdrawal])

  // Systemmessage idempotent
  async function postSystemMessage(markerText: string) {
    try {
      if (!conversationId) return
      const { data: sess } = await sb.auth.getSession()
      const uid = sess?.session?.user?.id
      if (!uid) return

      const { count } = await sb
        .from('market_messages')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('conversation_id', conversationId)
        .eq('body_text', markerText)

      if ((count || 0) > 0) return

      await sb.from('market_messages').insert({
        conversation_id: conversationId,
        sender_user_id: uid,
        body_text: markerText,
      })
    } catch (e) {
      console.warn('postSystemMessage failed', e)
    }
  }

  // Aktionen (nur Konsument, wie bestehende Logik)
  const acceptOrder = async () => {
    if (!data) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch(`/api/konsument/orders/${data.id}/accept`, { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) throw new Error(j?.error || res.statusText)

      await postSystemMessage(`ORDER:ACCEPTED:${data.id}`)
      onClose()
    } catch (e: any) {
      setError(e.message || 'Fehler beim Annehmen')
    } finally {
      setBusy(false)
    }
  }

  const declineOrder = async () => {
    if (!data) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch(`/api/konsument/orders/${data.id}/decline`, { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) throw new Error(j?.error || res.statusText)

      await postSystemMessage(`ORDER:DECLINED:${data.id}`)
      onClose()
    } catch (e: any) {
      setError(e.message || 'Fehler beim Ablehnen')
    } finally {
      setBusy(false)
    }
  }

  const cancelOrder = async () => {
    if (!data) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch(`/api/konsument/orders/${data.id}/cancel`, { method: 'POST' })
      const j = await res.json().catch(() => ({}))

      if (!res.ok || !j.ok) {
        if (j?.error === 'withdrawal_period_exceeded') {
          setNotice(
            'Die gesetzliche Widerrufsfrist (14 Tage) ist überschritten. Eine Stornierung ist nicht mehr möglich.',
          )
        } else {
          throw new Error(j?.error || res.statusText)
        }
        return
      }

      await postSystemMessage(`ORDER:CANCELED:${data.id}`)
      onClose()
    } catch (e: any) {
      setError(e.message || 'Fehler beim Stornieren')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  const modal = (
    <div className="fixed inset-0 z-[100000] flex items-start justify-center p-3 sm:p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-xl"
        onClick={() => !busy && onClose()}
      />

      {/* Card */}
      <div
        className="relative z-10 mt-6 sm:mt-10 w-full max-w-2xl max-h-[92vh] overflow-y-auto
                   rounded-3xl border border-white/60 bg-white/80 backdrop-blur-xl p-4 sm:p-6
                   shadow-[0_10px_34px_rgba(2,6,23,0.12)] ring-1 ring-white/60"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-medium text-slate-900 truncate">
              Auftrag
            </h3>
            <p className="mt-1 text-[11px] sm:text-xs text-slate-500">
              Details zum Auftrag, Konditionen und hinterlegte Dokumente.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => !busy && onClose()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/90 text-slate-500 hover:text-slate-700 hover:bg-white shadow-sm disabled:opacity-60"
            aria-label="Schließen"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="mt-4 text-sm text-slate-600">Lade…</div>
        ) : error ? (
          <div className="mt-4 text-xs text-rose-600">{error}</div>
        ) : !data ? (
          <div className="mt-4 text-sm text-slate-600">Keine Daten gefunden.</div>
        ) : (
          <>
            {/* Status-Hinweise */}
            {data.status === 'canceled' && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                Dieser Auftrag wurde <strong>storniert</strong>.
              </div>
            )}
            {data.status === 'declined' && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                Dieser Auftrag wurde <strong>abgelehnt</strong>.
              </div>
            )}

            {(role === 'admin' || role === 'partner') && data.status === 'canceled' && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <strong>Hinweis:</strong> Bitte zuerst ein <strong>neues Angebot</strong> an den
                Konsumenten senden, danach kann ein neuer Auftrag erstellt werden.
              </div>
            )}

            {/* Status + Meta */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {(() => {
                const { label, badge } = statusToLabel(data.status)
                return (
                  <span
                    className={cls(
                      'inline-flex items-center rounded-full px-2.5 py-1 text-xs ring-1',
                      badge,
                    )}
                  >
                    {label}
                  </span>
                )
              })()}
              <div className="text-[11px] sm:text-xs text-slate-500">
                Erstellt am:{' '}
                {new Date(data.created_at).toLocaleString('de-DE', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </div>
            </div>

            {/* Beträge */}
            <div className="mt-4">
              <div className="text-sm sm:text-base font-medium text-slate-900">
                {data.title}
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">Netto:</span> {money(data.net_total)}
                </div>
                <div>
                  <span className="text-slate-500">MwSt:</span> {data.tax_rate}%
                </div>
                <div>
                  <span className="text-slate-500">Rabatt:</span>{' '}
                  {data.discount_type === 'percent'
                    ? `${data.discount_value}%`
                    : `${money(data.discount_value)}`}{' '}
                  ({data.discount_label})
                </div>
                <div>
                  <span className="text-slate-500">Brutto:</span> {money(data.gross_total)}
                </div>
              </div>

              {/* Dateien */}
              <div className="mt-4">
                <div className="mb-1 text-xs text-slate-600">Anhänge</div>
                {data.files.length === 0 ? (
                  <div className="text-xs text-slate-500">Keine Dateien vorhanden.</div>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {data.files.map(f => (
                      <li key={f.id} className="truncate">
                        {f.url ? (
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            {f.name || 'Datei'}
                          </a>
                        ) : (
                          f.name || 'Datei'
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {notice && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {notice}
              </div>
            )}

            {/* Actions */}
            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end items-stretch sm:items-center gap-2 sm:gap-3">
              {/* Konsument: Annehmen/Ablehnen bei created */}
              {role === 'konsument' && data.status === 'created' && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={declineOrder}
                    className="w-full sm:w-auto rounded-xl border border-white/60 bg-white px-3 py-1.5 text-sm hover:shadow-sm disabled:opacity-60"
                  >
                    Ablehnen
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={acceptOrder}
                    className="w-full sm:w-auto rounded-xl bg-slate-900 px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Annehmen
                  </button>
                </>
              )}

              {/* Konsument: Storno innerhalb Widerrufsfrist */}
              {role === 'konsument' && (
                <button
                  type="button"
                  disabled={busy || !canCancel}
                  onClick={cancelOrder}
                  title={
                    !canCancel && !withinWithdrawal
                      ? 'Die gesetzliche Widerrufsfrist (14 Tage) ist überschritten.'
                      : undefined
                  }
                  className="w-full sm:w-auto rounded-xl border border-white/60 bg-white px-3 py-1.5 text-sm hover:shadow-sm disabled:opacity-50"
                >
                  Auftrag stornieren
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal
}

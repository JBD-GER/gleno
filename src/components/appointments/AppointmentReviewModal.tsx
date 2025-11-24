// src/components/appointments/AppointmentReviewModal.tsx
'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { supabaseClient } from '@/lib/supabase-client'
import { XMarkIcon } from '@heroicons/react/24/outline'

type Role = 'admin' | 'konsument' | 'partner' | 'unknown'

type Props = {
  open: boolean
  onClose: () => void
  appointmentId: string
  requestId: string
  /** lower-cased request status key, z. B. 'termin bestätigt' oder 'termin bestaetigt' */
  requestStatusKey: string
}

function cls(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(' ')
}

export default function AppointmentReviewModal({
  open,
  onClose,
  appointmentId,
  requestId,
  requestStatusKey,
}: Props) {
  const sb = supabaseClient()

  const [loading, setLoading] = React.useState(true)
  const [row, setRow] = React.useState<any | null>(null)
  const [busy, setBusy] = React.useState<'confirm' | 'decline' | null>(null)
  const [role, setRole] = React.useState<Role>('unknown')

  const isTerminBestaetigt =
    requestStatusKey === 'termin bestätigt' ||
    requestStatusKey === 'termin bestaetigt'

  // Rolle bestimmen
  React.useEffect(() => {
    if (!open) return
    let cancelled = false

    ;(async () => {
      try {
        const [{ data: sess }, { data: conv }] = await Promise.all([
          sb.auth.getSession(),
          sb
            .from('market_conversations')
            .select(`
              id,
              consumer_user_id,
              partner:partners(
                owner_user_id
              )
            `)
            .eq('request_id', requestId)
            .maybeSingle(),
        ])

        if (cancelled) return

        const uid = sess?.session?.user?.id ?? null
        const consumerId = (conv as any)?.consumer_user_id || null
        const partnerOwnerId = Array.isArray((conv as any)?.partner)
          ? (conv as any).partner[0]?.owner_user_id
          : (conv as any)?.partner?.owner_user_id

        let eff: Role = 'unknown'

        if (uid && consumerId && uid === consumerId) {
          eff = 'konsument'
        } else if (uid && partnerOwnerId && uid === partnerOwnerId) {
          eff = 'partner'
        } else if (uid) {
          const { data: prof } = await sb
            .from('profiles')
            .select('role')
            .eq('id', uid)
            .maybeSingle()
          const r = String(prof?.role || '').toLowerCase()
          if (r === 'admin') eff = 'admin'
          else if (r === 'partner') eff = 'partner'
          else if (r === 'konsument' || r === 'consumer') eff = 'konsument'
        }

        if (!cancelled) setRole(eff)
      } catch {
        if (!cancelled) setRole('unknown')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, requestId, sb])

  // Termin laden
  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data } = await sb
        .from('market_appointments')
        .select('*')
        .eq('id', appointmentId)
        .maybeSingle()
      if (!cancelled) {
        setRow(data ?? null)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, appointmentId, sb])

  // ESC + Body Scroll sperren
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

  if (!open) return null

  const canConfirm = role === 'konsument' && !isTerminBestaetigt
  // Absagen: Konsument + PartnerOwner + Admin → Backend prüft das sowieso
  const canDecline =
    role === 'konsument' || role === 'partner' || role === 'admin'

  async function doConfirm() {
    if (!row || !canConfirm || busy) return
    setBusy('confirm')
    try {
      const res = await fetch(
        `/api/konsument/chat/${requestId}/appointment/${appointmentId}/confirm`,
        { method: 'POST' },
      )
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || res.statusText)
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: { kind: 'success', text: 'Termin bestätigt.' },
        }),
      )
      onClose()
    } catch (e: any) {
      alert(e.message || 'Fehler beim Bestätigen.')
    } finally {
      setBusy(null)
    }
  }

  async function doDecline() {
    if (!row || !canDecline || busy) return
    setBusy('decline')
    try {
      // Einzige Route, die existiert und intern Consumer/Partner/Admin prüft:
      const res = await fetch(
        `/api/konsument/chat/${requestId}/appointment/${appointmentId}/decline`,
        { method: 'POST' },
      )
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || res.statusText)

      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: { kind: 'success', text: 'Termin abgelehnt.' },
        }),
      )
      window.dispatchEvent(
        new CustomEvent('appointment:declined', {
          detail: { requestId },
        }),
      )
      onClose()
    } catch (e: any) {
      alert(e.message || 'Fehler beim Ablehnen.')
    } finally {
      setBusy(null)
    }
  }

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
          'relative z-10 mt-10 w-full max-w-2xl',
          'max-h-[92vh] overflow-y-auto',
          'rounded-3xl border border-white/60 bg-white/90',
          'backdrop-blur-xl p-4 sm:p-6',
          'shadow-[0_10px_34px_rgba(2,6,23,0.12)] ring-1 ring-white/60',
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="pr-4">
            <h3 className="text-base sm:text-lg font-medium text-slate-900">
              Termin prüfen
            </h3>
            <p className="mt-1 text-[11px] sm:text-xs text-slate-500">
              Details zum vorgeschlagenen Termin.
            </p>
          </div>
          {/* X oben rechts */}
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/95 shadow-sm
                       hover:bg-slate-50 disabled:opacity-60 shrink-0"
            disabled={!!busy}
            aria-label="Schließen"
          >
            <XMarkIcon className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {loading && (
          <div className="mt-4 text-sm text-slate-600">Lade…</div>
        )}

        {!loading && !row && (
          <div className="mt-4 text-sm text-slate-600">
            Termin nicht gefunden.
          </div>
        )}

        {!loading && row && (
          <>
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <div className="mb-1 text-xs text-slate-600">
                  Überschrift
                </div>
                <div className="rounded-xl border border-white/60 bg-white/70 px-3 py-2">
                  {row.title || '—'}
                </div>
              </div>

              <div>
                <div className="mb-1 text-xs text-slate-600">Art</div>
                <div className="rounded-xl border border-white/60 bg-white/70 px-3 py-2">
                  {row.kind === 'vor_ort'
                    ? 'Vor Ort'
                    : row.kind === 'video'
                    ? 'Video'
                    : 'Telefonie'}
                </div>
              </div>

              {/* Datum / Uhrzeit / Dauer als "Table" */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <div className="mb-1 text-xs text-slate-600">
                    Datum
                  </div>
                  <div className="rounded-xl border border-white/60 bg-white/70 px-3 py-2">
                    {new Date(row.start_at).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-xs text-slate-600">
                    Uhrzeit
                  </div>
                  <div className="rounded-xl border border-white/60 bg-white/70 px-3 py-2">
                    {new Date(row.start_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-xs text-slate-600">
                    Dauer
                  </div>
                  <div className="rounded-xl border border-white/60 bg-white/70 px-3 py-2">
                    {row.duration_min} Min.
                  </div>
                </div>
              </div>

              {row.kind === 'vor_ort' && (
                <div>
                  <div className="mb-1 text-xs text-slate-600">
                    Ort
                  </div>
                  <div className="rounded-xl border border-white/60 bg-white/70 px-3 py-2">
                    {row.location || '—'}
                  </div>
                </div>
              )}

              {row.kind === 'video' && (
                <div>
                  <div className="mb-1 text-xs text-slate-600">
                    Meeting-Link
                  </div>
                  <div className="rounded-xl border border-white/60 bg-white/70 px-3 py-2 break-all">
                    {row.video_url || '—'}
                  </div>
                </div>
              )}

              {row.kind === 'telefonie' && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <div className="mb-1 text-xs text-slate-600">
                      Telefon (Kund:in)
                    </div>
                    <div className="rounded-xl border border-white/60 bg-white/70 px-3 py-2">
                      {row.phone_customer || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-slate-600">
                      Telefon (Unternehmen)
                    </div>
                    <div className="rounded-xl border border-white/60 bg-white/70 px-3 py-2">
                      {row.phone_partner || '—'}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div className="mb-1 text-xs text-slate-600">
                  Notiz
                </div>
                <div className="rounded-xl border border-white/60 bg-white/70 px-3 py-2 whitespace-pre-wrap">
                  {row.note || '—'}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:flex-wrap sm:items-center sm:justify-end gap-2">
              {canDecline && (
                <button
                  type="button"
                  onClick={doDecline}
                  disabled={busy !== null}
                  className="w-full sm:w-auto rounded-xl bg-rose-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {busy === 'decline'
                    ? 'Sage ab…'
                    : 'Termin absagen'}
                </button>
              )}

              {canConfirm && (
                <button
                  type="button"
                  onClick={doConfirm}
                  disabled={busy !== null}
                  className="w-full sm:w-auto rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {busy === 'confirm'
                    ? 'Bestätige…'
                    : 'Termin bestätigen'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )

  return typeof document !== 'undefined'
    ? createPortal(node, document.body)
    : node
}

// src/components/ChatHeader.tsx
'use client'

import * as React from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import PersonalDataViewer from '@/components/PersonalDataViewer'
import CreateAppointmentModal from '@/components/appointments/CreateAppointmentModal'
import AppointmentReviewModal from '@/components/appointments/AppointmentReviewModal'
import OfferCreateModal from '@/components/offers/OfferCreateModal'
import OfferReviewModal from '@/components/offers/OfferReviewModal'
import OrderCreateModal from '@/components/orders/OrderCreateModal'
import OrderReviewModal from '@/components/orders/OrderReviewModal'
import InvoiceUploadModal from '@/components/orders/InvoiceUploadModal'

type Role = 'admin' | 'konsument' | 'partner' | 'unknown'

type ConversationInfo = {
  conversation_id: string
  request: {
    id: string
    status: string | null
    summary: string | null
    category: string | null
    city: string | null
    zip: string | null
    created_at: string
    extras?: any
  } | null
  partner: {
    id: string
    owner_user_id: string
    display: string
    logo_path: string | null
    city: string | null
  } | null
  consumer_user_id: string
}

function cls(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(' ')
}

function normalizeStatus(value?: string | null) {
  const v = String(value || '').trim().toLowerCase()
  const labelMap: Record<string, string> = {
    anfrage: 'Anfrage',
    aktiv: 'Aktiv',
    gelöscht: 'Gelöscht',
    geloescht: 'Gelöscht',
    angebot: 'Angebot',
    'angebot erstellt': 'Angebot erstellt',
    angebot_erstellt: 'Angebot erstellt',
    'angebot angenommen': 'Angebot angenommen',
    angebot_angenommen: 'Angebot angenommen',
    'angebot abgelehnt': 'Angebot abgelehnt',
    angebot_abgelehnt: 'Angebot abgelehnt',
    auftrag: 'Auftrag',
    'auftrag erstellt': 'Auftrag erstellt',
    auftrag_erstellt: 'Auftrag erstellt',
    'auftrag angenommen': 'Auftrag angenommen',
    auftrag_angenommen: 'Auftrag angenommen',
    'auftrag bestätigt': 'Auftrag angenommen',
    auftrag_bestaetigt: 'Auftrag angenommen',
    'auftrag abgelehnt': 'Auftrag abgelehnt',
    auftrag_abgelehnt: 'Auftrag abgelehnt',
    'auftrag storniert': 'Auftrag storniert',
    auftrag_storniert: 'Auftrag storniert',
    abgeschlossen: 'Abgeschlossen',
    'termin angelegt': 'Termin angelegt',
    'termin bestätigt': 'Termin bestätigt',
    'termin bestaetigt': 'Termin bestätigt',
  }

  const styleMap: Record<string, string> = {
    anfrage: 'bg-slate-100 text-slate-700 ring-slate-200',
    aktiv: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    gelöscht: 'bg-rose-50 text-rose-700 ring-rose-200',
    geloescht: 'bg-rose-50 text-rose-700 ring-rose-200',
    angebot: 'bg-amber-50 text-amber-800 ring-amber-200',
    'angebot erstellt': 'bg-amber-50 text-amber-800 ring-amber-200',
    angebot_erstellt: 'bg-amber-50 text-amber-800 ring-amber-200',
    'angebot angenommen': 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    angebot_angenommen: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    'angebot abgelehnt': 'bg-rose-50 text-rose-800 ring-rose-200',
    angebot_abgelehnt: 'bg-rose-50 text-rose-800 ring-rose-200',
    auftrag: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
    'auftrag erstellt': 'bg-indigo-50 text-indigo-800 ring-indigo-200',
    auftrag_erstellt: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
    'auftrag angenommen': 'bg-blue-50 text-blue-800 ring-blue-200',
    auftrag_angenommen: 'bg-blue-50 text-blue-800 ring-blue-200',
    'auftrag bestätigt': 'bg-blue-50 text-blue-800 ring-blue-200',
    auftrag_bestaetigt: 'bg-blue-50 text-blue-800 ring-blue-200',
    'auftrag abgelehnt': 'bg-rose-50 text-rose-800 ring-rose-200',
    auftrag_abgelehnt: 'bg-rose-50 text-rose-800 ring-rose-200',
    'auftrag storniert': 'bg-rose-50 text-rose-800 ring-rose-200',
    auftrag_storniert: 'bg-rose-50 text-rose-800 ring-rose-200',
    abgeschlossen: 'bg-slate-800 text-white ring-slate-700',
    'termin angelegt': 'bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200',
    'termin bestätigt': 'bg-teal-50 text-teal-800 ring-teal-200',
    'termin bestaetigt': 'bg-teal-50 text-teal-800 ring-teal-200',
  }

  return {
    label: labelMap[v] ?? (value || '—'),
    cls: styleMap[v] ?? 'bg-slate-100 text-slate-700 ring-slate-200',
    key: v,
  }
}

export default function ChatHeader({
  requestId,
  roleHint,
}: { requestId: string; roleHint?: Role }) {
  const sb = supabaseClient()

  const [me, setMe] = React.useState<{ id: string | null; role: Role }>({
    id: null,
    role: 'unknown',
  })
  const [info, setInfo] = React.useState<ConversationInfo | null>(null)
  const [loading, setLoading] = React.useState(true)

  const [pdOpen, setPdOpen] = React.useState(false)
  const [pdPresent, setPdPresent] = React.useState<boolean | null>(null)

  const [apptOpen, setApptOpen] = React.useState(false)
  const [reviewOpen, setReviewOpen] = React.useState(false)
  const [appointmentId, setAppointmentId] = React.useState<string | null>(null)

  const [offerCreateOpen, setOfferCreateOpen] = React.useState(false)

  const [orderCreateOpen, setOrderCreateOpen] = React.useState(false)
  const [orderReviewOpen, setOrderReviewOpen] = React.useState(false)
  const [orderId, setOrderId] = React.useState<string | null>(null)
  const [activeOrderId, setActiveOrderId] = React.useState<string | null>(null)

  const [invoiceOpen, setInvoiceOpen] = React.useState(false)
  const [requestingAddress, setRequestingAddress] = React.useState(false)

  const [ratingBusy, setRatingBusy] = React.useState(false)

  /* Session / Profil laden */
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: sess } = await sb.auth.getSession()
        const uid = sess?.session?.user?.id ?? null

        let role: Role = 'unknown'
        if (uid) {
          const { data: prof } = await sb
            .from('profiles')
            .select('id, role')
            .eq('id', uid)
            .maybeSingle()

          if (prof?.role) {
            const r = String(prof.role).toLowerCase()
            if (r === 'admin') role = 'admin'
            else if (r === 'partner') role = 'partner'
            else if (r === 'konsument' || r === 'consumer') role = 'konsument'
          }
        }

        if (!cancelled) setMe({ id: uid, role })
      } catch {
        if (!cancelled) setMe({ id: null, role: 'unknown' })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sb])

  /* Conversation + Joins */
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await sb
        .from('market_conversations')
        .select(`
          id,
          consumer_user_id,
          partner:partners!inner (
            id,
            owner_user_id,
            display_name,
            company_name,
            logo_path,
            city
          ),
          request:market_requests!inner (
            id,
            status,
            summary,
            category,
            city,
            zip,
            created_at,
            extras
          )
        `)
        .eq('request_id', requestId)
        .maybeSingle()

      if (cancelled) return

      if (error || !data) {
        setInfo(null)
        setLoading(false)
        return
      }

      const rawPartner = (data as any).partner
      const rawRequest = (data as any).request

      const partnerRow = Array.isArray(rawPartner) ? rawPartner[0] : rawPartner
      const requestRow = Array.isArray(rawRequest) ? rawRequest[0] : rawRequest

      const partner = partnerRow
        ? {
            id: String(partnerRow.id),
            owner_user_id: String(partnerRow.owner_user_id),
            display: String(
              partnerRow.display_name ||
                partnerRow.company_name ||
                'Partner',
            ),
            logo_path: partnerRow.logo_path
              ? String(partnerRow.logo_path)
              : null,
            city: partnerRow.city ? String(partnerRow.city) : null,
          }
        : null

      const req = requestRow
        ? {
            id: String(requestRow.id),
            status: requestRow.status ?? null,
            summary: requestRow.summary ?? null,
            category: requestRow.category ?? null,
            city: requestRow.city ?? null,
            zip: requestRow.zip ?? null,
            created_at: String(requestRow.created_at),
            extras: requestRow.extras ?? undefined,
          }
        : null

      setInfo({
        conversation_id: String((data as any).id),
        consumer_user_id: String((data as any).consumer_user_id),
        partner,
        request: req,
      })
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [sb, requestId])

  /* PD presence */
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await sb
        .from('market_request_personal_data')
        .select('id')
        .eq('request_id', requestId)
        .maybeSingle()
      if (!cancelled) setPdPresent(!!data?.id)
    })()
    return () => {
      cancelled = true
    }
  }, [sb, requestId])

  React.useEffect(() => {
    const ch = sb.channel(`pd:${requestId}`)
    ch.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'market_request_personal_data',
        filter: `request_id=eq.${requestId}`,
      },
      (payload: any) => {
        if (payload?.eventType === 'DELETE') {
          setPdPresent(false)
        } else {
          setPdPresent(true)
        }
      },
    ).subscribe(() => {})

    const onCustom = (e: any) => {
      if (e?.detail?.requestId !== requestId) return
    }
    window.addEventListener('personal-data:updated', onCustom)

    return () => {
      sb.removeChannel(ch)
      window.removeEventListener('personal-data:updated', onCustom)
    }
  }, [sb, requestId])

  /* Appointments initial + realtime */
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await sb
        .from('market_appointments')
        .select('id,created_at')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false })
        .limit(1)
      if (!cancelled) {
        setAppointmentId(
          !error && data && data.length > 0 ? String(data[0].id) : null,
        )
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sb, requestId])

  React.useEffect(() => {
    const ch = sb.channel(`appt:${requestId}`)
    ch.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'market_appointments',
        filter: `request_id=eq.${requestId}`,
      },
      async () => {
        const { data } = await sb
          .from('market_appointments')
          .select('id,created_at')
          .eq('request_id', requestId)
          .order('created_at', { ascending: false })
          .limit(1)
        setAppointmentId(
          data && data.length > 0 ? String(data[0].id) : null,
        )
      },
    ).subscribe(() => {})
    return () => {
      sb.removeChannel(ch)
    }
  }, [sb, requestId])

  /* Orders initial + realtime */
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: latest } = await sb
        .from('market_orders')
        .select('id, status, created_at')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false })
        .limit(1)

      const { data: latestActive } = await sb
        .from('market_orders')
        .select('id, status, created_at')
        .eq('request_id', requestId)
        .in('status', ['created', 'accepted', 'completed'])
        .order('created_at', { ascending: false })
        .limit(1)

      if (cancelled) return

      setOrderId(latest && latest[0] ? String(latest[0].id) : null)
      setActiveOrderId(
        latestActive && latestActive[0]
          ? String(latestActive[0].id)
          : null,
      )
    })()
    return () => {
      cancelled = true
    }
  }, [sb, requestId])

  React.useEffect(() => {
    const ch = sb.channel(`orders:${requestId}`)
    ch.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'market_orders',
        filter: `request_id=eq.${requestId}`,
      },
      async () => {
        const { data: latest } = await sb
          .from('market_orders')
          .select('id, status, created_at')
          .eq('request_id', requestId)
          .order('created_at', { ascending: false })
          .limit(1)

        const { data: latestActive } = await sb
          .from('market_orders')
          .select('id, status, created_at')
          .eq('request_id', requestId)
          .in('status', ['created', 'accepted', 'completed'])
          .order('created_at', { ascending: false })
          .limit(1)

        setOrderId(latest && latest[0] ? String(latest[0].id) : null)
        setActiveOrderId(
          latestActive && latestActive[0]
            ? String(latestActive[0].id)
            : null,
        )
      },
    ).subscribe(() => {})
    return () => {
      sb.removeChannel(ch)
    }
  }, [sb, requestId])

  const status = normalizeStatus(info?.request?.status)

  /* Effektive Rolle */
  const effectiveRole: Role = React.useMemo(() => {
    if (
      me.id &&
      info?.partner?.owner_user_id &&
      me.id === info.partner.owner_user_id
    ) {
      return 'partner'
    }

    if (roleHint && roleHint !== 'unknown') {
      return roleHint
    }

    if (me.role === 'admin') return 'admin'
    if (me.role === 'partner') return 'partner'
    if (me.role === 'konsument') return 'konsument'

    if (me.id && info) {
      if (me.id === info.consumer_user_id) return 'konsument'
    }

    return 'unknown'
  }, [me.id, me.role, roleHint, info])

  const isAdmin = effectiveRole === 'admin'

  const flags = React.useMemo(() => {
    const k = status.key

    const isOfferCreated =
      k === 'angebot erstellt' ||
      k === 'angebot_erstellt' ||
      k === 'angebot'
    const isOfferDeclined =
      k === 'angebot abgelehnt' || k === 'angebot_abgelehnt'
    const isOfferAccepted =
      k === 'angebot angenommen' || k === 'angebot_angenommen'

    const isAuftragErstellt =
      k === 'auftrag erstellt' || k === 'auftrag_erstellt'
    const isAuftragAngenommen =
      k === 'auftrag angenommen' ||
      k === 'auftrag_angenommen' ||
      k === 'auftrag bestätigt' ||
      k === 'auftrag_bestaetigt' ||
      k === 'auftrag'

    const isAuftragAbgelehnt =
      k === 'auftrag abgelehnt' || k === 'auftrag_abgelehnt'
    const isAuftragStorniert =
      k === 'auftrag storniert' || k === 'auftrag_storniert'

    const terminBestaetigt =
      k === 'termin bestätigt' ||
      k === 'termin bestaetigt' ||
      !!(info?.request?.extras || {})?.appointment_confirmed

    const isAbgeschlossen = k === 'abgeschlossen'

    return {
      key: k,
      isOfferCreated,
      isOfferDeclined,
      isOfferAccepted,
      isAuftragErstellt,
      isAuftragAngenommen,
      isAuftragAbgelehnt,
      isAuftragStorniert,
      terminBestaetigt,
      isAbgeschlossen,
    }
  }, [status.key, info?.request?.extras])

  /* Actions */

  async function onDeletePD() {
    if (!info?.request?.id) return
    const ok = window.confirm('Personen- und Adressdaten wirklich löschen?')
    if (!ok) return
    try {
      const res = await fetch(
        `/api/konsument/chat/${info.request.id}/personal-data/delete`,
        { method: 'POST' },
      )
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || res.statusText)
      setPdPresent(false)
      window.dispatchEvent(
        new CustomEvent('personal-data:updated', {
          detail: { requestId },
        }),
      )
    } catch (e: any) {
      console.error('onDeletePD failed', e)
    }
  }

  async function onPartnerRequestAddress() {
    if (!info?.request?.id || requestingAddress) return
    try {
      setRequestingAddress(true)
      const res = await fetch('/api/chat/request-address', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ request_id: info.request.id }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || res.statusText)
      window.dispatchEvent(
        new CustomEvent('address-request:sent', {
          detail: { requestId: info.request.id },
        }),
      )
    } catch (e: any) {
      console.error('onPartnerRequestAddress failed', e)
    } finally {
      setRequestingAddress(false)
    }
  }

  async function onPartnerRequestRating() {
    if (!info?.request?.id || ratingBusy) return
    try {
      setRatingBusy(true)
      const res = await fetch('/api/chat/rating/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ request_id: info.request.id }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || j?.ok === false) {
        throw new Error(j?.error || res.statusText)
      }
    } catch (e: any) {
      console.error('onPartnerRequestRating failed', e)
    } finally {
      setRatingBusy(false)
    }
  }

  const canOpenApptModal = React.useMemo(() => {
    if (!info?.request?.id || !info?.conversation_id) return false
    return effectiveRole === 'partner' || isAdmin
  }, [effectiveRole, isAdmin, info?.request?.id, info?.conversation_id])

  const onCancelOffer = React.useCallback(async () => {
    if (!info?.request?.id) return

    if (activeOrderId) {
      console.warn(
        'Angebot kann nicht storniert werden: aktiver Auftrag vorhanden.',
      )
      return
    }

    const confirm = window.confirm(
      'Angebot wirklich stornieren? Es wird als „abgelehnt“ markiert.',
    )
    if (!confirm) return

    try {
      const { data: offers, error: listErr } = await sb
        .from('market_offers')
        .select('id,status,created_at')
        .eq('request_id', info.request.id)
        .not('status', 'eq', 'declined')
        .order('created_at', { ascending: false })
        .limit(1)

      if (listErr) throw new Error(listErr.message || 'offer_list_failed')

      const offer = (offers && offers[0]) || null
      if (!offer?.id) {
        console.warn('Kein stornierbares Angebot gefunden.')
        return
      }

      const res = await fetch(
        `/api/konsument/offers/${offer.id}/decline`,
        { method: 'POST' },
      )
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || res.statusText)

      const wanted = [
        'Angebot abgelehnt',
        'angebot abgelehnt',
        'angebot_abgelehnt',
      ]
      for (const val of wanted) {
        const { error: upErr } = await sb
          .from('market_requests')
          .update({ status: val })
          .eq('id', info.request.id)
        if (!upErr) break
      }
    } catch (e: any) {
      console.error('onCancelOffer failed', e)
    }
  }, [sb, info?.request?.id, activeOrderId])

  const onCreateOrder = React.useCallback(async () => {
    if (!info?.request?.id) return
    if (!flags.isOfferAccepted || activeOrderId) return
    try {
      const res = await fetch('/api/partner/orders/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ request_id: info.request.id }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) throw new Error(j?.error || res.statusText)

      setInfo(prev =>
        prev
          ? {
              ...prev,
              request: prev.request
                ? {
                    ...prev.request,
                    status: 'Auftrag erstellt',
                  }
                : prev.request,
            }
          : prev,
      )
    } catch (e: any) {
      console.error('onCreateOrder failed', e)
    }
  }, [info?.request?.id, flags.isOfferAccepted, activeOrderId])

  const createOrderTitle = React.useMemo(() => {
    if (activeOrderId) return 'Es existiert bereits ein aktiver Auftrag'
    if (!flags.isOfferAccepted) {
      if (flags.isAuftragStorniert) {
        return 'Vorheriger Auftrag wurde storniert – sobald das Angebot (wieder) angenommen ist, kannst du einen neuen Auftrag anlegen.'
      }
      return 'Zuerst muss das Angebot angenommen werden'
    }
    if (flags.isAuftragStorniert) {
      return 'Vorheriger Auftrag wurde storniert – du kannst einen neuen Auftrag anlegen.'
    }
    return undefined
  }, [activeOrderId, flags.isOfferAccepted, flags.isAuftragStorniert])

  /* Render */

  return (
    <div className="mb-3 rounded-3xl border border-white/60 bg-white/75 backdrop-blur-xl px-4 py-3 shadow-[0_10px_34px_rgba(2,6,23,0.07)]">
      {loading && (
        <div className="text-xs sm:text-sm text-slate-500">
          Lade Details…
        </div>
      )}

      {!loading && !info && (
        <div className="text-xs sm:text-sm text-slate-600">
          Keine Informationen zur Anfrage gefunden.
        </div>
      )}

      {!loading && info && (
        <>
          {/* Kopfzeile */}
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            {/* Links: Status + Anfrage */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cls(
                    'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] sm:text-xs ring-1',
                    status.cls,
                  )}
                >
                  {status.label}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-500">
                  Anfrage #{info.request?.id?.slice(0, 8)}
                </span>
                {info.request?.created_at && (
                  <span className="text-[9px] sm:text-[10px] text-slate-400">
                    erstellt am{' '}
                    {new Date(
                      info.request.created_at,
                    ).toLocaleDateString('de-DE')}
                  </span>
                )}
              </div>

              <div className="mt-1 text-sm sm:text-base font-medium text-slate-900">
                {info.request?.summary || 'Ohne Kurzbeschreibung'}
              </div>
              <div className="mt-1 text-[10px] sm:text-xs text-slate-500">
                {[
                  info.request?.category,
                  [info.request?.zip, info.request?.city]
                    .filter(Boolean)
                    .join(' '),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>

              {/* Chips unter dem Titel (personen / termin / auftrag) */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPdOpen(true)}
                  className={cls(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] sm:text-[10px] ring-1',
                    'border-white/60 bg-white hover:shadow',
                  )}
                  title="Personendaten anzeigen"
                >
                  <span
                    className={cls(
                      'inline-block h-1.5 w-1.5 rounded-full',
                      pdPresent === null
                        ? 'bg-slate-300'
                        : pdPresent
                        ? 'bg-emerald-500'
                        : 'bg-slate-300',
                    )}
                  />
                  Personendaten
                </button>

                {flags.terminBestaetigt && appointmentId && (
                  <button
                    type="button"
                    onClick={() => setReviewOpen(true)}
                    className={cls(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] sm:text-[10px] ring-1',
                      'border-white/60 bg-white hover:shadow',
                    )}
                    title="Termindetails anzeigen"
                  >
                    Termindetails
                  </button>
                )}

                {orderId && (
                  <button
                    type="button"
                    onClick={() => setOrderReviewOpen(true)}
                    className={cls(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] sm:text-[10px] ring-1',
                      'border-white/60 bg-white hover:shadow',
                    )}
                    title="Letzten Auftrag anzeigen"
                  >
                    Auftrag ansehen
                  </button>
                )}
              </div>
            </div>

            {/* Rechts: Partner-Block */}
            <div className="mt-1 md:mt-0 text-left md:text-right md:min-w-[180px]">
              <div className="text-[9px] sm:text-xs text-slate-500 uppercase tracking-wide">
                Partner
              </div>
              <div className="text-sm font-semibold text-slate-900">
                {info.partner?.display || '—'}
              </div>
              <div className="text-[10px] sm:text-xs text-slate-500">
                {info.partner?.city || ''}
              </div>
              <div className="mt-1 text-[9px] sm:text-xs text-slate-500">
                Konsument-ID:{' '}
                <span className="font-medium text-slate-900">
                  {info.consumer_user_id
                    ? info.consumer_user_id.slice(0, 10)
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Aktionszeile – mobil & Tablet: Wrap statt Horizontal-Scroll */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {/* Admin */}
            {isAdmin && (
              <>
                <HeaderBtn
                  onClick={() => canOpenApptModal && setApptOpen(true)}
                >
                  Termin anlegen
                </HeaderBtn>
                <HeaderBtn onClick={() => setOfferCreateOpen(true)}>
                  Angebot anlegen
                </HeaderBtn>
                <HeaderBtn
                  onClick={() => setOrderCreateOpen(true)}
                  disabled={!flags.isOfferAccepted || !!activeOrderId}
                  title={createOrderTitle}
                >
                  Auftrag anlegen
                </HeaderBtn>
                <HeaderBtn onClick={() => setInvoiceOpen(true)}>
                  Abrechnen
                </HeaderBtn>
                {pdPresent === false && (
                  <HeaderBtn
                    onClick={onPartnerRequestAddress}
                    disabled={requestingAddress}
                    title="Konsument um Freigabe der Anschrift bitten."
                  >
                    {requestingAddress
                      ? 'Anschrift…'
                      : 'Anschrift anfragen'}
                  </HeaderBtn>
                )}
              </>
            )}

            {/* Konsument */}
            {!isAdmin && effectiveRole === 'konsument' && (
              <>
                <HeaderBtn onClick={onDeletePD}>
                  Personendaten löschen
                </HeaderBtn>
                <HeaderBtn
                  onClick={() => {
                    if (appointmentId) setReviewOpen(true)
                  }}
                  disabled={!flags.terminBestaetigt || !appointmentId}
                  title={
                    !flags.terminBestaetigt
                      ? 'Nur bei bestätigtem Termin'
                      : !appointmentId
                      ? 'Kein Termin vorhanden'
                      : undefined
                  }
                >
                  Termin verwalten
                </HeaderBtn>
                <HeaderBtn
                  onClick={onCancelOffer}
                  disabled={
                    !(
                      flags.isOfferCreated ||
                      flags.isOfferAccepted
                    ) || !!activeOrderId
                  }
                  title={
                    !!activeOrderId
                      ? 'Nach Auftragserstellung nicht mehr möglich'
                      : !(
                          flags.isOfferCreated ||
                          flags.isOfferAccepted
                        )
                      ? 'Nur wenn Angebot vorliegt'
                      : undefined
                  }
                >
                  Angebot stornieren
                </HeaderBtn>
              </>
            )}

            {/* Partner */}
            {!isAdmin && effectiveRole === 'partner' && (
              <>
                <HeaderBtn
                  onClick={() => canOpenApptModal && setApptOpen(true)}
                >
                  Termin anlegen
                </HeaderBtn>

                {pdPresent === false && (
                  <HeaderBtn
                    onClick={onPartnerRequestAddress}
                    disabled={requestingAddress}
                    title="Konsument um Freigabe der Anschrift bitten."
                  >
                    {requestingAddress
                      ? 'Anschrift…'
                      : 'Anschrift anfragen'}
                  </HeaderBtn>
                )}

                <HeaderBtn onClick={() => setOfferCreateOpen(true)}>
                  Angebot anlegen
                </HeaderBtn>

                <HeaderBtn
                  onClick={onCreateOrder}
                  disabled={!flags.isOfferAccepted || !!activeOrderId}
                  title={createOrderTitle}
                >
                  Auftrag anlegen
                </HeaderBtn>

                <HeaderBtn onClick={() => setInvoiceOpen(true)}>
                  Abrechnen
                </HeaderBtn>

                <HeaderBtn
                  onClick={onPartnerRequestRating}
                  disabled={ratingBusy}
                >
                  {ratingBusy
                    ? 'Bewertung…'
                    : 'Bewertung anfragen'}
                </HeaderBtn>
              </>
            )}

            {/* Fallback */}
            {!isAdmin && effectiveRole === 'unknown' && (
              <span className="text-[10px] text-slate-500">
                Rolle unbekannt – keine Aktionen verfügbar.
              </span>
            )}
          </div>

          {/* Modals */}
          {info.request?.id && (
            <PersonalDataViewer
              open={pdOpen}
              onClose={() => setPdOpen(false)}
              requestId={info.request.id}
            />
          )}

          {apptOpen && info.request?.id && (
            <CreateAppointmentModal
              open={apptOpen}
              onClose={() => setApptOpen(false)}
              requestId={info.request.id}
            />
          )}

          {offerCreateOpen && info.request?.id && (
            <OfferCreateModal
              open={offerCreateOpen}
              onClose={() => setOfferCreateOpen(false)}
              requestId={info.request.id}
            />
          )}

          {orderCreateOpen && info.request?.id && (
            <OrderCreateModal
              open={orderCreateOpen}
              onClose={() => setOrderCreateOpen(false)}
              requestId={info.request.id}
              onCreated={newOrderId => {
                setInfo(prev =>
                  prev
                    ? {
                        ...prev,
                        request: prev.request
                          ? {
                              ...prev.request,
                              status: 'Auftrag erstellt',
                            }
                          : prev.request,
                      }
                    : prev,
                )
                if (newOrderId) {
                  setOrderId(newOrderId)
                  setActiveOrderId(newOrderId)
                }
              }}
            />
          )}

          {orderReviewOpen && orderId && (
            <OrderReviewModal
              open={orderReviewOpen}
              onClose={() => setOrderReviewOpen(false)}
              orderId={orderId}
              role={effectiveRole}
            />
          )}

          {reviewOpen && appointmentId && info.request?.id && (
            <AppointmentReviewModal
              open={reviewOpen}
              onClose={() => setReviewOpen(false)}
              requestId={info.request.id}
              appointmentId={appointmentId}
              requestStatusKey={status.key}
            />
          )}

          {invoiceOpen && info.request?.id && (
            <InvoiceUploadModal
              open={invoiceOpen}
              onClose={() => setInvoiceOpen(false)}
              requestId={info.request.id}
            />
          )}
        </>
      )}
    </div>
  )
}

function HeaderBtn(
  props: React.PropsWithChildren<{
    disabled?: boolean
    title?: string
    onClick?: () => void
  }>,
) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      title={props.title}
      onClick={props.onClick}
      className={cls(
        'inline-flex items-center whitespace-nowrap rounded-2xl border border-white/60 bg-white px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs shadow hover:shadow-sm',
        props.disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      {props.children}
    </button>
  )
}

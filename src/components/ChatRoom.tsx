// src/components/ChatRoom.tsx
'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { supabaseClient } from '@/lib/supabase-client'
import AddressModal from '@/components/AddressModal'
import AppointmentReviewModal from '@/components/appointments/AppointmentReviewModal'
import DocumentCloud from '@/components/DocumentCloud'
import OfferReviewModal from '@/components/offers/OfferReviewModal'
import OrderReviewModal from '@/components/orders/OrderReviewModal'
import { PaperClipIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'

type Message = {
  id: string
  conversation_id: string
  sender_user_id: string
  body_text: string | null
  file_path: string | null
  file_name: string | null
  file_type: string | null
  created_at: string
  _optimistic?: boolean
  _ack?: boolean
}

function cls(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(' ')
}

export default function ChatRoom({ requestId }: { requestId: string }) {
  const sb = supabaseClient()

  const [conversationId, setConversationId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [me, setMe] = React.useState<string | null>(null)
  const [text, setText] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [uploadBusy, setUploadBusy] = React.useState(false)
  const [typingUsers, setTypingUsers] = React.useState<Record<string, number>>(
    {},
  )
  const [addressOpen, setAddressOpen] = React.useState(false)
  const listRef = React.useRef<HTMLDivElement>(null)
  const lastTypingAt = React.useRef<number>(0)
  const channelRef = React.useRef<ReturnType<typeof sb.channel> | null>(null)

  const [isConsumer, setIsConsumer] = React.useState<boolean | null>(null)
  const [pdPresent, setPdPresent] = React.useState<boolean | null>(null)
  const [requestStatusKey, setRequestStatusKey] = React.useState<string>('')

  const [ratingOpen, setRatingOpen] = React.useState(false)

  const REQUEST_MARKER = 'SYS_REQUEST_ADDRESS'
  const REQUEST_PREFIX = 'Anschrift benötigt:'
  const ACK_PREFIX = 'Personen- und Adressdaten wurden bereitgestellt'

  const APPT_MARKER_PREFIX = 'APPT:PROPOSED:'
  const APPT_CONFIRMED_PREFIX = 'APPT:CONFIRMED:'
  const APPT_DECLINED_PREFIX = 'APPT:DECLINED:'

  const OFFER_CREATED_PREFIX = 'OFFER:CREATED:'
  const OFFER_ACCEPTED_PREFIX = 'OFFER:ACCEPTED:'
  const OFFER_DECLINED_PREFIX = 'OFFER:DECLINED:'

  const ORDER_CREATED_PREFIX = 'ORDER:CREATED:'
  const ORDER_ACCEPTED_PREFIX = 'ORDER:ACCEPTED:'
  const ORDER_DECLINED_PREFIX = 'ORDER:DECLINED:'
  const ORDER_CANCELED_PREFIX = 'ORDER:CANCELED:'

  const INVOICE_UPLOADED_PREFIX = 'INVOICE:UPLOADED:'
  const INVOICE_STATUS_RE =
    /^INVOICE:STATUS:(erstellt|bezahlt|verzug):([0-9a-f-]{36})$/i

  const RATING_REQUEST_RE = /^RATING:REQUEST:([0-9a-f-]{36})$/i
  const RATING_SUBMITTED_RE = /^RATING:SUBMITTED(?::|$)/i

  const UUID_RE =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  const OFFER_MARKER_RE =
    /OFFER:(?:CREATED|ACCEPTED|DECLINED):\s*([0-9a-f-]{36})/i
  const ORDER_MARKER_RE =
    /ORDER:(?:CREATED|ACCEPTED|DECLINED|CANCELED):\s*([0-9a-f-]{36})/i

  /* ---------- Marker-Helper ---------- */
  const isAddressRequestMsg = (m: Message) => {
    const t = (m.body_text || '').trim()
    return t === REQUEST_MARKER || t.startsWith(REQUEST_PREFIX)
  }
  const isAddressAckMsg = (m: Message) =>
    (m.body_text || '').trim().startsWith(ACK_PREFIX)

  const isApptProposedMsg = (m: Message) =>
    (m.body_text || '').trim().startsWith(APPT_MARKER_PREFIX)
  const isApptConfirmedMsg = (m: Message) =>
    (m.body_text || '').trim().startsWith(APPT_CONFIRMED_PREFIX)
  const isApptDeclinedMsg = (m: Message) =>
    (m.body_text || '').trim().startsWith(APPT_DECLINED_PREFIX)

  const isOfferCreatedMsg = (m: Message) =>
    OFFER_MARKER_RE.test((m.body_text || '').trim()) &&
    (m.body_text || '').startsWith(OFFER_CREATED_PREFIX)
  const isOfferAcceptedMsg = (m: Message) =>
    OFFER_MARKER_RE.test((m.body_text || '').trim()) &&
    (m.body_text || '').startsWith(OFFER_ACCEPTED_PREFIX)
  const isOfferDeclinedMsg = (m: Message) =>
    OFFER_MARKER_RE.test((m.body_text || '').trim()) &&
    (m.body_text || '').startsWith(OFFER_DECLINED_PREFIX)

  const isOrderCreatedMsg = (m: Message) =>
    ORDER_MARKER_RE.test((m.body_text || '').trim()) &&
    (m.body_text || '').startsWith(ORDER_CREATED_PREFIX)
  const isOrderAcceptedMsg = (m: Message) =>
    ORDER_MARKER_RE.test((m.body_text || '').trim()) &&
    (m.body_text || '').startsWith(ORDER_ACCEPTED_PREFIX)
  const isOrderDeclinedMsg = (m: Message) =>
    ORDER_MARKER_RE.test((m.body_text || '').trim()) &&
    (m.body_text || '').startsWith(ORDER_DECLINED_PREFIX)
  const isOrderCanceledMsg = (m: Message) =>
    ORDER_MARKER_RE.test((m.body_text || '').trim()) &&
    (m.body_text || '').startsWith(ORDER_CANCELED_PREFIX)

  const isInvoiceUploadedMsg = (m: Message) =>
    (m.body_text || '').trim().startsWith(INVOICE_UPLOADED_PREFIX)
  const isInvoiceStatusMsg = (m: Message) =>
    INVOICE_STATUS_RE.test((m.body_text || '').trim())

  const isRatingRequestMsg = (m: Message) =>
    RATING_REQUEST_RE.test((m.body_text || '').trim())
  const isRatingSubmittedMsg = (m: Message) =>
    RATING_SUBMITTED_RE.test((m.body_text || '').trim())

  const extractApptId = (t: string) => t.split(':').pop() || ''
  function extractOfferIdStrict(t: string): string {
    const m = t.match(OFFER_MARKER_RE)
    if (m?.[1]) return m[1]
    const u = t.match(UUID_RE)
    return u ? u[0] : ''
  }
  function extractOrderIdStrict(t: string): string {
    const m = t.match(ORDER_MARKER_RE)
    if (m?.[1]) return m[1]
    const u = t.match(UUID_RE)
    return u ? u[0] : ''
  }
  function extractInvoiceStatus(
    t: string,
  ): { status: 'erstellt' | 'bezahlt' | 'verzug'; id: string } {
    const m = t.match(INVOICE_STATUS_RE)
    return {
      status: (m?.[1] as any) || 'erstellt',
      id: m?.[2] || '',
    }
  }

  const keyOfStatus = (val: unknown) => String(val || '').trim().toLowerCase()

  const scrollToBottom = (smooth = true) => {
    requestAnimationFrame(() => {
      if (!listRef.current) return
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      })
    })
  }

  const throttleTyping = (ms = 900) => {
    const now = Date.now()
    if (now - lastTypingAt.current < ms) return false
    lastTypingAt.current = now
    return true
  }

  /* ---------- Init: User ---------- */
  React.useEffect(() => {
    sb.auth
      .getUser()
      .then(({ data }) => setMe(data.user?.id ?? null))
      .catch(() => setMe(null))
  }, [sb])

  /* ---------- Conversation laden ---------- */
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch(`/api/chat/by-request/${requestId}`)
      if (!res.ok) return
      const j = await res.json()
      if (!cancelled) setConversationId(j.conversation.id as string)
    })()
    return () => {
      cancelled = true
    }
  }, [requestId])

  /* ---------- Rolle + Personendaten ---------- */
  React.useEffect(() => {
    if (!me) return
    let cancelled = false
    ;(async () => {
      const { data } = await sb
        .from('market_conversations')
        .select('id, consumer_user_id, partners!inner(owner_user_id), request_id')
        .eq('request_id', requestId)
        .maybeSingle()
      if (!cancelled) {
        const consumerId = (data as any)?.consumer_user_id as string | null
        setIsConsumer(!!consumerId && consumerId === me)
      }

      const { data: pd } = await sb
        .from('market_request_personal_data')
        .select('id')
        .eq('request_id', requestId)
        .maybeSingle()
      setPdPresent(!!pd?.id)
    })()
    return () => {
      cancelled = true
    }
  }, [sb, me, requestId])

  /* ---------- Request-Status + Realtime ---------- */
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await sb
        .from('market_requests')
        .select('status')
        .eq('id', requestId)
        .maybeSingle()
      if (!cancelled) setRequestStatusKey(keyOfStatus(data?.status))
    })()

    const ch = sb.channel(`req:${requestId}`)
    ch.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'market_requests',
        filter: `id=eq.${requestId}`,
      },
      (payload: any) =>
        setRequestStatusKey(keyOfStatus(payload?.new?.status)),
    ).subscribe(() => {})

    return () => {
      sb.removeChannel(ch)
      cancelled = true
    }
  }, [sb, requestId])

  /* ---------- Messages + Chat-Realtime ---------- */
  React.useEffect(() => {
    if (!conversationId) return
    let mounted = true

    ;(async () => {
      const { data, error } = await sb
        .from('market_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(400)
      if (!error && mounted) {
        setMessages(
          (data as Message[]).map(m => ({
            ...m,
            _optimistic: false,
            _ack: true,
          })),
        )
        scrollToBottom(false)
      }
    })()

    const ch = sb.channel(`chat:${conversationId}`, {
      config: { presence: { key: 'presence' } },
    })

    // Neue Messages
    ch.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'market_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      payload => {
        const msg = payload.new as Message
        setMessages(prev => {
          const isText = !!msg.body_text && !msg.file_path
          const isFile = !!msg.file_path

          for (let i = prev.length - 1; i >= 0; i--) {
            const m = prev[i]
            if (!m._optimistic) continue
            if (m.sender_user_id !== msg.sender_user_id) continue

            const mText = !!m.body_text && !m.file_path
            const mFile = !!m.file_path
            const textMatches =
              isText && mText && m.body_text === msg.body_text
            const fileMatches = isFile && mFile

            if (textMatches || fileMatches) {
              const clone = [...prev]
              clone[i] = { ...msg, _optimistic: false, _ack: true }
              return clone
            }
          }
          return [...prev, { ...msg, _optimistic: false, _ack: true }]
        })

        const t = (msg.body_text || '').trim()
        if (t.startsWith(APPT_CONFIRMED_PREFIX))
          setRequestStatusKey('termin bestätigt')
        if (t.startsWith(APPT_DECLINED_PREFIX)) setRequestStatusKey('aktiv')

        scrollToBottom()
      },
    )

    // Typing
    ch.on('broadcast', { event: 'typing' }, payload => {
      const sender = payload?.payload?.sender as string | undefined
      if (!sender || sender === me) return
      setTypingUsers(prev => ({ ...prev, [sender]: Date.now() }))
      setTimeout(() => {
        setTypingUsers(prev => {
          const copy = { ...prev }
          if (Date.now() - (copy[sender] ?? 0) > 1800) delete copy[sender]
          return copy
        })
      }, 2000)
    })

    ch.subscribe(() => {})
    channelRef.current = ch

    return () => {
      sb.removeChannel(ch)
      channelRef.current = null
      mounted = false
    }
  }, [sb, conversationId, me])

  /* ---------- Realtime: Personendaten ---------- */
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
      (payload: any) =>
        setPdPresent(payload?.eventType === 'DELETE' ? false : true),
    ).subscribe(() => {})
    return () => {
      sb.removeChannel(ch)
    }
  }, [sb, requestId])

  /* ---------- Typing Broadcast ---------- */
  const notifyTyping = () => {
    if (!channelRef.current || !throttleTyping()) return
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { sender: me, conversationId },
    })
  }

  /* ---------- Senden Text ---------- */
  const sendText = async () => {
    if (!conversationId || !me || !text.trim() || busy) return
    const body = text.trim()

    const temp: Message = {
      id: 'temp-' + crypto.randomUUID(),
      conversation_id: conversationId,
      sender_user_id: me,
      body_text: body,
      file_path: null,
      file_name: null,
      file_type: null,
      created_at: new Date().toISOString(),
      _optimistic: true,
      _ack: false,
    }

    setMessages(prev => [...prev, temp])
    scrollToBottom()
    setBusy(true)

    try {
      const { error } = await sb.from('market_messages').insert({
        conversation_id: conversationId,
        sender_user_id: me,
        body_text: body,
      })
      if (error) {
        setMessages(prev => prev.filter(m => m.id !== temp.id))
        console.error('sendText error', error)
        return
      }
      setMessages(prev =>
        prev.map(m => (m.id === temp.id ? { ...m, _ack: true } : m)),
      )
      setText('')
    } finally {
      setBusy(false)
    }
  }

  /* ---------- Upload ---------- */
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!conversationId || !me) return
    const inputEl = e.currentTarget
    const file = inputEl.files?.[0]
    if (!file) return

    setUploadBusy(true)
    try {
      const fd = new FormData()
      fd.set('category', 'allgemein')
      fd.set('filename', file.name)
      fd.set('file', file)

      const res = await fetch(`/api/chat/${requestId}/documents`, {
        method: 'POST',
        body: fd,
        credentials: 'include',
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) throw new Error(j?.error || res.statusText)

      const path: string = j.path
      const temp: Message = {
        id: 'temp-' + crypto.randomUUID(),
        conversation_id: conversationId,
        sender_user_id: me,
        body_text: null,
        file_path: path,
        file_name: file.name,
        file_type: file.type,
        created_at: new Date().toISOString(),
        _optimistic: true,
        _ack: false,
      }

      setMessages(prev => [...prev, temp])
      scrollToBottom()

      const { error: insErr } = await sb.from('market_messages').insert({
        conversation_id: conversationId,
        sender_user_id: me,
        file_path: path,
        file_name: file.name,
        file_type: file.type,
      })

      if (insErr) {
        setMessages(prev => prev.filter(m => m.id !== temp.id))
        console.error('sendFile error', insErr)
      } else {
        setMessages(prev =>
          prev.map(m => (m.id === temp.id ? { ...m, _ack: true } : m)),
        )
      }

      window.dispatchEvent(
        new CustomEvent('documents:updated', {
          detail: { requestId },
        }),
      )
    } catch (err) {
      console.error(err)
    } finally {
      setUploadBusy(false)
      if (inputEl) inputEl.value = ''
    }
  }

  /* ---------- Download URL ---------- */
  const downloadUrl = async (path: string) => {
    const { data } = await sb.storage
      .from('markt')
      .createSignedUrl(path, 60 * 10)
    return data?.signedUrl
  }

  const typingVisible = React.useMemo(() => {
    const now = Date.now()
    return Object.values(typingUsers).some(t => now - t < 1800)
  }, [typingUsers])

  const hasRatingSubmitted = React.useMemo(
    () => messages.some(isRatingSubmittedMsg),
    [messages],
  )

  /* ---------- Filter System-Duplikate ---------- */
  const filtered = React.useMemo(() => {
    const all = messages

    const lastAckIndex = all
      .map((m, i) => ({ m, i }))
      .filter(x => isAddressAckMsg(x.m))
      .map(x => x.i)
      .pop()

    const lastOrderIdx: Record<string, number> = {}
    for (let i = 0; i < all.length; i++) {
      const t = (all[i].body_text || '').trim()
      if (!t) continue
      let k: string | null = null
      if (t.startsWith(ORDER_ACCEPTED_PREFIX))
        k = `accepted:${extractOrderIdStrict(t)}`
      else if (t.startsWith(ORDER_DECLINED_PREFIX))
        k = `declined:${extractOrderIdStrict(t)}`
      else if (t.startsWith(ORDER_CANCELED_PREFIX))
        k = `canceled:${extractOrderIdStrict(t)}`
      if (k) lastOrderIdx[k] = i
    }

    return all.filter((m, i) => {
      if (isAddressAckMsg(m) && lastAckIndex !== undefined && i !== lastAckIndex)
        return false

      const t = (m.body_text || '').trim()
      if (t.startsWith(ORDER_ACCEPTED_PREFIX)) {
        const key = `accepted:${extractOrderIdStrict(t)}`
        if (lastOrderIdx[key] !== i) return false
      } else if (t.startsWith(ORDER_DECLINED_PREFIX)) {
        const key = `declined:${extractOrderIdStrict(t)}`
        if (lastOrderIdx[key] !== i) return false
      } else if (t.startsWith(ORDER_CANCELED_PREFIX)) {
        const key = `canceled:${extractOrderIdStrict(t)}`
        if (lastOrderIdx[key] !== i) return false
      }
      return true
    })
  }, [messages])

  /* ---------- System Cards ---------- */

  function AppointmentCard({
    id,
    meIsConsumer,
    requestStatusKey,
  }: {
    id: string
    meIsConsumer: boolean
    requestStatusKey: string
  }) {
    const [open, setOpen] = React.useState(false)
    return (
      <>
        <div className="w-full max-w-[640px] rounded-2xl border border-fuchsia-200/80 bg-fuchsia-50/90 px-4 py-3 ring-1 ring-white/60 shadow-sm">
          <div className="text-sm font-semibold text-fuchsia-900">
            Termin vorgeschlagen
          </div>
          <p className="mt-1 text-[12px] text-fuchsia-900/90">
            Der Partner hat einen Terminvorschlag erstellt.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs text-white hover:opacity-90"
            >
              Details ansehen
            </button>
            {!meIsConsumer && (
              <span className="text-[10px] text-fuchsia-900/70">
                Wartet auf Bestätigung.
              </span>
            )}
          </div>
        </div>
        <AppointmentReviewModal
          open={open}
          onClose={() => setOpen(false)}
          appointmentId={id}
          requestId={requestId}
          requestStatusKey={requestStatusKey}
        />
      </>
    )
  }

  function OfferCard({
    id,
    meIsConsumer,
  }: {
    id: string
    meIsConsumer: boolean
  }) {
    const [open, setOpen] = React.useState(false)
    const role: 'konsument' | 'partner' | 'admin' | 'unknown' =
      meIsConsumer ? 'konsument' : 'partner'
    return (
      <>
        <div className="w-full max-w-[640px] rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 ring-1 ring-white/60 shadow-sm">
          <div className="text-sm font-semibold text-amber-900">
            Neues Angebot
          </div>
          <p className="mt-1 text-[12px] text-amber-900/90">
            Der Partner hat ein Angebot eingestellt.
          </p>
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs text-white hover:opacity-90"
            >
              Angebot ansehen
            </button>
          </div>
        </div>
        <OfferReviewModal
          open={open}
          onClose={() => setOpen(false)}
          offerId={id}
          role={role}
        />
      </>
    )
  }

  function OrderCard({
    id,
    meIsConsumer,
  }: {
    id: string
    meIsConsumer: boolean
  }) {
    const [open, setOpen] = React.useState(false)
    const role: 'konsument' | 'partner' | 'admin' | 'unknown' =
      meIsConsumer ? 'konsument' : 'partner'
    return (
      <>
        <div className="w-full max-w-[640px] rounded-2xl border border-sky-200/80 bg-sky-50/90 px-4 py-3 ring-1 ring-white/60 shadow-sm">
          <div className="text-sm font-semibold text-sky-900">
            Neuer Auftrag
          </div>
          <p className="mt-1 text-[12px] text-sky-900/90">
            Bitte prüfen und annehmen oder ablehnen.
          </p>
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs text-white hover:opacity-90"
            >
              Auftrag ansehen
            </button>
          </div>
        </div>
        <OrderReviewModal
          open={open}
          onClose={() => setOpen(false)}
          orderId={id}
          role={role}
        />
      </>
    )
  }

  function StatusBadge({
    status,
  }: {
    status: 'erstellt' | 'bezahlt' | 'verzug'
  }) {
    const map = {
      erstellt: {
        cls: 'bg-slate-100 border-slate-200 text-slate-800',
        label: 'Erstellt',
      },
      bezahlt: {
        cls: 'bg-emerald-100 border-emerald-200 text-emerald-900',
        label: 'Bezahlt',
      },
      verzug: {
        cls: 'bg-amber-100 border-amber-200 text-amber-900',
        label: 'Zahlungsverzug',
      },
    } as const
    const s = map[status]
    return (
      <span
        className={cls(
          'inline-flex items-center rounded-lg border px-2 py-[2px] text-[10px]',
          s.cls,
        )}
      >
        {s.label}
      </span>
    )
  }

  function InvoiceUploadedCard() {
    return (
      <div className="w-full max-w-[640px] rounded-2xl border border-indigo-200/80 bg-indigo-50/90 px-4 py-3 ring-1 ring-white/60 shadow-sm">
        <div className="text-sm font-semibold text-indigo-900">
          Abrechnung hochgeladen
        </div>
        <p className="mt-1 text-[12px] text-indigo-900/90">
          Eine Rechnung wurde hinzugefügt. Du findest sie im Tab{' '}
          <b>„Abrechnung“</b> unterhalb des Chats.
        </p>
      </div>
    )
  }

  function InvoiceStatusCard({
    status,
  }: {
    status: 'erstellt' | 'bezahlt' | 'verzug'
  }) {
    return (
      <div className="w-full max-w-[640px] rounded-2xl border border-indigo-200/80 bg-indigo-50/90 px-4 py-3 ring-1 ring-white/60 shadow-sm">
        <div className="text-sm font-semibold text-indigo-900">
          Rechnungsstatus aktualisiert
        </div>
        <div className="mt-1">
          <StatusBadge status={status} />
        </div>
      </div>
    )
  }

  function RatingRequestCard() {
    const canRate = isConsumer === true && !hasRatingSubmitted
    return (
      <div className="w-full max-w-[640px] rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 ring-1 ring-white/60 shadow-sm">
        <div className="text-sm font-semibold text-emerald-900">
          Bitte um Bewertung
        </div>
        <p className="mt-1 text-[12px] text-emerald-900/90">
          Bewerte die Zusammenarbeit mit dem Partner – das hilft anderen
          Auftraggebern.
        </p>
        <div className="mt-2 flex items-center gap-2">
          {canRate ? (
            <button
              type="button"
              onClick={() => setRatingOpen(true)}
              className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs text-white hover:opacity-90"
            >
              Jetzt bewerten
            </button>
          ) : (
            <span className="text-[10px] text-emerald-900/70">
              {isConsumer
                ? 'Bereits bewertet oder aktuell nicht verfügbar.'
                : 'Warten auf Bewertung durch Kund:in.'}
            </span>
          )}
        </div>
      </div>
    )
  }

  function RatingSubmittedCard() {
    return (
      <div className="w-full max-w-[640px] rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 ring-1 ring-white/60 shadow-sm">
        <div className="text-sm font-semibold text-emerald-900">
          Danke für deine Bewertung!
        </div>
        <p className="mt-1 text-[12px] text-emerald-900/90">
          Deine Bewertung wurde gespeichert.
        </p>
      </div>
    )
  }

  /* ---------- Typing Label ---------- */
  const typingLabel = typingVisible && 'Jemand tippt …'

  /* -------------------------------- RENDER -------------------------------- */

  return (
    <>
      {/* Chat-Card mit fester, viewport-basierter Höhe */}
      <div
        className={cls(
          'flex flex-col rounded-3xl',
          'border border-white/70 bg-white/80 backdrop-blur-2xl',
          'shadow-[0_18px_55px_rgba(15,23,42,0.10)] ring-1 ring-white/60',
          'min-h-[360px]',
          'h-[calc(100dvh-260px)] max-h-[calc(100dvh-220px)]',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/60">
          <div className="flex flex-col min-w-0">
            <div className="inline-flex items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-slate-900">
                Chat & Dokumente
              </h2>
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
            <p className="text-[10px] text-slate-500">
              Direkte Abstimmung mit Ihrem Partner – alle Nachrichten an einem Ort.
            </p>
          </div>
          {requestStatusKey && (
            <span className="shrink-0 rounded-full bg-slate-900/90 px-3 py-1 text-[9px] font-medium text-white">
              Status: {requestStatusKey}
            </span>
          )}
        </div>

        {/* Messages – mit innerem Wrapper, der alles nach unten drückt */}
        <div
          ref={listRef}
          className={cls(
            'flex-1 min-h-0 overflow-y-auto px-3 py-3',
            'bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.03),_transparent)]',
          )}
        >
          <div className="flex h-full flex-col justify-end space-y-3">
            {filtered.map(m => {
              const mine = m.sender_user_id === me
              const isSending = !!m._optimistic && !m._ack
              const t = (m.body_text || '').trim()

              // Anschrift benötigt
              if (isAddressRequestMsg(m)) {
                const showProvideBtn = isConsumer === true && pdPresent === false
                return (
                  <div key={m.id} className="flex justify-start">
                    <div className="w-full max-w-[640px] rounded-2xl border border-amber-200/80 bg-amber-50/95 px-4 py-3 ring-1 ring-white/60 shadow-sm">
                      <div className="text-sm font-semibold text-amber-900">
                        Anschrift benötigt
                      </div>
                      <p className="mt-1 text-[12px] leading-relaxed text-amber-900/90">
                        Für Angebot, Auftrag oder Rechnung werden deine Adressdaten benötigt. Du kannst
                        diese später wieder entfernen.
                      </p>
                      {showProvideBtn && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => setAddressOpen(true)}
                            className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs text-white hover:opacity-90"
                          >
                            Anschrift bereitstellen
                          </button>
                        </div>
                      )}
                      <div className="mt-1 text-[9px] text-amber-900/70">
                        {isSending
                          ? 'Senden…'
                          : new Date(m.created_at).toLocaleString('de-DE')}
                      </div>
                    </div>
                  </div>
                )
              }

              // Anschrift bestätigt
              if (isAddressAckMsg(m)) {
                return (
                  <div key={m.id} className="flex justify-start">
                    <div className="w-full max-w-[640px] rounded-2xl border border-emerald-200/80 bg-emerald-50/95 px-4 py-3 ring-1 ring-white/60 shadow-sm">
                      <div className="text-sm font-semibold text-emerald-900">
                        Personendaten gespeichert
                      </div>
                      <p className="mt-1 text-[12px] text-emerald-900/90">
                        Die Daten sind hinterlegt und können im Header eingesehen werden.
                      </p>
                      <div className="mt-1 text-[9px] text-emerald-900/70">
                        {isSending
                          ? 'Senden…'
                          : new Date(m.created_at).toLocaleString('de-DE')}
                      </div>
                    </div>
                  </div>
                )
              }

              // Termine
              if (isApptProposedMsg(m)) {
                const apptId = extractApptId(t)
                const meIsConsumer = isConsumer === true && !mine
                return (
                  <div key={m.id} className="flex justify-start">
                    <AppointmentCard
                      id={apptId}
                      meIsConsumer={!!meIsConsumer}
                      requestStatusKey={requestStatusKey}
                    />
                  </div>
                )
              }
              if (isApptConfirmedMsg(m)) {
                return (
                  <div key={m.id} className="flex justify-start">
                    <div className="w-full max-w-[640px] rounded-2xl border border-teal-200/80 bg-teal-50/90 px-4 py-3 ring-1 ring-white/60 shadow-sm">
                      <div className="text-sm font-semibold text-teal-900">
                        Termin bestätigt
                      </div>
                      <div className="mt-1 text-[9px] text-teal-900/70">
                        {new Date(m.created_at).toLocaleString('de-DE')}
                      </div>
                    </div>
                  </div>
                )
              }
              if (isApptDeclinedMsg(m)) {
                return (
                  <div key={m.id} className="flex justify-start">
                    <div className="w-full max-w-[640px] rounded-2xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 ring-1 ring-white/60 shadow-sm">
                      <div className="text-sm font-semibold text-rose-900">
                        Termin abgelehnt
                      </div>
                      <div className="mt-1 text-[9px] text-rose-900/70">
                        {new Date(m.created_at).toLocaleString('de-DE')}
                      </div>
                    </div>
                  </div>
                )
              }

              // Angebote
              if (isOfferCreatedMsg(m)) {
                const offerId = extractOfferIdStrict(t)
                const meIsConsumer =
                  isConsumer === true && m.sender_user_id !== me
                return (
                  <div key={m.id} className="flex justify-start">
                    <OfferCard id={offerId} meIsConsumer={!!meIsConsumer} />
                  </div>
                )
              }
              if (isOfferAcceptedMsg(m)) {
                return (
                  <div key={m.id} className="flex justify-start">
                    <div className="w-full max-w-[640px] rounded-2xl border border-teal-200/80 bg-teal-50/90 px-4 py-3 ring-1 ring-white/60 shadow-sm">
                      <div className="text-sm font-semibold text-teal-900">
                        Angebot angenommen
                      </div>
                      <div className="mt-1 text-[9px] text-teal-900/70">
                        {new Date(m.created_at).toLocaleString('de-DE')}
                      </div>
                    </div>
                  </div>
                )
              }
              if (isOfferDeclinedMsg(m)) {
                return (
                  <div key={m.id} className="flex justify-start">
                    <div className="w-full max-w-[640px] rounded-2xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 ring-1 ring-white/60 shadow-sm">
                      <div className="text-sm font-semibold text-rose-900">
                        Angebot abgelehnt
                      </div>
                      <div className="mt-1 text-[9px] text-rose-900/70">
                        {new Date(m.created_at).toLocaleString('de-DE')}
                      </div>
                    </div>
                  </div>
                )
              }

              // Aufträge
              if (isOrderCreatedMsg(m)) {
                const orderId = extractOrderIdStrict(t)
                const meIsConsumer =
                  isConsumer === true && m.sender_user_id !== me
                return (
                  <div key={m.id} className="flex justify-start">
                    <OrderCard id={orderId} meIsConsumer={!!meIsConsumer} />
                  </div>
                )
              }
              if (isOrderAcceptedMsg(m)) {
                return (
                  <div key={m.id} className="flex justify-start">
                    <div className="w-full max-w-[640px] rounded-2xl border border-blue-200/80 bg-blue-50/90 px-4 py-3 ring-1 ring-white/60 shadow-sm">
                      <div className="text-sm font-semibold text-blue-900">
                        Auftrag angenommen
                      </div>
                      <div className="mt-1 text-[9px] text-blue-900/70">
                        {new Date(m.created_at).toLocaleString('de-DE')}
                      </div>
                    </div>
                  </div>
                )
              }
              if (isOrderDeclinedMsg(m)) {
                return (
                  <div key={m.id} className="flex justify-start">
                    <div className="w-full max-w-[640px] rounded-2xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 ring-1 ring-white/60 shadow-sm">
                      <div className="text-sm font-semibold text-rose-900">
                        Auftrag abgelehnt
                      </div>
                      <div className="mt-1 text-[9px] text-rose-900/70">
                        {new Date(m.created_at).toLocaleString('de-DE')}
                      </div>
                    </div>
                  </div>
                )
              }
              if (isOrderCanceledMsg(m)) {
                return (
                  <div key={m.id} className="flex justify-start">
                    <div className="w-full max-w-[640px] rounded-2xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 ring-1 ring-white/60 shadow-sm">
                      <div className="text-sm font-semibold text-rose-900">
                        Auftrag storniert
                      </div>
                      <div className="mt-1 text-[9px] text-rose-900/70">
                        {new Date(m.created_at).toLocaleString('de-DE')}
                      </div>
                    </div>
                  </div>
                )
              }

              // Rechnung
              if (isInvoiceUploadedMsg(m)) {
                return (
                  <div key={m.id} className="flex justify-start">
                    <InvoiceUploadedCard />
                  </div>
                )
              }
              if (isInvoiceStatusMsg(m)) {
                const { status } = extractInvoiceStatus(t)
                return (
                  <div key={m.id} className="flex justify-start">
                    <InvoiceStatusCard status={status} />
                  </div>
                )
              }

              // Rating
              if (isRatingRequestMsg(m)) {
                return (
                  <div key={m.id} className="flex justify-start">
                    <RatingRequestCard />
                  </div>
                )
              }
              if (isRatingSubmittedMsg(m)) {
                return (
                  <div key={m.id} className="flex justify-start">
                    <RatingSubmittedCard />
                  </div>
                )
              }

              // Normale Chat-Nachricht
              return (
                <div
                  key={m.id}
                  className={cls('flex', mine ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cls(
                      'max-w-[88%] sm:max-w-[78%] md:max-w-[72%]',
                      'rounded-2xl px-3 py-2 ring-1 ring-white/60 shadow-sm',
                      'backdrop-blur-xl text-[12px] leading-relaxed',
                      mine
                        ? 'bg-slate-900 text-white rounded-br-sm'
                        : 'bg-white/95 text-slate-900 rounded-bl-sm',
                    )}
                  >
                    {m.body_text && (
                      <div className="whitespace-pre-wrap break-words">
                        {m.body_text}
                      </div>
                    )}
                    {m.file_path && (
                      <Attachment
                        path={m.file_path}
                        name={m.file_name}
                        getUrl={downloadUrl}
                      />
                    )}
                    <div
                      className={cls(
                        'mt-1 text-[9px]',
                        mine ? 'text-slate-200/80' : 'text-slate-500',
                      )}
                    >
                      {isSending
                        ? 'Senden…'
                        : new Date(m.created_at).toLocaleString('de-DE')}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Typing Indicator */}
        {typingLabel && (
          <div className="px-4 pb-1 text-[9px] text-slate-500">{typingLabel}</div>
        )}

        {/* Input + Upload – kompakte Zeile, mobil-freundlich */}
        <div className="px-3 pt-2 pb-3 border-t border-white/60 bg-white/90 backdrop-blur-2xl">
          <div className="flex items-end gap-2 sm:gap-3">
            {/* Datei anhängen – runder Icon-Button links */}
            <label className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/70 bg-white/98 text-slate-700 shadow-sm hover:bg-slate-50">
              <input
                type="file"
                className="hidden"
                onChange={onFileChange}
                accept=".pdf,image/*"
              />
              <PaperClipIcon className="h-4 w-4" />
            </label>

            {/* Textfeld + Senden rechts als Bubble */}
            <div className="flex flex-1 items-center gap-2 rounded-2xl border border-white/70 bg-white/98 px-3 py-1.5 shadow-sm">
              <input
                value={text}
                onChange={e => {
                  setText(e.target.value)
                  notifyTyping()
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendText()
                  } else {
                    notifyTyping()
                  }
                }}
                placeholder="Nachricht schreiben…"
                className="w-full flex-1 border-none bg-transparent text-[12px] text-slate-900 outline-none placeholder:text-slate-400 sm:text-[13px]"
              />
              <button
                type="button"
                onClick={sendText}
                disabled={!text.trim() || busy}
                className={cls(
                  'inline-flex h-8 w-8 items-center justify-center rounded-full sm:h-9 sm:w-9',
                  'bg-slate-900 text-white shadow-sm',
                  'hover:opacity-90 disabled:opacity-40',
                )}
                aria-label="Nachricht senden"
              >
                <PaperAirplaneIcon className="h-4 w-4 -rotate-45" />
              </button>
            </div>

            {uploadBusy && (
              <span className="mb-[2px] hidden text-[10px] text-slate-500 sm:inline">
                Lädt…
              </span>
            )}
          </div>

          {/* Upload-Status mobil darunter */}
          {uploadBusy && (
            <div className="mt-1 text-[10px] text-slate-500 sm:hidden">
              Datei wird hochgeladen …
            </div>
          )}
        </div>
      </div>

      {/* Dokumente – außerhalb der Chat-Card, mit Abstand (besonders mobil angenehm) */}
      {conversationId && me && (
        <div className="mt-4 sm:mt-5">
          <DocumentCloud requestId={requestId} currentUserId={me || ''} />
        </div>
      )}

      {/* Personendaten Modal */}
      <AddressModal
        open={addressOpen}
        onClose={() => setAddressOpen(false)}
        requestId={requestId}
      />

      {/* Rating Modal */}
      {ratingOpen && (
        <RatingModal
          open={ratingOpen}
          onClose={() => setRatingOpen(false)}
          requestId={requestId}
          conversationId={conversationId}
          currentUserId={me}
          onSubmitted={async () => {
            if (conversationId) {
              await sb.from('market_messages').insert({
                conversation_id: conversationId,
                body_text: 'RATING:SUBMITTED',
              })
            }
          }}
        />
      )}
    </>
  )
}

/* ------------------------- Attachment-Komponente ------------------------- */

function Attachment({
  path,
  name,
  getUrl,
}: {
  path: string
  name: string | null
  getUrl: (p: string) => Promise<string | undefined>
}) {
  const [href, setHref] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    getUrl(path).then(u => {
      if (mounted) setHref(u ?? null)
    })
    return () => {
      mounted = false
    }
  }, [path, getUrl])

  return (
    <div className="mt-1 text-[11px]">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="underline text-white"
        >
          {name || 'Anhang öffnen'}
        </a>
      ) : (
        <span className="opacity-60">{name || 'Anhang'}</span>
      )}
    </div>
  )
}

/* ------------------------------ Rating Modal ------------------------------ */

function RatingModal({
  open,
  onClose,
  requestId,
  conversationId,
  currentUserId,
  onSubmitted,
}: {
  open: boolean
  onClose: () => void
  requestId: string
  conversationId: string | null
  currentUserId: string | null
  onSubmitted: () => Promise<void> | void
}) {
  const [name, setName] = React.useState('')
  const [text, setText] = React.useState('')
  const [stars, setStars] = React.useState<number>(10)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

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

  const submit = async () => {
    setError(null)
    if (stars < 0 || stars > 10) {
      setError('Bitte 0–10 Sterne wählen.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/konsument/ratings/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          name: name.trim() || null,
          text: text.trim(),
          stars,
        }),
      })
      if (!res.ok) {
        console.warn(
          'ratings/submit response:',
          await res.text().catch(() => ''),
        )
      }
      await onSubmitted()
      onClose()
      alert('Danke für deine Bewertung!')
    } catch (e: any) {
      setError(e?.message || 'Fehler beim Senden der Bewertung.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  const node = (
    <div className="fixed inset-0 z-[120] flex items-start justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/35 backdrop-blur"
        onClick={() => !busy && onClose()}
      />
      <div
        className={cls(
          'relative z-10 mt-12 w-full max-w-xl max-h-[92vh] overflow-y-auto',
          'rounded-3xl border border-white/70 bg-white/92 backdrop-blur-2xl',
          'p-6 shadow-[0_18px_55px_rgba(15,23,42,0.22)] ring-1 ring-white/80',
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Partner bewerten
            </h3>
            <p className="mt-1 text-[10px] text-slate-500">
              Sterne von 0 (schlecht) bis 10 (top). Dein Name ist optional.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-xl border border-white/70 bg-white px-3 py-1.5 text-[11px] text-slate-600 hover:bg-slate-50"
          >
            Schließen
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-[10px] text-slate-600">
              Sterne (0–10)
            </span>
            <div className="flex flex-wrap items-center gap-1">
              {Array.from({ length: 11 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStars(i)}
                  className={cls(
                    'px-2 py-1 rounded-lg border text-[11px]',
                    i === stars
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white border-white/70 text-slate-800 hover:bg-slate-50',
                  )}
                >
                  {i}
                </button>
              ))}
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] text-slate-600">
              Kommentar
            </span>
            <textarea
              rows={4}
              className="w-full rounded-2xl border border-white/70 bg-white/98 px-3 py-2 text-[12px] text-slate-900 outline-none"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Wie war die Zusammenarbeit?"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] text-slate-600">
              Name (optional)
            </span>
            <input
              className="w-full rounded-2xl border border-white/70 bg-white/98 px-3 py-2 text-[12px] text-slate-900 outline-none"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder='z. B. "Christoph P."'
            />
          </label>

          {error && <div className="text-[10px] text-rose-600">{error}</div>}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="rounded-xl border border-white/70 bg-white px-3 py-1.5 text-[11px] text-slate-600 hover:bg-slate-50"
            >
              Abbrechen
            </button>
            <button
              type="button"
              disabled={busy || stars < 0 || stars > 10}
              onClick={submit}
              className={cls(
                'rounded-xl px-3 py-1.5 text-[11px] font-medium text-white',
                'bg-slate-900 hover:opacity-90',
                busy && 'opacity-60',
              )}
            >
              {busy ? 'Sende…' : 'Bewertung senden'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(node, document.body) : node
}

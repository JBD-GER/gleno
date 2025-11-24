'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase-client'
import ChatHeader from '@/components/ChatHeader'
import ChatRoom from '@/components/ChatRoom'

type RouteParams = { requestId: string }

export default function PartnerChatPage() {
  // ⬇️ statt params-Prop: route params über Hook holen (kein Promise, keine Warnung)
  const { requestId } = useParams<RouteParams>()

  const sb = supabaseClient()
  const [allowed, setAllowed] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    if (!requestId) {
      setAllowed(false)
      return
    }

    let cancelled = false

    ;(async () => {
      const { data: conv, error } = await sb
        .from('market_conversations')
        .select('id, partner_id')
        .eq('request_id', requestId)
        .single()

      if (cancelled) return
      if (error || !conv) {
        setAllowed(false)
        return
      }

      const { data: partner, error: pErr } = await sb
        .from('partners')
        .select('owner_user_id')
        .eq('id', conv.partner_id)
        .single()

      if (cancelled) return
      if (pErr || !partner) {
        setAllowed(false)
        return
      }

      const { data: me } = await sb.auth.getUser()
      const userId = me?.user?.id
      setAllowed(userId === partner.owner_user_id)
    })()

    return () => {
      cancelled = true
    }
  }, [requestId, sb])

  if (allowed === null) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center px-4">
        <div className="rounded-2xl bg-white/90 backdrop-blur-xl px-4 py-2 text-sm text-slate-600 shadow">
          Lade Chat …
        </div>
      </div>
    )
  }

  if (!allowed) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center px-4">
        <div className="rounded-2xl bg-white/90 backdrop-blur-xl px-4 py-2 text-sm text-slate-700 shadow">
          Kein Chat verfügbar oder Zugriff verweigert.
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] px-4 sm:px-5 lg:px-8 py-4 sm:py-6 bg-slate-50">
      <div className="w-full space-y-4">
        <ChatHeader requestId={requestId} />
        <div className="rounded-3xl border border-white/70 bg-white/95 backdrop-blur-2xl shadow-[0_10px_34px_rgba(15,23,42,0.06)] ring-1 ring-white/70">
          <ChatRoom requestId={requestId} />
        </div>
      </div>
    </div>
  )
}

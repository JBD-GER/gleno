'use client'

import * as React from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import ChatHeader from '@/components/ChatHeader'
import ChatRoom from '@/components/ChatRoom'

type Params = { requestId: string }
export default function PartnerChatPage({ params }: { params: Promise<Params> }) {
  const { requestId } = React.use(params)
  const sb = supabaseClient()
  const [allowed, setAllowed] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: conv, error } = await sb
        .from('market_conversations')
        .select('id, partner_id')
        .eq('request_id', requestId)
        .single()
      if (cancelled) return
      if (error || !conv) return setAllowed(false)

      const { data: partner, error: pErr } = await sb
        .from('partners')
        .select('owner_user_id')
        .eq('id', conv.partner_id)
        .single()
      if (cancelled) return
      if (pErr || !partner) return setAllowed(false)

      const { data: me } = await sb.auth.getUser()
      setAllowed(me.user?.id === partner.owner_user_id)
    })()
    return () => { cancelled = true }
  }, [requestId, sb])

  if (allowed === null) return <div className="p-6 text-sm opacity-60">Lade…</div>
  if (!allowed) return <div className="p-6 text-sm">Kein Chat verfügbar.</div>

  return (
    <div className="p-4 space-y-3">
      <ChatHeader requestId={requestId} />
      <ChatRoom requestId={requestId} />
    </div>
  )
}

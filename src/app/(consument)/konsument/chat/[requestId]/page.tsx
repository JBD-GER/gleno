'use client'

import * as React from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import ChatHeader from '@/components/ChatHeader'
import ChatRoom from '@/components/ChatRoom'

type Params = { requestId: string }

export default function ConsumerChatPage({ params }: { params: Promise<Params> }) {
  const { requestId } = React.use(params)
  const sb = supabaseClient()
  const [allowed, setAllowed] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await sb
        .from('market_requests')
        .select('status, user_id')
        .eq('id', requestId)
        .single()
      if (cancelled) return
      if (error || !data) return setAllowed(false)

      const { data: me } = await sb.auth.getUser()
      const isOwner = me.user?.id === data.user_id
      const s = String(data.status || '').toLowerCase()
      const ok = s !== 'anfrage' && s !== 'gelöscht' && s !== 'geloescht'
      setAllowed(isOwner && ok)
    })()
    return () => { cancelled = true }
  }, [requestId, sb])

  if (allowed === null) return <div className="p-6 text-sm opacity-60">Lade…</div>
  if (!allowed) return <div className="p-6 text-sm">Kein Chat verfügbar.</div>

  return (
    <div className="p-4 space-y-3">
      <ChatHeader requestId={requestId} roleHint="konsument" />
      <ChatRoom requestId={requestId} />
    </div>
  )
}

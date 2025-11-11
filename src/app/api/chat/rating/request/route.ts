// src/app/api/chat/rating/request/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { request_id } = await req.json().catch(() => ({}))
    if (!request_id) {
      return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
    }

    const supabase = await supabaseServer()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }

    // Conversation + Partner-Owner holen
    const { data: conv, error: convErr } = await supabase
      .from('market_conversations')
      .select(`
        id,
        request_id,
        consumer_user_id,
        partner_id,
        partner:partners!inner (
          id,
          owner_user_id
        )
      `)
      .eq('request_id', request_id)
      .single()

    if (convErr || !conv) {
      return NextResponse.json({ ok: false, error: 'conversation_not_found' }, { status: 404 })
    }

    const partnerOwnerId = (conv as any).partner?.owner_user_id as string | undefined
    if (!partnerOwnerId) {
      return NextResponse.json({ ok: false, error: 'partner_missing' }, { status: 400 })
    }

    // Nur Partner-Owner dieser Konversation darf Bewertung anfragen
    if (partnerOwnerId !== user.id) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    }

    // Marker-Nachricht (wird im ChatRoom als Rating-Card gerendert)
    const body_text = `RATING:REQUEST:${request_id}`

    const { error: msgErr } = await supabase.from('market_messages').insert({
      conversation_id: conv.id,
      sender_user_id: user.id,
      body_text,
    })

    if (msgErr) {
      return NextResponse.json({ ok: false, error: msgErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'server_error' },
      { status: 500 },
    )
  }
}

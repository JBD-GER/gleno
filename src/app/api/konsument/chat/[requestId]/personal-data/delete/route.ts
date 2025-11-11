// src/app/api/konsument/chat/[requestId]/personal-data/delete/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ requestId: string }> }   // <-- params ist ein Promise
) {
  try {
    const { requestId } = await ctx.params            // <-- erst await, dann nutzen
    const sb = await supabaseServer()

    const { data: { session }, error: authErr } = await sb.auth.getSession()
    if (authErr || !session) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    // Ownership prüfen (Konsument ist Owner der market_request)
    const { data: reqRow, error: rErr } = await sb
      .from('market_requests')
      .select('id, user_id')
      .eq('id', requestId)
      .single()

    if (rErr || !reqRow) {
      return NextResponse.json({ error: 'request_not_found' }, { status: 404 })
    }
    if (reqRow.user_id !== session.user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // DELETE inkl. user_id (passt zu RLS using (user_id = auth.uid()))
    // select('id') damit wir wissen, ob etwas gelöscht wurde (und Realtime zuverlässig feuert)
    const { data: delRows, error: dErr } = await sb
      .from('market_request_personal_data')
      .delete()
      .eq('request_id', requestId)
      .eq('user_id', session.user.id)
      .select('id')

    if (dErr) {
      return NextResponse.json({ error: dErr.message }, { status: 500 })
    }

    // Chat-Info posten (Realtime)
    const { data: conv } = await sb
      .from('market_conversations')
      .select('id')
      .eq('request_id', requestId)
      .single()

    if (conv?.id) {
      await sb.from('market_messages').insert({
        conversation_id: conv.id,
        sender_user_id: session.user.id,
        body_text: 'Personen- und Adressdaten wurden gelöscht.',
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}

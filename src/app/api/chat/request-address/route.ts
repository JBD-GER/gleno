import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { request_id } = await req.json().catch(() => ({}))
    if (!request_id) return NextResponse.json({ error: 'bad_request' }, { status: 400 })

    const sb = await supabaseServer()
    const { data: { session }, error: authErr } = await sb.auth.getSession()
    if (authErr || !session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { data: conv, error: cErr } = await sb
      .from('market_conversations')
      .select('id')
      .eq('request_id', request_id)
      .single()
    if (cErr || !conv) return NextResponse.json({ error: 'conversation_not_found' }, { status: 404 })

    const body_text =
`Anschrift benötigt: Für die weitere Zusammenarbeit werden Rechnungsadresse und ggf. der Ausführungsort benötigt.`

    const { error: mErr } = await sb.from('market_messages').insert({
      conversation_id: conv.id,
      sender_user_id: session.user.id,
      body_text,
    })
    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}

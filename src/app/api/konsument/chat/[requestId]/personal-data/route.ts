import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await ctx.params
    const payload = await req.json().catch(() => ({}))

    const sb = await supabaseServer()
    const { data: { session }, error: authErr } = await sb.auth.getSession()
    if (authErr || !session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    // Ownership prüfen
    const { data: reqRow, error: rErr } = await sb
      .from('market_requests')
      .select('id, user_id')
      .eq('id', requestId)
      .single()
    if (rErr || !reqRow) return NextResponse.json({ error: 'request_not_found' }, { status: 404 })
    if (reqRow.user_id !== session.user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    // Upsert in market_request_personal_data
    const record = {
      request_id: requestId,
      user_id: session.user.id,

      bill_first_name: payload.bill_first_name ?? null,
      bill_last_name: payload.bill_last_name ?? null,
      bill_company: payload.bill_company ?? null,
      bill_street: payload.bill_street ?? null,
      bill_house_number: payload.bill_house_number ?? null,
      bill_postal_code: payload.bill_postal_code ?? null,
      bill_city: payload.bill_city ?? null,
      bill_phone: payload.bill_phone ?? null,
      bill_email: payload.bill_email ?? null,

      exec_same_as_billing: !!payload.exec_same_as_billing,
      exec_street: payload.exec_same_as_billing ? payload.bill_street ?? null : payload.exec_street ?? null,
      exec_house_number: payload.exec_same_as_billing ? payload.bill_house_number ?? null : payload.exec_house_number ?? null,
      exec_postal_code: payload.exec_same_as_billing ? payload.bill_postal_code ?? null : payload.exec_postal_code ?? null,
      exec_city: payload.exec_same_as_billing ? payload.bill_city ?? null : payload.exec_city ?? null,

      updated_at: new Date().toISOString(),
    }

    const { data: exists } = await sb
      .from('market_request_personal_data')
      .select('id')
      .eq('request_id', requestId)
      .maybeSingle()

    if (exists?.id) {
      const { error: uErr } = await sb.from('market_request_personal_data').update(record).eq('id', exists.id)
      if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })
    } else {
      const { error: iErr } = await sb.from('market_request_personal_data').insert(record)
      if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 })
    }

    // Conversation finden → kurze Chat-Info posten
    const { data: conv } = await sb
      .from('market_conversations')
      .select('id')
      .eq('request_id', requestId)
      .single()
    if (conv?.id) {
      await sb.from('market_messages').insert({
        conversation_id: conv.id,
        sender_user_id: session.user.id,
        body_text: 'Personen- und Adressdaten wurden bereitgestellt.',
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}

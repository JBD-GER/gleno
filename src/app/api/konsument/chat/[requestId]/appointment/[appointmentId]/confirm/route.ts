import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ requestId: string; appointmentId: string }> }
) {
  try {
    const { requestId, appointmentId } = await ctx.params
    const sb = await supabaseServer()
    const { data: { session }, error: authErr } = await sb.auth.getSession()
    if (authErr || !session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    // Nur Konsument dieser Request darf bestätigen
    const { data: conv, error: cErr } = await sb
      .from('market_conversations')
      .select('id, consumer_user_id')
      .eq('request_id', requestId)
      .single()
    if (cErr || !conv) return NextResponse.json({ error: 'conversation_not_found' }, { status: 404 })
    if ((conv as any).consumer_user_id !== session.user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    // Update appointment → confirmed
    const { error: u1 } = await sb
      .from('market_appointments')
      .update({ status: 'confirmed' })
      .eq('id', appointmentId)
      .eq('request_id', requestId)
    if (u1) return NextResponse.json({ error: u1.message }, { status: 500 })

    // Request auf Termin bestätigt + extras
    const { error: u2 } = await sb
      .from('market_requests')
      .update({ status: 'Termin bestätigt' as any, extras: { appointment_id: appointmentId, appointment_confirmed: true } })
      .eq('id', requestId)
    if (u2) return NextResponse.json({ error: u2.message }, { status: 500 })

    // Chat-Marker
    await sb.from('market_messages').insert({
      conversation_id: (conv as any).id,
      sender_user_id: session.user.id,
      body_text: `APPT:CONFIRMED:${appointmentId}`,
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}

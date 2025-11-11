// z.B. src/app/api/konsument/chat/[requestId]/appointment/[appointmentId]/decline/route.ts
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

    const {
      data: { session },
      error: authErr,
    } = await sb.auth.getSession()
    if (authErr || !session) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    // Rolle laden (für Admin-Erkennung)
    const { data: profile } = await sb
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle()

    const role = String(profile?.role || '').toLowerCase()

    // Conversation + Partner-Owner holen
    const { data: conv, error: cErr } = await sb
      .from('market_conversations')
      .select(
        `
        id,
        consumer_user_id,
        partner:partners(
          id,
          owner_user_id
        )
      `,
      )
      .eq('request_id', requestId)
      .maybeSingle()

    if (cErr || !conv) {
      return NextResponse.json(
        { error: 'conversation_not_found' },
        { status: 404 },
      )
    }

    const consumerId = (conv as any).consumer_user_id as string | null
    const partnerOwnerId = (conv as any).partner?.owner_user_id as
      | string
      | null

    const isConsumer = consumerId === session.user.id
    const isPartnerOwner = partnerOwnerId === session.user.id
    const isAdmin = role === 'admin'

    if (!isConsumer && !isPartnerOwner && !isAdmin) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // Termin auf declined setzen
    const { error: u1 } = await sb
      .from('market_appointments')
      .update({ status: 'declined' })
      .eq('id', appointmentId)
      .eq('request_id', requestId)

    if (u1) {
      return NextResponse.json({ error: u1.message }, { status: 500 })
    }

    // Request wieder auf Aktiv
    const { error: u2 } = await sb
      .from('market_requests')
      .update({
        status: 'Aktiv' as any,
        extras: {
          appointment_id: appointmentId,
          appointment_confirmed: false,
        },
      })
      .eq('id', requestId)

    if (u2) {
      return NextResponse.json({ error: u2.message }, { status: 500 })
    }

    // Chat-Marker
    await sb.from('market_messages').insert({
      conversation_id: (conv as any).id,
      sender_user_id: session.user.id,
      body_text: `APPT:DECLINED:${appointmentId}`,
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'server_error' },
      { status: 500 },
    )
  }
}

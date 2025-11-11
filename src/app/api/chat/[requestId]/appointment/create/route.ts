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

    // Prüfen: gehört die Conversation zu einem Partner dieses Users?
    const { data: conv, error: cErr } = await sb
      .from('market_conversations')
      .select('id, partner:partners!inner(id, owner_user_id), consumer_user_id')
      .eq('request_id', requestId)
      .single()

    if (cErr || !conv) return NextResponse.json({ error: 'conversation_not_found' }, { status: 404 })
    const ownerId = (conv as any).partner?.owner_user_id
    const isPartnerOwner = ownerId && ownerId === session.user.id

    // Admin?
    const { data: prof } = await sb.from('profiles').select('role').eq('id', session.user.id).single()
    const isAdmin = !!prof?.role && String(prof.role).toLowerCase() === 'admin'

    if (!isPartnerOwner && !isAdmin) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // Insert appointment
    const insertRow = {
      request_id: requestId,
      created_by_user_id: session.user.id,
      kind: payload.kind || 'vor_ort',
      start_at: payload.start_at,
      duration_min: payload.duration_min ?? 60,
      title: payload.title ?? null,
      note: payload.note ?? null,
      location: payload.location ?? null,
      video_url: payload.video_url ?? null,
      phone_customer: payload.phone_customer ?? null,
      phone_partner: payload.phone_partner ?? null,
      status: 'proposed',
    }

    const { data: appt, error: aErr } = await sb
      .from('market_appointments')
      .insert(insertRow)
      .select('id')
      .single()

    if (aErr || !appt) return NextResponse.json({ error: aErr?.message || 'insert_failed' }, { status: 500 })

    // Status der Anfrage: Termin angelegt
    // + extras.appointment_id + appointment_confirmed=false
    const { error: uErr } = await sb
      .from('market_requests')
      .update({
        status: 'Termin angelegt' as any,
        extras: {
          ...(payload.extras || {}),
          appointment_id: appt.id,
          appointment_confirmed: false,
        }
      })
      .eq('id', requestId)
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

    // Chat-Marker posten → UI zeigt Karte + Review-Modal mit Buttons für Konsument:in
    await sb.from('market_messages').insert({
      conversation_id: (conv as any).id,
      sender_user_id: session.user.id,
      body_text: `APPT:PROPOSED:${appt.id}`,
    })

    return NextResponse.json({ ok: true, appointment_id: appt.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}

import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ offerId: string }> }
) {
  try {
    const { offerId } = await ctx.params
    const supabase = await supabaseServer()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 })

    // 1) Angebot holen
    const { data: offer, error: offErr } = await supabase
      .from('market_offers')
      .select('id, request_id, status')
      .eq('id', offerId)
      .single()
    if (offErr || !offer) return NextResponse.json({ ok:false, error:'offer_not_found' }, { status:404 })

    // 2) Conversation/Konsument prüfen
    const { data: conv, error: convErr } = await supabase
      .from('market_conversations')
      .select('id, consumer_user_id')
      .eq('request_id', offer.request_id)
      .maybeSingle()
    if (convErr || !conv) return NextResponse.json({ ok:false, error:'conversation_not_found' }, { status:404 })
    if (conv.consumer_user_id !== user.id) {
      return NextResponse.json({ ok:false, error:'forbidden' }, { status:403 })
    }

    // 3) Idempotenz
    if (offer.status === 'accepted') {
      // Best-effort: Request-Status korrigieren, falls nötig
      await tryUpdateRequestStatus(supabase, offer.request_id, [
        'Angebot angenommen', 'angebot angenommen', 'angebot_angenommen'
      ])
      return NextResponse.json({ ok:true, status:'accepted' })
    }
    if (offer.status === 'declined') {
      return NextResponse.json({ ok:false, error:'already_declined' }, { status:409 })
    }

    // 4) Angebot -> accepted
    {
      const { error } = await supabase
        .from('market_offers')
        .update({ status: 'accepted' })
        .eq('id', offer.id)
      if (error) return NextResponse.json({ ok:false, error: error.message || 'update_failed' }, { status:500 })
    }

    // 5) Request-Status -> (mit Fallbacks, bis einer klappt)
    const okReq = await tryUpdateRequestStatus(supabase, offer.request_id, [
      'Angebot angenommen',           // bevorzugt
      'angebot angenommen',           // andere Schreibweise in Enum?
      'angebot_angenommen'            // underscore-Variante
    ])
    if (!okReq) {
      // Notfalls: nichts hart abbrechen – Angebot bleibt accepted
      console.warn('[offer:accept] No matching enum value worked for market_requests.status')
    }

    // 6) Systemnachricht
    await supabase.from('market_messages').insert({
      conversation_id: conv.id,
      sender_user_id: user.id,
      body_text: `OFFER:ACCEPTED:${offer.id}`,
    })

    return NextResponse.json({ ok:true, status:'accepted' })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'internal_error' }, { status:500 })
  }
}

/** Versucht nacheinander mehrere Statuswerte, liefert true bei erstem Erfolg. */
async function tryUpdateRequestStatus(
  supabase: ReturnType<typeof supabaseServer> extends Promise<infer T> ? T : any,
  requestId: string,
  candidates: string[]
): Promise<boolean> {
  for (const value of candidates) {
    const { error } = await supabase
      .from('market_requests')
      .update({ status: value })
      .eq('id', requestId)
    if (!error) return true
    // Nur bei Enum-Fehler weiterversuchen; andere Errors ebenfalls weiterprobieren (RLS etc. könnte je nach Policy unterschiedlich feuern)
  }
  return false
}

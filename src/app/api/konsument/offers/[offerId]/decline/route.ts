// src/app/api/konsument/offers/[offerId]/decline/route.ts
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

    // Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 })

    // Angebot laden
    const { data: offer, error: offErr } = await supabase
      .from('market_offers')
      .select('id, request_id, status')
      .eq('id', offerId)
      .single()
    if (offErr || !offer) {
      return NextResponse.json({ ok:false, error:'offer_not_found' }, { status:404 })
    }

    // Conversation/Konsument prüfen
    const { data: conv, error: convErr } = await supabase
      .from('market_conversations')
      .select('id, consumer_user_id')
      .eq('request_id', offer.request_id)
      .maybeSingle()
    if (convErr || !conv) {
      return NextResponse.json({ ok:false, error:'conversation_not_found' }, { status:404 })
    }
    if (conv.consumer_user_id !== user.id) {
      return NextResponse.json({ ok:false, error:'forbidden' }, { status:403 })
    }

    // Idempotenz: schon abgelehnt → ok zurückgeben
    if (offer.status === 'declined') {
      await tryUpdateRequestStatus(supabase, offer.request_id, [
        'Angebot abgelehnt', 'angebot abgelehnt', 'angebot_abgelehnt'
      ])
      return NextResponse.json({ ok:true, status:'declined' })
    }

    // WICHTIG: accepted → declined erlauben (Storno)
    // Erlaubte Transitionen: created → declined, accepted → declined
    const { error: upOfferErr } = await supabase
      .from('market_offers')
      .update({ status: 'declined' })
      .eq('id', offer.id)
    if (upOfferErr) {
      return NextResponse.json({ ok:false, error: upOfferErr.message || 'update_failed' }, { status:500 })
    }

    // Request-Status anpassen (mit Fallbacks)
    await tryUpdateRequestStatus(supabase, offer.request_id, [
      'Angebot abgelehnt',
      'angebot abgelehnt',
      'angebot_abgelehnt'
    ])

    // Chat-Systemnachricht
    await supabase.from('market_messages').insert({
      conversation_id: conv.id,
      sender_user_id: user.id,
      body_text: `OFFER:DECLINED:${offer.id}`,
    })

    return NextResponse.json({ ok:true, status:'declined' })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'internal_error' }, { status:500 })
  }
}

/** Probiert Statuswerte der Reihe nach; gibt true zurück, sobald ein Update gelingt. */
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
  }
  return false
}

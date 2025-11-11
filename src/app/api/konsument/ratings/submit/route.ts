// src/app/api/chat/rating/submit/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { request_id, stars, text, name } = await req.json().catch(() => ({}))

    if (!request_id) {
      return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
    }

    const s = Number(stars)
    if (!Number.isFinite(s) || s < 0 || s > 10) {
      return NextResponse.json({ ok: false, error: 'invalid_stars' }, { status: 400 })
    }

    const supabase = await supabaseServer()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }

    // Conversation holen (RLS: nur Teilnehmer)
    const { data: conv, error: convErr } = await supabase
      .from('market_conversations')
      .select('id, request_id, consumer_user_id, partner_id')
      .eq('request_id', request_id)
      .single()

    if (convErr || !conv) {
      return NextResponse.json({ ok: false, error: 'conversation_not_found' }, { status: 404 })
    }

    // Nur der Konsument dieser Anfrage darf bewerten
    if (conv.consumer_user_id !== user.id) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    }

    // Doppelbewertung verhindern (1 Bewertung pro Request/Konsument)
    const { data: existing } = await supabase
      .from('market_partner_ratings')
      .select('id')
      .eq('request_id', request_id)
      .eq('consumer_user_id', user.id)
      .maybeSingle()

    if (existing?.id) {
      return NextResponse.json({ ok: false, error: 'already_rated' }, { status: 400 })
    }

    const cleanText = (text ?? '').toString().trim() || null
    const cleanName = (name ?? '').toString().trim() || null

    // Rating speichern
    const { error: insErr } = await supabase.from('market_partner_ratings').insert({
      partner_id: conv.partner_id,
      request_id,
      consumer_user_id: user.id,
      stars: s,
      text: cleanText,
      name: cleanName,
      created_by: user.id,
    })

    if (insErr) {
      return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 })
    }

    // Aggregat beim Partner neu berechnen
    const { error: aggErr } = await supabase.rpc('recalculate_partner_rating', {
      p_partner_id: conv.partner_id,
    })

    if (aggErr) {
      // Wichtig: kein Hard-Fail für den User, nur loggen
      console.error('recalculate_partner_rating error', aggErr)
    }

    // Marker in den Chat schreiben (Partner sieht: "Neue Bewertung erhalten")
    const marker = `RATING:SUBMITTED:${request_id}`
    const { error: msgErr } = await supabase.from('market_messages').insert({
      conversation_id: conv.id,
      sender_user_id: user.id,
      body_text: marker,
    })
    if (msgErr) {
      console.error('rating marker message error', msgErr)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'server_error' },
      { status: 500 }
    )
  }
}

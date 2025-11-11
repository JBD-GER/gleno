// src/app/api/partners/applications/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer()
    const { data: { user }, error: aerr } = await supabase.auth.getUser()
    if (aerr) {
      return NextResponse.json({ ok: false, error: aerr.message }, { status: 401 })
    }
    if (!user) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      request_id,
      partner_id,
      message_text,
      message_html: bodyHtml,
    }: {
      request_id: string
      partner_id: string
      message_text?: string
      message_html?: string
    } = body || {}

    if (!request_id || !partner_id) {
      return NextResponse.json({ ok: false, error: 'missing_params' }, { status: 400 })
    }

    // 1) Ownership: gehört der Partner dem eingeloggten User?
    const { data: partner, error: pErr } = await supabase
      .from('partners')
      .select('id, owner_user_id')
      .eq('id', partner_id)
      .single()
    if (pErr || !partner) {
      return NextResponse.json({ ok: false, error: 'partner_not_found' }, { status: 404 })
    }
    if (partner.owner_user_id !== user.id) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    }

    // 2) Anfrage muss existieren
    const { data: reqRow, error: rErr } = await supabase
      .from('market_requests')
      .select('id')
      .eq('id', request_id)
      .single()
    if (rErr || !reqRow) {
      return NextResponse.json({ ok: false, error: 'request_not_found' }, { status: 404 })
    }

    // 3) Duplikat-Prüfung: ein Partner darf sich nur 1x auf dieselbe Anfrage bewerben
    const { data: dupe, error: dErr } = await supabase
      .from('market_applications')
      .select('id')
      .eq('request_id', request_id)
      .eq('partner_id', partner_id)
      .limit(1)
      .maybeSingle()
    if (dErr) {
      return NextResponse.json({ ok: false, error: dErr.message }, { status: 400 })
    }
    if (dupe?.id) {
      return NextResponse.json({ ok: false, error: 'duplicate_application' }, { status: 409 })
    }

    // 4) Message HTML bauen, falls nur Text kommt
    const toHtml = (txt?: string) =>
      (txt || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\r\n|\r|\n/g, '<br/>')

    const message_html = bodyHtml ?? (message_text ? toHtml(message_text) : null)

    // 5) Bewerbung anlegen
    const { data: ins, error: iErr } = await supabase
      .from('market_applications')
      .insert({
        request_id,
        partner_id,
        status: 'eingereicht', // das ist dein DE-Status
        message_text: message_text || null,
        message_html,
        extras: {},
      })
      .select('id')
      .single()

    if (iErr) {
      return NextResponse.json({ ok: false, error: iErr.message }, { status: 400 })
    }

    // 6) WICHTIG: KEIN rpc('market_increment_app_count') MEHR HIER!
    // Wir verlassen uns darauf, dass:
    // - entweder ein DB-Trigger das macht
    // - oder du den Count beim Lesen berechnest
    // -> so vermeiden wir das doppelte +1

    return NextResponse.json({ ok: true, id: ins!.id })
  } catch (e: any) {
    console.error('[applications POST] fatal:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'apply_failed' }, { status: 500 })
  }
}

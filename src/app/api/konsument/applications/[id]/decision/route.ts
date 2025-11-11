// src/app/api/konsument/applications/[id]/decision/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await ctx.params

    const supabase = await supabaseServer()
    const { data: { session }, error: authErr } = await supabase.auth.getSession()
    if (authErr || !session) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    // Body lesen (Form oder JSON)
    const ct = req.headers.get('content-type') || ''
    let action: 'accept' | 'decline' | '' = '' as any
    let requestId = ''

    if (ct.includes('application/json')) {
      const j = await req.json().catch(() => ({}))
      action = j?.action
      requestId = j?.request_id
    } else {
      const fd = await req.formData()
      action = String(fd.get('action') || '').toLowerCase() as 'accept' | 'decline' | ''
      requestId = String(fd.get('request_id') || '')
    }

    if (!applicationId || !action || !requestId) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 })
    }

    // Bewerbung holen
    const { data: appRow, error: appErr } = await supabase
      .from('market_applications')
      .select('id, status, request_id')
      .eq('id', applicationId)
      .single()

    if (appErr || !appRow) {
      return NextResponse.json({ error: 'application_not_found' }, { status: 404 })
    }
    if (appRow.request_id !== requestId) {
      return NextResponse.json({ error: 'application_mismatch' }, { status: 400 })
    }

    // Anfrage holen + Besitz prüfen
    const { data: reqRow, error: reqErr } = await supabase
      .from('market_requests')
      .select('id, user_id, status')
      .eq('id', requestId)
      .single()

    if (reqErr || !reqRow) {
      return NextResponse.json({ error: 'request_not_found' }, { status: 404 })
    }
    if (reqRow.user_id !== session.user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const currentReqStatus = (reqRow.status || '').toLowerCase()

    if (action === 'accept') {
      // Wenn die Anfrage bereits "Aktiv" ODER bereits "Auftrag erstellt" ist → nix mehr annehmen
      if (currentReqStatus === 'aktiv' || currentReqStatus === 'auftrag erstellt' || currentReqStatus === 'auftrag_erstellt') {
        return NextResponse.json({ error: 'already_accepted' }, { status: 409 })
      }

      // 1. Diese Bewerbung annehmen
      {
        const { error } = await supabase
          .from('market_applications')
          .update({ status: 'angenommen' })
          .eq('id', applicationId)
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }

      // 2. Alle anderen Bewerbungen zu dieser Anfrage automatisch ablehnen
      {
        const { error } = await supabase
          .from('market_applications')
          .update({ status: 'abgelehnt' })
          .eq('request_id', requestId)
          .neq('id', applicationId)
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }

      // 3. Anfrage auf "Aktiv" setzen (das ist der neue Status, wenn Konsument gewählt hat)
      {
        const { error } = await supabase
          .from('market_requests')
          .update({ status: 'Aktiv' })
          .eq('id', requestId)
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }

      // src/app/api/konsument/applications/[id]/decision/route.ts
// ... innerhalb if (action === 'accept') {...} NACH Schritt 3 einfügen:

// 4. Conversation anlegen (falls nicht vorhanden) und zur Chat-URL umleiten
{
  // Partner-ID der angenommenen Bewerbung holen
  const { data: app2, error: app2Err } = await supabase
    .from('market_applications')
    .select('partner_id')
    .eq('id', applicationId)
    .single()
  if (app2Err || !app2?.partner_id) {
    return NextResponse.json({ error: 'partner_not_found' }, { status: 500 })
  }

  // Conversation holen/erstellen
  const { data: existing } = await supabase
    .from('market_conversations')
    .select('id')
    .eq('request_id', requestId)
    .maybeSingle()

  let conversationId = existing?.id
  if (!conversationId) {
    const { data: created, error: insErr } = await supabase
      .from('market_conversations')
      .insert({
        request_id: requestId,
        application_id: applicationId,
        consumer_user_id: reqRow.user_id,
        partner_id: app2.partner_id,
      })
      .select('id')
      .single()
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }
    conversationId = created.id
  }

  // Direkt in den Konsumenten-Chat springen:
  const chatUrl = new URL(`/konsument/chat/${requestId}`, req.url)
  return NextResponse.redirect(chatUrl, { status: 303 })
}

    } else if (action === 'decline') {
      // Nur diese Bewerbung ablehnen, Anfrage bleibt wie sie ist
      const { error } = await supabase
        .from('market_applications')
        .update({ status: 'abgelehnt' })
        .eq('id', applicationId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: 'unsupported_action' }, { status: 400 })
    }


    // zurück zur Detailansicht
    const back = new URL(`/konsument/anfragen/${requestId}/bewerbungen/${applicationId}`, req.url)
    return NextResponse.redirect(back, { status: 303 })
  } catch (e: any) {
    console.error('[applications decision] error:', e)
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}

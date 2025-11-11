import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

function sanitizeFilename(name: string): string {
  const baseRaw = String(name || 'file').split(/[\\/]/).pop() || 'file'
  const noDiacritics = baseRaw.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  const safe = noDiacritics.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase()
  return (safe || 'file').slice(0, 160)
}
function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c] as string))
}
function glassCardHtml(inner: string, ring = '#fef3c7', bg = '#fffbeb') {
  return `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,'Helvetica Neue',Arial;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
    <div style="border:1px solid ${ring};background:${bg};border-radius:16px;padding:14px 16px;box-shadow:0 10px 34px rgba(2,6,23,0.07);backdrop-filter:saturate(1.2) blur(6px);">
      ${inner}
    </div>
  </div>`.trim()
}

async function tryUpdateRequestStatus(supabase: any, requestId: string, candidates: string[]): Promise<boolean> {
  for (const value of candidates) {
    const { error } = await supabase.from('market_requests').update({ status: value }).eq('id', requestId)
    if (!error) return true
  }
  return false
}

async function ensureConversation(supabase: any, requestId: string, fallbackUserId: string) {
  const { data: existing } = await supabase
    .from('market_conversations')
    .select('id')
    .eq('request_id', requestId)
    .maybeSingle()
  if (existing?.id) return existing.id

  let consumer_user_id: string | null = null
  try {
    const { data: reqRow } = await supabase
      .from('market_requests')
      .select('consumer_user_id')
      .eq('id', requestId)
      .maybeSingle()
    consumer_user_id = reqRow?.consumer_user_id ?? null
  } catch {}

  const { data, error } = await supabase
    .from('market_conversations')
    .insert({
      request_id: requestId,
      consumer_user_id: consumer_user_id ?? fallbackUserId,
      last_message_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message || 'conversation_create_failed')
  return data.id
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 })

    const fd = await req.formData()
    const request_id     = String(fd.get('request_id') || '')
    const title          = String(fd.get('title') || '')
    const net_total      = Number(fd.get('net_total') || 0)
    const tax_rate       = Number(fd.get('tax_rate') || 0)
    const discount_type  = String(fd.get('discount_type') || 'percent') as 'percent'|'fixed'
    const discount_value = Number(fd.get('discount_value') || 0)
    const discount_label = String(fd.get('discount_label') || '')
    const files          = fd.getAll('files[]') as File[]

    if (!request_id || !title || files.length === 0) {
      return NextResponse.json({ ok:false, error:'missing_fields' }, { status:400 })
    }

    const gross_base = discount_type === 'percent'
      ? Math.max(0, net_total * (1 - discount_value / 100))
      : Math.max(0, net_total - discount_value)
    const gross_total_num = Math.round((gross_base + gross_base * (tax_rate / 100)) * 100) / 100
    const gross_total_label = `${gross_total_num.toFixed(2)} €`
    const signature_id = `offer_${crypto.randomUUID()}`

    const { data: offer, error: insErr } = await supabase
      .from('market_offers')
      .insert({
        request_id,
        created_by_user_id: user.id,
        title,
        net_total,
        tax_rate,
        discount_type,
        discount_value,
        discount_label,
        gross_total: gross_total_num,
        status: 'created',
        signature_id,
      })
      .select('id')
      .single()
    if (insErr || !offer) {
      return NextResponse.json({ ok:false, error: insErr?.message || 'offer_insert_failed' }, { status:500 })
    }

    const convId = await ensureConversation(supabase, request_id, user.id)

    // Dateien hochladen + verknüpfen
    for (const f of files) {
      const originalName = (f.name || 'datei').trim()
      const sanitized = sanitizeFilename(originalName)
      const safeName = `${crypto.randomUUID()}-${sanitized}`
      const path = `chat/angebot/${request_id}/${safeName}`
      const contentType = (f as any).type || 'application/octet-stream'
      const bytes = new Uint8Array(await f.arrayBuffer())

      const { error: upErr } = await supabase.storage.from('markt').upload(path, bytes, {
        upsert: false, cacheControl: '3600', contentType,
      })
      if (upErr) return NextResponse.json({ ok:false, error: upErr.message || 'upload_failed', key: path }, { status:500 })

      const { error: linkErr1 } = await supabase
        .from('market_offer_files')
        .insert({ offer_id: offer.id, name: originalName || null, path, size: bytes.byteLength, content_type: contentType })
      if (linkErr1) {
        await supabase.storage.from('markt').remove([path])
        return NextResponse.json({ ok:false, error: linkErr1.message || 'file_link_failed' }, { status:500 })
      }

      const { error: linkErr2 } = await supabase.from('market_documents').insert({
        conversation_id: convId,
        uploaded_by_user_id: user.id,
        path,
        name: originalName || null,
        size: bytes.byteLength,
        content_type: contentType,
        request_id,
        category: 'angebot',
      })
      if (linkErr2) {
        await supabase.storage.from('markt').remove([path])
        await supabase.from('market_offer_files').delete().eq('offer_id', offer.id).eq('path', path)
        return NextResponse.json({ ok:false, error: linkErr2.message || 'doc_link_failed' }, { status:500 })
      }
    }

    // *** GENAU EINE Systemnachricht ***
    // body_text ist NUR der Marker + UUID (keine weiteren Doppelpunkte!)
    await supabase.from('market_messages').insert({
      conversation_id: convId,
      sender_user_id: user.id,
      body_text: `OFFER:CREATED:${offer.id}`,
      body_html: glassCardHtml(`
        <div style="display:flex;align-items:center;gap:8px;justify-content:space-between">
          <span style="display:inline-block;font-size:11px;font-weight:600;letter-spacing:.2px;padding:4px 8px;border-radius:999px;background:#f59e0b;color:#fff;">Angebot erstellt</span>
        </div>
        <div style="font-size:13px;line-height:1.35;color:#334155;margin-top:6px">${escapeHtml(title)}</div>
        <div style="font-size:12px;color:#64748b;margin-top:6px"><span style="color:#475569">Brutto</span> ${escapeHtml(gross_total_label)}</div>
      `),
    })

    // KEINE zweite CTA-Message mehr

    await tryUpdateRequestStatus(supabase, request_id, [
      'Angebot erstellt',
      'angebot erstellt',
      'angebot_erstellt',
      'aktiv'
    ])

    return NextResponse.json({ ok:true, offer_id: offer.id, signature_id })
  } catch (e:any) {
    console.error(e)
    return NextResponse.json({ ok:false, error: e?.message || 'internal_error' }, { status:500 })
  }
}

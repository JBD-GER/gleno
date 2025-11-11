// src/app/api/partners/orders/create/route.ts
import { NextResponse, type NextRequest } from 'next/server'
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
function glassCardHtml(inner: string, ring = '#fde68a', bg = '#fff7ed') {
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

export async function POST(req: NextRequest) {
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
    const offer_id_raw   = fd.get('offer_id')
    const offer_id       = offer_id_raw ? String(offer_id_raw) : null

    if (!request_id || !title || files.length === 0) {
      return NextResponse.json({ ok:false, error:'missing_fields' }, { status:400 })
    }

    // Ownership (Partner der Konversation oder Admin)
    const { data: convRow, error: convErr } = await supabase
      .from('market_conversations')
      .select(`id, partner:partners!inner ( owner_user_id )`)
      .eq('request_id', request_id)
      .maybeSingle()
    if (convErr || !convRow) return NextResponse.json({ ok:false, error:'conversation_not_found' }, { status:404 })

    let isAdmin = false
    {
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (prof?.role && String(prof.role).toLowerCase() === 'admin') isAdmin = true
    }
    const owner_user_id = (convRow as any)?.partner?.owner_user_id as string | null
    if (!isAdmin && owner_user_id !== user.id) {
      return NextResponse.json({ ok:false, error:'forbidden' }, { status:403 })
    }

    // Idempotenz: aktiver Auftrag?
    {
      const { data: prev } = await supabase
        .from('market_orders')
        .select('id,status')
        .eq('request_id', request_id)
        .in('status', ['created','accepted','completed'])
        .order('created_at', { ascending: false })
        .limit(1)
      if (prev && prev[0]) {
        return NextResponse.json({ ok:true, status:'order_exists', order_id: String(prev[0].id) })
      }
    }

    // Brutto
    const base = discount_type === 'percent'
      ? Math.max(0, net_total * (1 - discount_value / 100))
      : Math.max(0, net_total - discount_value)
    const gross_total_num = Math.round((base + base * (tax_rate / 100)) * 100) / 100
    const gross_total_label = `${gross_total_num.toFixed(2)} €`

    // Optional: accepted Offer prüfen/finden
    let linkedOfferId: string | null = null
    if (offer_id) {
      const { data: off, error: offErr } = await supabase
        .from('market_offers')
        .select('id,status,request_id')
        .eq('id', offer_id)
        .eq('request_id', request_id)
        .maybeSingle()
      if (offErr || !off) return NextResponse.json({ ok:false, error:'offer_not_found' }, { status:404 })
      if (off.status !== 'accepted') return NextResponse.json({ ok:false, error:'offer_not_accepted' }, { status:409 })
      linkedOfferId = String(off.id)
    } else {
      const { data: offs } = await supabase
        .from('market_offers')
        .select('id,status,created_at')
        .eq('request_id', request_id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(1)
      if (offs && offs[0]) linkedOfferId = String(offs[0].id)
    }

    // Auftrag anlegen
    const { data: order, error: insErr } = await supabase
      .from('market_orders')
      .insert({
        request_id,
        offer_id: linkedOfferId,
        title,
        net_total,
        tax_rate,
        discount_type,
        discount_value,
        discount_label,
        gross_total: gross_total_num,
        status: 'created',
      })
      .select('id')
      .single()
    if (insErr || !order) {
      return NextResponse.json({ ok:false, error: insErr?.message || 'order_insert_failed' }, { status:500 })
    }
    const orderId = String(order.id)

    // Conversation (falls nicht vorhanden)
    const convId = await ensureConversation(supabase, request_id, user.id)

    // Dateien hochladen & verlinken
    for (const f of files) {
      const originalName = (f.name || 'datei').trim()
      const sanitized = sanitizeFilename(originalName)
      const safeName = `${crypto.randomUUID()}-${sanitized}`
      const path = `chat/auftrag/${request_id}/${safeName}`
      const contentType = (f as any).type || 'application/octet-stream'
      const bytes = new Uint8Array(await f.arrayBuffer())

      const { error: upErr } = await supabase.storage.from('markt').upload(path, bytes, {
        upsert: false, cacheControl: '3600', contentType,
      })
      if (upErr) return NextResponse.json({ ok:false, error: upErr.message || 'upload_failed', key: path }, { status:500 })

      const { error: linkErr1 } = await supabase
        .from('market_order_files')
        .insert({ order_id: orderId, name: originalName || null, path, size: bytes.byteLength, content_type: contentType })
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
        category: 'auftrag',
      })
      if (linkErr2) {
        await supabase.storage.from('markt').remove([path])
        await supabase.from('market_order_files').delete().eq('order_id', orderId).eq('path', path)
        return NextResponse.json({ ok:false, error: linkErr2.message || 'doc_link_failed' }, { status:500 })
      }
    }

    // Status auf "Auftrag erstellt"
    await tryUpdateRequestStatus(supabase, request_id, [
      'Auftrag erstellt',
      'auftrag erstellt',
      'auftrag_erstellt',
      'aktiv',
    ])

    // *** GENAU EINE Systemnachricht – exakt wie beim Angebot ***
    await supabase.from('market_messages').insert({
      conversation_id: convId,
      sender_user_id: user.id,
      // WICHTIG: Nur Marker, damit dein Renderer die Order-Karte rendert
      body_text: `ORDER:CREATED:${orderId}`,
      body_html: glassCardHtml(`
        <div style="display:flex;align-items:center;gap:8px;justify-content:space-between">
          <span style="display:inline-block;font-size:11px;font-weight:600;letter-spacing:.2px;padding:4px 8px;border-radius:999px;background:#f59e0b;color:#fff;">Auftrag erstellt</span>
        </div>
        <div style="font-size:13px;line-height:1.35;color:#334155;margin-top:6px">${escapeHtml(title)}</div>
        <div style="font-size:12px;color:#64748b;margin-top:6px"><span style="color:#475569">Brutto</span> ${escapeHtml(gross_total_label)}</div>
      `),
    })

    return NextResponse.json({ ok:true, order_id: orderId })
  } catch (e:any) {
    console.error(e)
    return NextResponse.json({ ok:false, error: e?.message || 'internal_error' }, { status:500 })
  }
}

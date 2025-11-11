import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CATEGORY_TO_PREFIX: Record<string, (rid: string) => string> = {
  allgemein: (rid) => `chat/${rid}`,
  angebot:   (rid) => `chat/angebot/${rid}`,
  auftrag:   (rid) => `chat/auftrag/${rid}`,
  rechnung:  (rid) => `chat/rechnung/${rid}`,
}
function normalizeCategory(raw: string | null): keyof typeof CATEGORY_TO_PREFIX {
  const v = String(raw || '').trim().toLowerCase()
  if (v === 'angebot' || v === 'auftrag' || v === 'rechnung') return v
  return 'allgemein'
}
function sanitizeFilename(name: string): string {
  const base = String(name || 'file')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return base.toLowerCase().slice(0, 160)
}

async function loadConversationIdByRequestId(supabase: any, requestId: string) {
  const { data, error } = await supabase
    .from('market_conversations')
    .select('id')
    .eq('request_id', requestId)
    .maybeSingle()
  if (error) throw new Error(error.message || 'conversation_lookup_failed')
  return data?.id as string | undefined
}

/** Legt bei Bedarf eine Conversation an, damit Doku-Cloud niemals ins Leere zeigt. */
async function ensureConversation(supabase: any, requestId: string, fallbackUserId: string) {
  const existing = await loadConversationIdByRequestId(supabase, requestId)
  if (existing) return existing

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
  return data.id as string
}

/** GET: listet Dokumente */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await ctx.params
    if (!requestId) return NextResponse.json({ error: 'request_id_required' }, { status: 400 })

    const url = new URL(req.url)
    const category = normalizeCategory(url.searchParams.get('category'))

    const supabase = await supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const conversationId = await loadConversationIdByRequestId(supabase, requestId)
    if (!conversationId) {
      return NextResponse.json({ ok: true, category, files: [] })
    }

    const { data: rows, error: qErr } = await supabase
      .from('market_documents')
      .select('id, conversation_id, uploaded_by_user_id, path, name, size, content_type, uploaded_at, category')
      .eq('conversation_id', conversationId)
      .order('uploaded_at', { ascending: false })
    if (qErr) return NextResponse.json({ error: qErr.message || 'query_failed' }, { status: 500 })

    const prefix = CATEGORY_TO_PREFIX[category](requestId) + '/'
    const filtered = (rows || []).filter(r => (r.path || '').startsWith(prefix))

    const files = []
    for (const r of filtered) {
      let signedUrl: string | null = null
      try {
        const { data: signed } = await supabase.storage.from('markt').createSignedUrl(r.path, 60 * 10)
        signedUrl = signed?.signedUrl || null
      } catch {}
      files.push({
        id: r.id,
        name: r.name || r.path.split('/').pop() || 'Datei',
        path: r.path,
        signedUrl,
        uploaded_at: r.uploaded_at,
        isOwner: r.uploaded_by_user_id === user.id,
        category: r.category ?? null,
      })
    }

    return NextResponse.json({ ok: true, category, files })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unknown_error' }, { status: 500 })
  }
}

/** POST: Datei hochladen */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await ctx.params
    if (!requestId) return NextResponse.json({ error: 'request_id_required' }, { status: 400 })

    const supabase = await supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const conversationId = await ensureConversation(supabase, requestId, user.id)

    const form = await req.formData()
    const category = normalizeCategory(String(form.get('category') || 'allgemein'))
    const file = form.get('file') as File | null
    const desiredNameRaw = String(form.get('filename') || (file as any)?.name || '')
    if (!file) return NextResponse.json({ error: 'file_required' }, { status: 400 })

    const folder = CATEGORY_TO_PREFIX[category](requestId)
    const desiredName = sanitizeFilename(desiredNameRaw || 'upload.bin')
    const safeName = `${crypto.randomUUID()}-${desiredName}`
    const path = `${folder}/${safeName}`

    const contentType = (file as any).type || 'application/octet-stream'
    const bytes = await file.arrayBuffer()
    const buffer = new Uint8Array(bytes)

    const { error: upErr } = await supabase.storage
      .from('markt')
      .upload(path, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType,
      })
    if (upErr) return NextResponse.json({ error: upErr.message || 'upload_failed', key: path }, { status: 500 })

    const docCategory = category === 'rechnung' ? 'rechnung:erstellt' : null

    const { data: inserted, error: insErr } = await supabase
      .from('market_documents')
      .insert({
        conversation_id: conversationId,
        uploaded_by_user_id: user.id,
        request_id: requestId,
        path,
        name: desiredName,
        size: buffer.byteLength,
        content_type: contentType,
        category: docCategory,
      })
      .select('id')
      .single()
    if (insErr) {
      await supabase.storage.from('markt').remove([path])
      return NextResponse.json({ error: insErr.message || 'insert_failed' }, { status: 500 })
    }

    // Schöne Systemmeldung für Rechnung
    if (category === 'rechnung') {
      try {
        await supabase.from('market_messages').insert({
          conversation_id: conversationId,
          sender_user_id: user.id,
          body_text: `INVOICE:UPLOADED:${inserted.id}`,
        })
      } catch {}
    }

    let signedUrl: string | null = null
    try {
      const { data: signed } = await supabase.storage.from('markt').createSignedUrl(path, 60 * 10)
      signedUrl = signed?.signedUrl || null
    } catch {}

    return NextResponse.json({
      ok: true,
      id: inserted?.id,
      category,
      path,
      name: safeName,
      signedUrl,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unknown_error' }, { status: 500 })
  }
}

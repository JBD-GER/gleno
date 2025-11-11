// src/app/api/konsument/requests/[id]/applications/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> } // <- hier Promise
) {
  try {
    const { id: requestId } = await ctx.params // <- WICHTIG: await
    const supabase = await supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('market_applications')
      .select(`
        id, status, partner_id, created_at, updated_at, message_text, message_html,
        partner:partners(id, display_name, company_name, city, website, logo_path)
      `)
      .eq('request_id', requestId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ items: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'list_failed' }, { status: 400 })
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> } // <- auch hier Promise
) {
  try {
    const { id: requestId } = await ctx.params
    const body = await req.json()
    const { partner_id, message_html, message_text } = body as {
      partner_id: string
      message_html?: string
      message_text?: string
    }

    if (!partner_id) return NextResponse.json({ error: 'partner_id_required' }, { status: 400 })

    const supabase = await supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    // prüfen ob Partner dem User gehört
    const { data: p, error: pErr } = await supabase
      .from('partners')
      .select('id, owner_user_id')
      .eq('id', partner_id)
      .single()
    if (pErr || !p) return NextResponse.json({ error: 'partner_not_found' }, { status: 404 })
    if (p.owner_user_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    // Bewerbung anlegen
    const { data: inserted, error } = await supabase
      .from('market_applications')
      .insert({
        request_id: requestId,
        partner_id,
        message_html: message_html || null,
        message_text: message_text || null,
        status: 'eingereicht',
      })
      .select('id')
      .single()

    if (error) {
      if (String(error.message).toLowerCase().includes('duplicate')) {
        return NextResponse.json({ error: 'already_applied' }, { status: 409 })
      }
      throw error
    }

    // counter hochzählen (best effort)
    const { data: reqRow } = await supabase
      .from('market_requests')
      .select('applications_count')
      .eq('id', requestId)
      .maybeSingle()

    if (reqRow) {
      const current = typeof reqRow.applications_count === 'number' ? reqRow.applications_count : 0
      await supabase
        .from('market_requests')
        .update({ applications_count: current + 1 })
        .eq('id', requestId)
    }

    return NextResponse.json({ ok: true, id: inserted!.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'create_failed' }, { status: 400 })
  }
}

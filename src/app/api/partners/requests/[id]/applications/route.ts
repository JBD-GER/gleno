import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const requestId = params.id

    // Bewerbungen dieser Anfrage (sichtbar für Anfrage-Eigner ODER beteiligte Partner)
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
  { params }: { params: { id: string } }
) {
  try {
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

    // Ownership prüfen (Partner gehört dem eingeloggten User)
    const { data: p, error: pErr } = await supabase
      .from('partners')
      .select('id, owner_user_id')
      .eq('id', partner_id)
      .single()
    if (pErr || !p) return NextResponse.json({ error: 'partner_not_found' }, { status: 404 })
    if (p.owner_user_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    // Einfügen (UNIQUE (request_id, partner_id) verhindert Doppelbewerbungen)
    const insert = {
      request_id: params.id,
      partner_id,
      message_html: message_html || null,
      message_text: message_text || null,
      status: 'submitted' as const
    }
    const { data, error } = await supabase
      .from('market_applications')
      .insert(insert)
      .select('id')
      .single()

    if (error) {
      if (String(error.message).toLowerCase().includes('duplicate')) {
        return NextResponse.json({ error: 'already_applied' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ id: data!.id, ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'create_failed' }, { status: 400 })
  }
}

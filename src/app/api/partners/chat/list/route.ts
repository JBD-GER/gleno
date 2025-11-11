// src/app/api/partners/chat/list/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const supabase = await supabaseServer()
  const { data: { session }, error: authErr } = await supabase.auth.getSession()
  if (authErr || !session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Nur Conversations, deren partner.owner_user_id = aktueller User
  const { data, error } = await supabase
    .from('market_conversations')
    .select(`
      id,
      request_id,
      created_at,
      updated_at,
      partner:partners!inner (
        id,
        owner_user_id,
        display_name,
        company_name,
        logo_path,
        city
      ),
      request:market_requests!inner (
        id,
        status,
        summary,
        category,
        city,
        zip,
        created_at
      )
    `)
    .eq('partner.owner_user_id', session.user.id)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items = (data ?? []).map((row: any) => ({
    conversation_id: row.id as string,
    request_id: row.request_id as string,
    updated_at: row.updated_at as string,
    request: row.request ? {
      id: row.request.id,
      status: row.request.status,
      summary: row.request.summary,
      category: row.request.category,
      city: row.request.city,
      zip: row.request.zip,
      created_at: row.request.created_at,
    } : null,
    partner: row.partner ? {
      id: row.partner.id,
      display: row.partner.display_name || row.partner.company_name || 'Mein Profil',
      logo_path: row.partner.logo_path || null,
      city: row.partner.city || null,
    } : null,
  }))

  return NextResponse.json({ items })
}

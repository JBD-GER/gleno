// src/app/api/partners/applications/mine/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET() {
  const t0 = Date.now()
  try {
    const supabase = await supabaseServer()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }

    // Alle Partner des Users ermitteln
    const { data: myPartners, error: pErr } = await supabase
      .from('partners')
      .select('id, display_name, company_name')
      .eq('owner_user_id', user.id)
    if (pErr) throw pErr

    const partnerIds = (myPartners || []).map(p => p.id)
    if (partnerIds.length === 0) {
      return NextResponse.json({ ok: true, applications: [] })
    }

    // Bewerbungen + Join auf Request + Files zählen
    const { data: apps, error: aErr } = await supabase
      .from('market_applications')
      .select(`
        id,
        status,
        created_at,
        partner_id,
        request:market_requests (
          id, status, category, city, zip, execution, summary, created_at
        ),
        files:market_application_files ( id )
      `)
      .in('partner_id', partnerIds)
      .order('created_at', { ascending: false })
    if (aErr) throw aErr

    const applications = (apps || []).map(a => ({
      id: a.id,
      status: a.status,
      created_at: a.created_at,
      partner_id: a.partner_id,
      partner_display:
        myPartners?.find(p => p.id === a.partner_id)?.display_name ||
        myPartners?.find(p => p.id === a.partner_id)?.company_name ||
        'Partner',
      request: (a as any).request || null,
      files_count: ((a as any).files || []).length
    }))

    const t1 = Date.now()
    console.log('[applications/mine] returned', applications.length, 'in', (t1 - t0) + 'ms')
    return NextResponse.json({ ok: true, applications })
  } catch (e: any) {
    console.error('[applications/mine] fatal:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'list_failed' }, { status: 500 })
  }
}

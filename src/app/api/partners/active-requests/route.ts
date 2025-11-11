// src/app/api/partners/active-requests/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServerRoute } from '@/lib/supabase-server'

export const runtime = 'nodejs'

type PartnerRow = {
  id: string
  display_name: string | null
  company_name: string | null
}

/**
 * Liefert alle Anfragen, für die einer der Partner dieses Users
 * eine Bewerbung mit Status "angenommen" hat.
 */
export async function GET(req: NextRequest) {
  const { supabase, response } = supabaseServerRoute(req)

  // 1) User prüfen
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: response.headers })
  }

  // 2) Alle Partner dieses Users holen
  const { data: myPartners, error: pErr } = await supabase
    .from('partners')
    .select('id, display_name, company_name')
    .eq('owner_user_id', user.id)

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500, headers: response.headers })
  }

  const partners = (myPartners || []) as PartnerRow[]
  const partnerIds = partners.map((p: PartnerRow) => p.id)

  if (partnerIds.length === 0) {
    // kein Partner angelegt → leere Liste
    return NextResponse.json({ items: [] }, { headers: response.headers })
  }

  // kleine Map für die Anzeige
  const partnerNameById = new Map<string, string>()
  for (const p of partners) {
    const n = p.display_name || p.company_name || 'Partner'
    partnerNameById.set(p.id, n)
  }

  // 3) Alle Bewerbungen dieser Partner, die ANGENOMMEN sind
  const { data: apps, error: aErr } = await supabase
    .from('market_applications')
    .select(`
      id,
      status,
      created_at,
      partner_id,
      request:market_requests (
        id,
        status,
        summary,
        category,
        city,
        zip,
        execution,
        budget_min,
        budget_max,
        created_at
      )
    `)
    .in('partner_id', partnerIds)
    .eq('status', 'angenommen')
    .order('created_at', { ascending: false })

  if (aErr) {
    return NextResponse.json({ error: aErr.message }, { status: 500, headers: response.headers })
  }

  // 4) aufbereiten fürs Frontend
  const items = (apps || []).map((app: any) => {
    const req = app.request || {}
    return {
      application_id: app.id as string,
      partner_id: app.partner_id as string,
      partner_display: partnerNameById.get(app.partner_id as string) ?? 'Partner',
      accepted_at: app.created_at as string,
      request: {
        id: req.id as string,
        status: req.status as string | null,
        summary: req.summary as string | null,
        category: req.category as string | null,
        city: req.city as string | null,
        zip: req.zip as string | null,
        execution: req.execution as string | null,
        budget_min: req.budget_min as number | null,
        budget_max: req.budget_max as number | null,
        created_at: req.created_at as string | null,
      },
    }
  })

  return NextResponse.json({ items }, { headers: response.headers })
}

// src/app/api/konsument/active-requests/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServerRoute } from '@/lib/supabase-server'

export const runtime = 'nodejs'

type PartnerRow = {
  id: string
  display_name: string | null
  company_name: string | null
  city: string | null
  website: string | null
  logo_path: string | null
}

type RequestRow = {
  id: string
  status: string | null
  summary: string | null
  category: string | null
  city: string | null
  zip: string | null
  execution: string | null
  budget_min: number | null
  budget_max: number | null
  created_at: string
}

/**
 * Liefert alle "aktiven" Anfragen für den KONSUMENTEN.
 * "Aktiv" bedeutet hier: Es gibt mindestens EINE Bewerbung mit status = 'angenommen'
 * zu einer Anfrage, die diesem Konsumenten (user_id) gehört.
 *
 * WICHTIG: Wir filtern NICHT nach request_status in Postgres,
 * damit es KEINEN Enum-Fehler mehr gibt.
 */
export async function GET(req: NextRequest) {
  const { supabase, response } = supabaseServerRoute(req)

  // 1) User laden
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: response.headers })
  }

  // 2) Bewerbungen laden, die
  //    - status = 'angenommen' haben
  //    - zu einer Anfrage gehören, deren user_id = aktueller User ist
  //
  //    Wir machen es wie beim Partner-Endpoint, nur "andersrum".
  const { data: apps, error: aErr } = await supabase
    .from('market_applications')
    .select(`
      id,
      status,
      created_at,
      partner_id,
      partner:partners (
        id,
        display_name,
        company_name,
        city,
        website,
        logo_path
      ),
      request:market_requests!inner (
        id,
        user_id,
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
    .eq('status', 'angenommen')
    // wichtig: Anfrage muss dem Konsumenten gehören
    .eq('request.user_id', user.id)
    .order('created_at', { ascending: false })

  if (aErr) {
    // hier kam dein Fehler her – weil vorher .eq('status','aktiv') o.ä.
    return NextResponse.json({ error: aErr.message }, { status: 500, headers: response.headers })
  }

  // 3) Aufbereiten
  const items = (apps || []).map((row: any) => {
    const partner = row.partner as PartnerRow | null
    const req = row.request as RequestRow | null

    return {
      application_id: row.id as string,
      accepted_at: row.created_at as string,
      // Partnerinfos – damit der Konsument sieht, WER genommen wurde
      partner: partner
        ? {
            id: partner.id,
            display_name: partner.display_name || partner.company_name || 'Partner',
            city: partner.city,
            website: partner.website,
            logo_path: partner.logo_path,
          }
        : null,
      // Anfrageinfos
      request: req
        ? {
            id: req.id,
            status: req.status,
            summary: req.summary,
            category: req.category,
            city: req.city,
            zip: req.zip,
            execution: req.execution,
            budget_min: req.budget_min,
            budget_max: req.budget_max,
            created_at: req.created_at,
          }
        : null,
    }
  })

  return NextResponse.json({ items }, { headers: response.headers })
}

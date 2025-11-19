// src/app/api/partners/requests/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServerRoute } from '@/lib/supabase-server'

export const runtime = 'nodejs'

type PartnerRow = { id: string; branch_id: string | null; owner_user_id: string }
type BranchRow  = { id: string; name: string | null }
type MarketRequestRow = {
  id: string
  branch: string | null
  category: string | null
  status: string | null
  city: string | null
  zip: string | null
  created_at: string
  budget_min: number | null
  budget_max: number | null
  urgency: string | null
  execution: 'vorOrt' | 'digital' | null
  summary: string | null
  request_text: string | null
  applications_count: number
}

// ⬇️ ctx.params ist in Next 15 ein Promise – also awaiten
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { supabase, response } = supabaseServerRoute(req)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401, headers: response.headers }
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  const isAdmin = (profile?.role || '').toLowerCase() === 'admin'

  // ⬇️ hier params awaiten
  const { id } = await ctx.params
  const reqId = id

  const url = new URL(req.url)
  const partner_id = url.searchParams.get('partner_id') || undefined

  // Alle Partner des Users laden
  const partnerQuery = supabase
    .from('partners')
    .select('id, branch_id, owner_user_id')

  if (!isAdmin) {
    partnerQuery.eq('owner_user_id', user.id)
  }

  const { data: partnersRaw, error: partnersErr } = await partnerQuery

  if (partnersErr) {
    return NextResponse.json(
      { error: 'partner_query_failed' },
      { status: 500, headers: response.headers }
    )
  }

  const partners: PartnerRow[] = (partnersRaw ?? []) as PartnerRow[]
  if (!partners.length && !isAdmin) {
    return NextResponse.json(
      { error: 'no_partner_found' },
      { status: 404, headers: response.headers }
    )
  }

  // Wenn partner_id übergeben wurde: sicherstellen, dass er dem User gehört
  if (partner_id && !isAdmin) {
    const owned = partners.some((p) => p.id === partner_id)
    if (!owned) {
      return NextResponse.json(
        { error: 'partner_not_owned_or_not_found' },
        { status: 403, headers: response.headers }
      )
    }
  }

  // Alle Branch-Namen zu den Partner-branch_ids laden
  let allowedBranchNames = new Set<string>()
  if (partners.length) {
    const branchIds = Array.from(
      new Set(
        partners
          .map((p) => p.branch_id)
          .filter((id): id is string => !!id)
      )
    )

    if (branchIds.length) {
      const { data: branchRowsRaw } = await supabase
        .from('partner_branches')
        .select('id, name')
        .in('id', branchIds)

      const branchRows = (branchRowsRaw || []) as BranchRow[]
      allowedBranchNames = new Set(
        branchRows
          .map((b) => (b.name || '').trim().toLowerCase())
          .filter(Boolean)
      )
    }
  }

  // Anfrage laden
  const { data: rRaw, error: rErr } = await supabase
    .from('market_requests')
    .select(
      'id, branch, category, status, city, zip, created_at, budget_min, budget_max, urgency, execution, summary, request_text, applications_count'
    )
    .eq('id', reqId)
    .single()

  if (rErr || !rRaw) {
    return NextResponse.json(
      { error: 'not_found' },
      { status: 404, headers: response.headers }
    )
  }

  const r = rRaw as MarketRequestRow

  // Admin darf alles sehen, Rest muss passen
  if (!isAdmin) {
    // Deaktivierte/Gelöschte blocken
    if (r.status === 'Deaktiviert' || r.status === 'Gelöscht') {
      return NextResponse.json(
        { error: 'request_inactive' },
        { status: 403, headers: response.headers }
      )
    }

    // Wenn die Anfrage eine Branch hat:
    // Prüfen, ob mind. EIN eigenes Partnerprofil diese Branch besitzt
    if (r.branch) {
      const reqBranch = r.branch.trim().toLowerCase()
      const hasMatch = allowedBranchNames.has(reqBranch)

      if (!hasMatch) {
        return NextResponse.json(
          { error: 'forbidden_branch' },
          { status: 403, headers: response.headers }
        )
      }
    }
    // Wenn r.branch null/leer ist, lassen wir durch:
    // Zugriff ist dann nur daran gebunden, dass der User überhaupt Partner hat.
  }

  const intro_text = r.request_text ? r.request_text.slice(0, 4000) : null

  return NextResponse.json(
    {
      id: r.id,
      status: r.status,
      city: r.city,
      zip: r.zip,
      category: r.category,
      created_at: r.created_at,
      applications_count: r.applications_count ?? 0,
      budget_min: r.budget_min,
      budget_max: r.budget_max,
      urgency: r.urgency,
      execution: r.execution,
      summary: r.summary,
      intro_text,
    },
    { headers: response.headers }
  )
}

// src/app/api/partners/requests/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServerRoute } from '@/lib/supabase-server'

export const runtime = 'nodejs'

type PartnerRow = {
  id: string
  branch_id: string | null
  owner_user_id: string
}

type BranchRow = {
  id: string
  name: string
  slug: string
}

type MarketRequestListRow = {
  id: string
  summary: string | null
  category: string | null
  city: string | null
  zip: string | null
  status: string | null
  branch: string | null
  created_at: string
  applications_count: number | null
}

function slugify(input: unknown): string {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function GET(req: NextRequest) {
  const { supabase, response } = supabaseServerRoute(req)

  const url = new URL(req.url)
  const partnerIdParam = url.searchParams.get('partner_id')
  const branchFilterParam = url.searchParams.get('branch') || 'all'

  // Auth
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401, headers: response.headers },
    )
  }

  // Role
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  const isAdmin = (profile?.role || '').toLowerCase() === 'admin'

  // Partner laden (für Admin: alle; sonst: nur eigene)
  const partnerQuery = supabase
    .from('partners')
    .select('id, branch_id, owner_user_id')

  if (!isAdmin) {
    partnerQuery.eq('owner_user_id', user.id)
  }

  const { data: partnersRaw, error: pErr } = await partnerQuery

  if (pErr) {
    return NextResponse.json(
      { error: pErr.message },
      { status: 500, headers: response.headers },
    )
  }

  const partners: PartnerRow[] = (partnersRaw ?? []) as PartnerRow[]

  if (!partners.length) {
    return NextResponse.json(
      { error: 'no_partner_found', items: [] },
      { status: 404, headers: response.headers },
    )
  }

  // 1) Bevorzugt Partner, die dem aktuellen User gehören
  const owned = partners.filter((p) => p.owner_user_id === user.id)
  const pool = owned.length ? owned : partners

  // 2) Falls partner_id explizit übergeben → innerhalb des Pools suchen
  let chosen: PartnerRow | undefined
  if (partnerIdParam) {
    chosen = pool.find((p) => p.id === partnerIdParam) || pool[0]
  } else {
    chosen = pool[0]
  }

  if (!chosen) {
    return NextResponse.json(
      { error: 'partner_not_owned_or_not_found', items: [] },
      { status: 403, headers: response.headers },
    )
  }

  // ========== Branchen des Partners laden (max 3) ==========

  let branches: BranchRow[] = []

  // Erst aus partner_branch_map
  const { data: branchMapRows } = await supabase
    .from('partner_branch_map')
    .select('branch_id, partner_branches!inner(id, name, slug)')
    .eq('partner_id', chosen.id)

  if (branchMapRows && branchMapRows.length > 0) {
    branches = (branchMapRows as any[])
      .map((r) => r?.partner_branches)
      .filter((b: any) => b && b.id)
      .map((b: any) => ({
        id: String(b.id),
        name: String(b.name),
        slug: String(b.slug),
      }))
      .filter(
        (b, idx, arr) => arr.findIndex((x) => x.id === b.id) === idx,
      )
      .slice(0, 3)
  }

  // Fallback: falls kein Eintrag in partner_branch_map → partners.branch_id
  if ((!branches || branches.length === 0) && chosen.branch_id) {
    const { data: br } = await supabase
      .from('partner_branches')
      .select('id, name, slug')
      .eq('id', chosen.branch_id)
      .maybeSingle()

    if (br) {
      branches = [
        {
          id: String((br as any).id),
          name: String((br as any).name),
          slug: String((br as any).slug),
        },
      ]
    }
  }

  const partnerBranchSlugs = branches.map((b) => b.slug)
  const branchFilterSlug = slugify(branchFilterParam)

  // aktive Branch-Slugs für das Filtering bestimmen
  let activeBranchSlugs: string[]
  if (
    branchFilterSlug === 'all' ||
    !branchFilterSlug ||
    !partnerBranchSlugs.includes(branchFilterSlug)
  ) {
    activeBranchSlugs = partnerBranchSlugs
  } else {
    activeBranchSlugs = [branchFilterSlug]
  }

  // selected_branch für das Frontend
  const selected_branch: string | 'all' =
    branchFilterSlug === 'all' ||
    !branchFilterSlug ||
    !partnerBranchSlugs.includes(branchFilterSlug)
      ? 'all'
      : branchFilterSlug

  // ========== Market Requests laden ==========

  const { data: reqsRaw, error: rErr } = await supabase
    .from('market_requests')
    .select(
      'id, summary, category, city, zip, status, branch, created_at, applications_count',
    )
    .neq('status', 'Gelöscht')
    .order('created_at', { ascending: false })
    .limit(200)

  if (rErr) {
    return NextResponse.json(
      { error: rErr.message },
      { status: 500, headers: response.headers },
    )
  }

  const rows: MarketRequestListRow[] = (reqsRaw ?? []) as MarketRequestListRow[]

  const finalItems = rows
    .filter((r) => {
      const bSlug = slugify(r.branch)
      if (!activeBranchSlugs.length) return false
      return activeBranchSlugs.includes(bSlug)
    })
    .filter((r) => {
      const s = String(r.status || '')
      return s === 'Anfrage' || s === 'Deaktiviert'
    })
    .map((r) => ({
      id: r.id,
      title:
        (r.summary?.trim()) ||
        [r.category, r.city].filter(Boolean).join(' – ') ||
        'Anfrage',
      status: String(r.status || 'Anfrage'),
      city: r.city || null,
      zip: r.zip || null,
      applications_count: r.applications_count ?? 0,
      created_at: r.created_at,
      is_active: String(r.status || '') !== 'Deaktiviert',
    }))

  return NextResponse.json(
    {
      partner_id: chosen.id,
      branches,        // max 3 Branchen
      selected_branch, // für deine Filter-Chips
      items: finalItems,
    },
    { headers: response.headers },
  )
}

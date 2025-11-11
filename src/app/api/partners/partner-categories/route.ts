import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

function slugify(input: string) {
  return String(input || '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function likeWrap(q: string) {
  // Escape % und _
  return `%${q.replace(/(%|_)/g, '\\$1')}%`
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const rawBranch = (url.searchParams.get('branch') || '').trim()
  const q = (url.searchParams.get('q') || '').trim()
  const limitParam = Number(url.searchParams.get('limit') || 100)
  const limit = Math.max(1, Math.min(500, Number.isFinite(limitParam) ? limitParam : 100))

  if (!rawBranch) {
    return NextResponse.json({ ok: false, error: 'branch_required' }, { status: 400 })
  }

  try {
    const supabase = await supabaseServer()
    const branchSlug = slugify(rawBranch)

    // Branch-ID lookup (per Slug)
    const { data: branch, error: bErr } = await supabase
      .from('partner_branches')
      .select('id, slug')
      .eq('slug', branchSlug)
      .maybeSingle()

    if (bErr) {
      return NextResponse.json({ ok: false, error: bErr.message }, { status: 500 })
    }
    if (!branch) {
      // Kein Fehler – nur leere Liste, damit UI weiterläuft
      return NextResponse.json(
        { ok: true, categories: [] },
        { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' } }
      )
    }

    // Basiskriterien
    let query = supabase
      .from('partner_categories')
      .select('id, name, slug')
      .eq('branch_id', branch.id)
      .order('name', { ascending: true })
      .limit(limit)

    // Freitextsuche: name ODER slug (case-insensitive)
    if (q) {
      const pattern = likeWrap(q)
      query = query.or(`name.ilike.${pattern},slug.ilike.${pattern}`)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { ok: true, categories: data ?? [] },
      { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' } }
    )
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'categories_failed' }, { status: 500 })
  }
}

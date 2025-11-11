// src/app/api/partners/partner-branches/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

function likeWrap(q: string) {
  return `%${q.replace(/(%|_)/g, '\\$1')}%`
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()
  const limitParam = Number(url.searchParams.get('limit') || 200)
  const limit = Math.max(1, Math.min(500, Number.isFinite(limitParam) ? limitParam : 200))

  try {
    const supabase = await supabaseServer()

    let query = supabase
      .from('partner_branches')
      .select('id, name, slug')
      .order('name', { ascending: true })
      .limit(limit)

    if (q) {
      const pattern = likeWrap(q)
      // Suche in name ODER slug
      query = query.or(`name.ilike.${pattern},slug.ilike.${pattern}`)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { ok: true, branches: data ?? [] },
      { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' } }
    )
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'branches_failed' }, { status: 500 })
  }
}

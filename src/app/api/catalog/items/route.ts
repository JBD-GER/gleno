import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const supabase = await supabaseServer()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ message: 'Nicht eingeloggt' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').trim().toLowerCase()
    const limit = Math.min(Number(searchParams.get('limit') || 50), 200)

    let query = supabaseAdmin
      .from('catalog_items')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (q) {
      // einfacher Filter client-seitig, um portable zu bleiben
      const { data, error: err } = await query
      if (err) throw err
      const filtered = (data || []).filter((r: any) =>
        (`${r.name} ${r.unit} ${r.description || ''}`).toLowerCase().includes(q)
      )
      return NextResponse.json(filtered.slice(0, limit))
    }

    const { data, error: qErr } = await query
    if (qErr) throw qErr
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Fehler' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ message: 'Nicht eingeloggt' }, { status: 401 })

    const body = await req.json()
    const payload = {
      user_id: user.id,
      kind: body?.kind === 'service' ? 'service' : 'product',
      name: String(body?.name ?? '').trim(),
      unit: String(body?.unit ?? '').trim() || 'Stk.',
      unit_price: Number(body?.unit_price ?? 0) || 0,
      description: String(body?.description ?? '').trim(),
    }

    if (!payload.name) return NextResponse.json({ message: 'Name ist erforderlich' }, { status: 400 })

    const { data, error: insErr } = await supabaseAdmin
      .from('catalog_items')
      .insert(payload)
      .select('*')
      .single()
    if (insErr) throw insErr

    return NextResponse.json(data, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Fehler' }, { status: 500 })
  }
}

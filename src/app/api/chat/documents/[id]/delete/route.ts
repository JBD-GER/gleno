import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 })

    const supabase = await supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { data: row, error: qErr } = await supabase
      .from('market_documents')
      .select('id, path, uploaded_by_user_id')
      .eq('id', id)
      .maybeSingle()
    if (qErr) return NextResponse.json({ error: qErr.message || 'query_failed' }, { status: 500 })
    if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    if (row.uploaded_by_user_id !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const { error: delErr } = await supabase.from('market_documents').delete().eq('id', id)
    if (delErr) return NextResponse.json({ error: delErr.message || 'delete_failed' }, { status: 500 })

    if (row.path) await supabase.storage.from('markt').remove([row.path])

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unknown_error' }, { status: 500 })
  }
}

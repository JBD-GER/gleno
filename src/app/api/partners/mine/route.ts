// src/app/api/partners/mine/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET() {
  const t0 = Date.now()
  try {
    const supabase = await supabaseServer()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr) {
      console.warn('[partners/mine] auth error:', authErr)
      return NextResponse.json({ ok:false, error: authErr.message }, { status: 401 })
    }
    if (!user) {
      console.warn('[partners/mine] no user in session')
      return NextResponse.json({ ok:false, error: 'unauthorized' }, { status: 401 })
    }

    console.log('[partners/mine] user.id =', user.id)

    const { data: partners, error } = await supabase
      .from('partners')
      .select('id, owner_user_id, status, display_name, company_name, branch_id, city, created_at')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[partners/mine] query error:', error)
      return NextResponse.json({ ok:false, error: error.message }, { status: 500 })
    }

    console.log(`[partners/mine] found ${partners?.length ?? 0} partner(s) for user ${user.id}`)
    console.log('[partners/mine] done in', (Date.now() - t0) + 'ms')

    // IMMER ein Array zurückgeben
    return NextResponse.json({ ok: true, partners: partners || [] })
  } catch (e: any) {
    console.error('[partners/mine] fatal error:', e)
    return NextResponse.json({ ok:false, error: e?.message || 'mine_failed' }, { status: 500 })
  }
}

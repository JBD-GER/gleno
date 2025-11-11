// src/app/api/partners/orders/by-request/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const supabase = await supabaseServer()
  const { searchParams } = new URL(req.url)
  const request_id = String(searchParams.get('request_id') || '')

  if (!request_id) return NextResponse.json({ ok:false, error:'request_id_required' }, { status:400 })

  const { data, error } = await supabase
    .from('market_orders')
    .select('id,status,created_at')
    .eq('request_id', request_id)
    .limit(1)

  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 })
  const order = data?.[0] || null
  return NextResponse.json({ ok:true, order })
}

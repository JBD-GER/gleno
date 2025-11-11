// src/app/api/partners/orders/[orderId]/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
export const runtime = 'nodejs'

export async function GET(_req: NextRequest, ctx: { params: { orderId: string }}) {
  const supabase = await supabaseServer()
  const orderId = ctx.params.orderId

  const { data, error } = await supabase
    .from('market_orders')
    .select('id,status,created_at,title,net_total,tax_rate,discount_type,discount_value,discount_label,gross_total')
    .eq('id', orderId)
    .maybeSingle()

  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 })
  if (!data)   return NextResponse.json({ ok:false, error:'not_found' }, { status:404 })
  return NextResponse.json({ ok:true, order: data })
}

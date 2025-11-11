// src/app/api/konsument/orders/[orderId]/cancel/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
const DAY_MS = 24 * 60 * 60 * 1000
const WITHDRAWAL_DAYS = 14

function escapeHtml(s:string){return s.replace(/[&<>"']/g,(c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string))}

export async function POST(req: NextRequest, ctx: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await ctx.params
    const supabase = await supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 })

    const { data: order } = await supabase
      .from('market_orders')
      .select('id, request_id, status, title, gross_total, created_at')
      .eq('id', orderId)
      .maybeSingle()
    if (!order) return NextResponse.json({ ok:false, error:'order_not_found' }, { status:404 })

    const { data: conv } = await supabase
      .from('market_conversations')
      .select('id, consumer_user_id')
      .eq('request_id', order.request_id)
      .maybeSingle()
    if (!conv) return NextResponse.json({ ok:false, error:'conversation_not_found' }, { status:404 })
    if (conv.consumer_user_id !== user.id) return NextResponse.json({ ok:false, error:'forbidden' }, { status:403 })

    // Already final?
    if (order.status === 'canceled') {
      await setRequestStatusSafe(supabase, order.request_id, ['Auftrag storniert'])
      return NextResponse.json({ ok:true, status:'canceled' })
    }
    if (order.status === 'declined') return NextResponse.json({ ok:false, error:'already_declined' }, { status:409 })

    // 14 Tage prüfen
    const created = new Date(order.created_at as unknown as string).getTime()
    const diffDays = Math.floor((Date.now() - created) / DAY_MS)
    if (diffDays > WITHDRAWAL_DAYS) {
      return NextResponse.json({ ok:false, error:'withdrawal_period_exceeded', days: diffDays }, { status:403 })
    }

    // cancel
    {
      const { error } = await supabase.from('market_orders').update({ status: 'canceled' }).eq('id', order.id)
      if (error) return NextResponse.json({ ok:false, error: error.message }, { status:500 })
    }

    await setRequestStatusSafe(supabase, order.request_id, ['Auftrag storniert'])

    const plain = `Auftrag storniert (Widerruf): ${order.title ?? ''} • Brutto: ${Number(order.gross_total||0).toFixed(2)} €`
    const html  = `
      <div style="font-family:ui-sans-serif,system-ui;-webkit-font-smoothing:antialiased">
        <div style="border:1px solid #fee2e2;background:#fef2f2;border-radius:14px;padding:12px">
          <div style="font-size:14px;font-weight:600;color:#991b1b;margin-bottom:4px">Auftrag storniert</div>
          <div style="font-size:12px;color:#991b1b">${escapeHtml(plain)}</div>
        </div>
      </div>
    `.trim()

    await supabase.from('market_messages').insert({
      conversation_id: conv.id,
      sender_user_id: user.id,
      body_text: plain,
      body_html: html
    })

    return NextResponse.json({ ok:true, status:'canceled' })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'internal_error' }, { status:500 })
  }
}

async function setRequestStatusSafe(supabase:any, requestId:string, candidates:string[]): Promise<boolean> {
  for (const v of candidates) {
    const { error } = await supabase.from('market_requests').update({ status: v }).eq('id', requestId)
    if (!error) return true
  }
  return false
}

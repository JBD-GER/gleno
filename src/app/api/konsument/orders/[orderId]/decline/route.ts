// src/app/api/konsument/orders/[orderId]/decline/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
export const runtime = 'nodejs'

function escapeHtml(s:string){return s.replace(/[&<>"']/g,(c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string))}

export async function POST(req: NextRequest, ctx: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await ctx.params
    const supabase = await supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 })

    const { data: order } = await supabase
      .from('market_orders')
      .select('id, request_id, status, title, gross_total')
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

    // Idempotenz
    if (order.status === 'declined') {
      await tryUpdateRequestStatus(supabase, order.request_id, ['Auftrag abgelehnt'])
      return NextResponse.json({ ok:true, status:'declined' })
    }
    if (order.status === 'canceled') return NextResponse.json({ ok:false, error:'already_canceled' }, { status:409 })
    if (order.status === 'accepted') return NextResponse.json({ ok:false, error:'already_accepted' }, { status:409 })

    // Status → declined
    {
      const { error } = await supabase.from('market_orders').update({ status: 'declined' }).eq('id', order.id)
      if (error) return NextResponse.json({ ok:false, error: error.message }, { status:500 })
    }

    await tryUpdateRequestStatus(supabase, order.request_id, ['Auftrag abgelehnt'])

    const plain = `ORDER:DECLINED:${order.id} • Auftrag abgelehnt: ${order.title ?? ''} • Brutto: ${Number(order.gross_total||0).toFixed(2)} €`
    const html  = `
      <div style="font-family:ui-sans-serif,system-ui;-webkit-font-smoothing:antialiased">
        <div style="border:1px solid #fee2e2;background:#fef2f2;border-radius:14px;padding:12px">
          <div style="font-size:14px;font-weight:600;color:#991b1b;margin-bottom:4px">Auftrag abgelehnt</div>
          <div style="font-size:12px;color:#991b1b">${escapeHtml(order.title ?? '')}</div>
          <div style="font-size:12px;color:#991b1b;margin-top:6px">Brutto: ${Number(order.gross_total||0).toFixed(2)} €</div>
        </div>
      </div>
    `.trim()

    await supabase.from('market_messages').insert({
      conversation_id: conv.id,
      sender_user_id: user.id,
      body_text: plain,
      body_html: html
    })

    return NextResponse.json({ ok:true, status:'declined' })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'internal_error' }, { status:500 })
  }
}

async function tryUpdateRequestStatus(supabase:any, requestId:string, candidates:string[]): Promise<boolean> {
  for (const v of candidates) {
    const { error } = await supabase.from('market_requests').update({ status: v }).eq('id', requestId)
    if (!error) return true
  }
  return false
}

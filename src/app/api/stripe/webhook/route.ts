export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getSafePeriodBounds } from '@/lib/stripe-period'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function updateBy(where: Partial<{id:string, customerId:string, email:string}>, patch: Record<string, any>) {
  if (where.id) { await admin.from('profiles').update(patch).eq('id', where.id); return }
  if (where.customerId) {
    const { count } = await admin.from('profiles').update(patch, { count:'exact' }).eq('stripe_customer_id', where.customerId)
    if ((count ?? 0) > 0) return
  }
  if (where.email) {
    const { data } = await admin.from('profiles').select('id,stripe_customer_id').eq('email', where.email)
    if (data?.length === 1) await admin.from('profiles').update(patch).eq('id', data[0].id)
  }
}

function toIso(ts?: number|null) { return ts ? new Date(ts*1000).toISOString() : null }

export async function POST(req: Request) {
  const raw = await req.text()
  const sig  = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret)
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session
        const sess = await stripe.checkout.sessions.retrieve(s.id, { expand: ['subscription'] })

        const subRaw: any = sess.subscription || null
        const sub = subRaw
          ? await stripe.subscriptions.retrieve(subRaw.id, { expand:['items.data.price'] })
          : null

        const bounds = sub ? getSafePeriodBounds(sub) : { startIso: null, endIso: null }
        const statusForDb = sub?.cancel_at_period_end ? 'canceled' : (sub?.status ?? 'active')

        await updateBy(
          { id: (sess.client_reference_id || sub?.metadata?.supabase_user_id) ?? undefined,
            customerId: (sess.customer as string|undefined),
            email: sess.customer_details?.email ?? undefined },
          {
            stripe_customer_id: (sess.customer as string) ?? null,
            stripe_subscription_id: sub?.id ?? null,
            subscription_status: statusForDb,
            current_period_end: bounds.endIso,
            plan: sub?.items?.data?.[0]?.price?.nickname || 'starter',
          }
        )
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subEv = event.data.object as any
        const full = await stripe.subscriptions.retrieve(subEv.id, { expand:['items.data.price'] })
        const bounds = getSafePeriodBounds(full)
        const statusForDb = full?.cancel_at_period_end ? 'canceled' : (full?.status ?? 'active')

        await updateBy(
          { id: full?.metadata?.supabase_user_id ?? undefined, customerId: full.customer as string },
          {
            stripe_customer_id: full.customer ?? null,
            stripe_subscription_id: full.id ?? null,
            subscription_status: statusForDb,
            current_period_end: bounds.endIso,
            plan: full.items?.data?.[0]?.price?.nickname || 'starter',
          }
        )
        break
      }

      case 'invoice.payment_succeeded':
      case 'invoice.paid': {
        const inv = event.data.object as Stripe.Invoice
        const subId = (inv as any).subscription || inv.lines?.data?.[0]?.subscription || null
        if (!subId) break
        const sub: any = await stripe.subscriptions.retrieve(subId, { expand:['items.data.price'] })
        const bounds = getSafePeriodBounds(sub)
        const statusForDb = sub?.cancel_at_period_end ? 'canceled' : (sub?.status ?? 'active')

        await updateBy(
          { id: sub?.metadata?.supabase_user_id ?? undefined, customerId: inv.customer as string },
          {
            stripe_subscription_id: sub.id ?? null,
            subscription_status: statusForDb,
            current_period_end: bounds.endIso,
            stripe_customer_id: inv.customer ?? null,
          }
        )
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as any
        await updateBy(
          { id: sub?.metadata?.supabase_user_id ?? undefined, customerId: sub.customer as string },
          { subscription_status: 'canceled', current_period_end: toIso((sub as any)?.ended_at) ?? new Date().toISOString() }
        )
        break
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice
        await updateBy({ customerId: inv.customer as string }, { subscription_status: 'past_due' })
        break
      }
    }
  } catch (e) {
    console.error('[webhook] handler error:', e)
    return new NextResponse('Webhook handler error', { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'
import { getSafePeriodBounds } from '@/lib/stripe-period'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const admin  = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST() {
  try {
    const supa = await supabaseServer()
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: p, error } = await admin
      .from('profiles')
      .select('stripe_subscription_id, stripe_customer_id, plan')
      .eq('id', user.id)
      .single()

    if (error) return NextResponse.json({ error: 'profile_missing' }, { status: 400 })
    if (!p?.stripe_customer_id) return NextResponse.json({ error: 'no_stripe_customer' }, { status: 400 })

    const planKey = (p.plan ?? 'starter') as 'starter'
    const PRICE_BY_PLAN: Record<typeof planKey, string> = {
      starter: process.env.STRIPE_PRICE_STARTER!,
    }
    const priceId = PRICE_BY_PLAN[planKey]
    if (!priceId) return NextResponse.json({ error: 'price_not_configured' }, { status: 500 })

    let sub: any = null
    if (p.stripe_subscription_id) {
      try { sub = await stripe.subscriptions.retrieve(p.stripe_subscription_id, { expand:['items.data.price'] }) }
      catch { sub = null }
    }

    // A) Kündigungsflag zurücknehmen
    if (sub && sub.status !== 'canceled') {
      const upd: any = await stripe.subscriptions.update(sub.id, {
        cancel_at_period_end: false,
        expand: ['items.data.price'],
      })
      const { startIso, endIso } = getSafePeriodBounds(upd)
      await admin.from('profiles').update({
        subscription_status: 'active',
        current_period_end: endIso,
      }).eq('id', user.id)

      return NextResponse.json({
        subscription_status: 'active',
        cancel_at_period_end: false,
        current_period_start: startIso,
        current_period_end: endIso,
        stripe_subscription_id: upd.id,
      })
    }

    // B) Neu anlegen
    const created: any = await stripe.subscriptions.create({
      customer: p.stripe_customer_id,
      items: [{ price: priceId }],
      proration_behavior: 'create_prorations',
      expand: ['items.data.price'],
    })
    const { startIso, endIso } = getSafePeriodBounds(created)

    await admin.from('profiles').update({
      stripe_subscription_id: created.id,
      subscription_status: 'active',
      current_period_end: endIso,
    }).eq('id', user.id)

    return NextResponse.json({
      subscription_status: 'active',
      cancel_at_period_end: false,
      current_period_start: startIso,
      current_period_end: endIso,
      stripe_subscription_id: created.id,
    })
  } catch (e) {
    console.error('[billing/reactivate] error:', e)
    return NextResponse.json({ error: 'reactivate_failed' }, { status: 500 })
  }
}

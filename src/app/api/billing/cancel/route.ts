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
      .select('stripe_subscription_id')
      .eq('id', user.id)
      .single()

    if (error || !p?.stripe_subscription_id) {
      return NextResponse.json({ error: 'no_subscription' }, { status: 400 })
    }

    const updated: any = await stripe.subscriptions.update(p.stripe_subscription_id, {
      cancel_at_period_end: true,
      expand: ['items.data.price'],
    })

    const { startIso, endIso } = getSafePeriodBounds(updated)

    await admin.from('profiles').update({
      subscription_status: 'canceled',
      current_period_end: endIso,
    }).eq('id', user.id)

    return NextResponse.json({
      subscription_status: 'canceled',
      cancel_at_period_end: true,
      current_period_start: startIso,
      current_period_end: endIso,
    })
  } catch (e) {
    console.error('[billing/cancel] error:', e)
    return NextResponse.json({ error: 'cancel_failed' }, { status: 500 })
  }
}

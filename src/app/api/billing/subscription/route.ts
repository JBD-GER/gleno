export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const admin  = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  const supa = await supabaseServer()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: p, error } = await admin
    .from('profiles')
    .select('subscription_status,current_period_end,plan,stripe_subscription_id,stripe_customer_id,trial_ends_at')
    .eq('id', user.id)
    .single()

  if (error || !p) return NextResponse.json({ error: 'no_profile' }, { status: 404 })

  let live: any = null
  if (p.stripe_subscription_id) {
    try {
      // live-Daten (u.a. cancel_at_period_end)
      live = await stripe.subscriptions.retrieve(p.stripe_subscription_id)
    } catch (e) {
      // best effort – DB-Werte reichen
    }
  }

  return NextResponse.json({
    subscription_status: p.subscription_status,
    current_period_end: p.current_period_end,
    plan: p.plan,
    stripe_subscription_id: p.stripe_subscription_id,
    stripe_customer_id: p.stripe_customer_id,
    trial_ends_at: p.trial_ends_at,
    // Stripe live:
    live: live ? {
      status: live.status,
      cancel_at_period_end: !!live.cancel_at_period_end,
      current_period_end: live.current_period_end ? new Date(live.current_period_end * 1000).toISOString() : null,
    } : null,
  })
}

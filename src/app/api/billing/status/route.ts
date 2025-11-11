// src/app/api/billing/status/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { getSafePeriodBounds } from '@/lib/stripe-period'

/** Harte Timeouts für alle Upstream-Calls (Stripe etc.) */
function withTimeout<T>(p: Promise<T>, ms = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms)
    p.then(v => { clearTimeout(t); resolve(v) }).catch(err => { clearTimeout(t); reject(err) })
  })
}

const STRIPE_TIMEOUT_MS = 15000

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const admin  = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  try {
    const supa = await supabaseServer()
    const { data: { user } } = await supa.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { blocked: true, reason: 'no_user' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const { data: p, error } = await supa
      .from('profiles')
      .select('trial_ends_at, subscription_status, current_period_end, stripe_subscription_id')
      .eq('id', user.id)
      .single()

    if (error || !p) {
      return NextResponse.json(
        { blocked: true, reason: 'no_profile' },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // Defaults – falls Stripe nicht erreichbar ist, liefern wir trotzdem.
    let stripe_status: string | null = null
    let cancel_at_period_end: boolean | null = null
    let sub_started_iso: string | null = null
    let sub_period_start_iso: string | null = null
    let sub_period_end_iso_live: string | null = null

    // Nur versuchen, wenn eine Subscription-ID vorhanden ist.
    if (p.stripe_subscription_id) {
      try {
        // Wichtig: harter Timeout, damit die Route nie „ewig“ hängt.
        const s: any = await withTimeout(
          stripe.subscriptions.retrieve(p.stripe_subscription_id, { expand: ['items.data.price'] }) as any,
          STRIPE_TIMEOUT_MS
        )

        stripe_status = s?.status ?? null
        cancel_at_period_end = !!s?.cancel_at_period_end
        sub_started_iso = s?.start_date ? new Date(s.start_date * 1000).toISOString() : null

        const bounds = getSafePeriodBounds(s)
        sub_period_start_iso = bounds.startIso
        sub_period_end_iso_live = bounds.endIso

        // Best-effort Self-Healing – kurz awaiten, aber Fehler komplett schlucken
        const patch: Record<string, any> = {}
        if (!p.current_period_end && sub_period_end_iso_live) patch.current_period_end = sub_period_end_iso_live
        if (cancel_at_period_end && p.subscription_status === 'active') patch.subscription_status = 'canceled'
        if (Object.keys(patch).length) {
          try {
            await admin.from('profiles').update(patch).eq('id', user.id)
          } catch {
            /* ignore */
          }
        }
      } catch {
        // Stripe down/Timeout: ignoriere – wir antworten mit DB-Infos weiter unten.
      }
    }

    const now = Date.now()
    const trialEndMs = p.trial_ends_at ? Date.parse(p.trial_ends_at) : null

    // „Live“ Period-Ende aus Stripe bevorzugen, fallback auf DB
    const current_period_end_iso = p.current_period_end ?? sub_period_end_iso_live
    const subEndMs = current_period_end_iso ? Date.parse(current_period_end_iso) : null

    const trialOk  = !!(trialEndMs && trialEndMs > now)
    const activeOk = p.subscription_status === 'active'
    const graceOk  = (!!(subEndMs && subEndMs > now)) &&
                     (p.subscription_status === 'canceled' || !!cancel_at_period_end)

    const blocked = !(trialOk || activeOk || graceOk)
    const daysLeft = trialEndMs ? Math.max(0, Math.ceil((trialEndMs - now) / 86_400_000)) : 0

    let access_until: string | null = null
    let access_reason: 'trial' | 'subscription' | null = null

    if ((activeOk && cancel_at_period_end && current_period_end_iso) || (graceOk && current_period_end_iso)) {
      access_until = current_period_end_iso
      access_reason = 'subscription'
    } else if (trialOk && trialEndMs) {
      access_until = new Date(trialEndMs).toISOString()
      access_reason = 'trial'
    }

    return NextResponse.json(
      {
        blocked,
        subscription_status: p.subscription_status,
        trial_ends_at: p.trial_ends_at,
        current_period_end: current_period_end_iso,
        daysLeft,
        grace_active: graceOk,
        access_until,
        access_reason,
        // UI-Extras
        stripe_status,
        cancel_at_period_end,
        subscription_current_period_start: sub_period_start_iso,
        subscription_current_period_end: sub_period_end_iso_live ?? current_period_end_iso,
        subscription_started_at: sub_started_iso,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e: any) {
    // Fallback – niemals „ewig laden“
    return NextResponse.json(
      { blocked: false, error: 'billing_status_failed', detail: e?.message ?? String(e) },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}

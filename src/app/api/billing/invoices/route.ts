// src/app/api/billing/invoices/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const toIso = (ts?: number | null) =>
  ts ? new Date(ts * 1000).toISOString() : null

export async function GET() {
  const supa = await supabaseServer()
  const {
    data: { user },
  } = await supa.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: p, error } = await admin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (error || !p || !p.stripe_customer_id) {
    // Kein Stripe-Kunde = keine Rechnungen
    return NextResponse.json({ invoices: [], upcoming: null })
  }

  const customerId = p.stripe_customer_id as string

  // Vergangene Rechnungen
  const list = await stripe.invoices.list({
    customer: customerId,
    limit: 50,
  })

  const invoices = list.data.map((inv) => ({
    id: inv.id,
    number: inv.number ?? null,
    status: inv.status ?? null,
    currency: inv.currency ?? null,
    amount_due: inv.amount_due ?? null,
    amount_paid: inv.amount_paid ?? null,
    amount_remaining: inv.amount_remaining ?? null,
    created: toIso(inv.created),
    hosted_invoice_url: inv.hosted_invoice_url ?? null,
    invoice_pdf: inv.invoice_pdf ?? null,
    period_start: toIso(inv.period_start),
    period_end: toIso(inv.period_end),
  }))

  // Kommende Rechnung (falls vorhanden) – via any, damit TS nicht meckert
  let upcoming: any = null
  try {
    const up = await (stripe.invoices as any).retrieveUpcoming({
      customer: customerId,
    })

    upcoming = {
      id: up.id ?? 'upcoming',
      number: up.number ?? null,
      status: 'upcoming',
      currency: up.currency ?? null,
      amount_due: up.amount_due ?? null,
      amount_paid: up.amount_paid ?? null,
      amount_remaining: up.amount_remaining ?? null,
      created: toIso(up.created),
      hosted_invoice_url: up.hosted_invoice_url ?? null,
      invoice_pdf: up.invoice_pdf ?? null,
      period_start: toIso(up.period_start),
      period_end: toIso(up.period_end),
    }
  } catch {
    // Wenn keine kommende Rechnung existiert oder Endpoint nicht verfügbar ist, einfach null lassen
    upcoming = null
  }

  return NextResponse.json({ invoices, upcoming })
}

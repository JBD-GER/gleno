export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const admin  = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/* ---------------- helpers ---------------- */

function getBaseUrl(req: Request) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (envUrl) return envUrl
  const host  = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000'
  const proto = req.headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

// accept price_… or prod_… (use product.default_price)
async function resolvePriceId(id: string) {
  if (!id) throw new Error('Missing STRIPE_PRICE_STARTER')
  if (id.startsWith('price_')) return id
  if (id.startsWith('prod_')) {
    const product = await stripe.products.retrieve(id, { expand: ['default_price'] })
    const dp = product.default_price as string | Stripe.Price | null
    const priceId = typeof dp === 'string' ? dp : dp?.id
    if (!priceId) throw new Error(`Product ${id} has no default price.`)
    return priceId
  }
  throw new Error('STRIPE_PRICE_STARTER must be a price_… or prod_… ID')
}

// Mappe freie Ländernamen → ISO-2
function toIso2(country?: string | null): string | undefined {
  if (!country) return undefined
  const c = country.trim().toLowerCase()
  const map: Record<string,string> = {
    de: 'DE', deu: 'DE', deutschland: 'DE', germany: 'DE',
    at: 'AT', aut: 'AT', österreich: 'AT', oesterreich: 'AT', austria: 'AT',
    ch: 'CH', che: 'CH', schweiz: 'CH', switzerland: 'CH',
    fr: 'FR', fra: 'FR', france: 'FR', frankreich: 'FR',
    it: 'IT', ita: 'IT', italy: 'IT', italien: 'IT',
    es: 'ES', esp: 'ES', spain: 'ES', spanien: 'ES'
  }
  if (map[c]) return map[c]
  // wenn schon ISO-2
  if (/^[A-Za-z]{2}$/.test(country)) return country.toUpperCase()
  return undefined
}

type ProfileForStripe = {
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  company_name?: string | null
  street?: string | null
  house_number?: string | null
  postal_code?: string | null
  city?: string | null
  country?: string | null
  vat_number?: string | null
}

// Name/Firma/Adresse/VAT → Stripe-Customer
async function syncCustomerDataToStripe(customerId: string, p: ProfileForStripe) {
  const iso = toIso2(p.country)
  const line1 = [p.street, p.house_number].filter(Boolean).join(' ').trim() || undefined

  // Nur schreiben, wenn Adresse plausibel (Stripe validiert u.a. country ISO)
  const addr: Stripe.AddressParam | undefined =
    (iso && (line1 || p.postal_code || p.city))
      ? { line1, postal_code: p.postal_code || undefined, city: p.city || undefined, country: iso }
      : undefined

  const contactName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || undefined
  const displayName = (p.company_name && p.company_name.trim().length > 1)
    ? p.company_name!
    : (contactName || undefined)

  await stripe.customers.update(customerId, {
    name: displayName,
    address: addr, // wenn undefined → Checkout sammelt sie ein
    email: p.email || undefined,
    shipping: addr && contactName ? { name: contactName, address: addr } : undefined,
    invoice_settings: (p.company_name && contactName)
      ? { custom_fields: [{ name: 'Kontakt', value: contactName }] }
      : undefined,
    metadata: { contact_name: contactName || '', company_name: p.company_name || '' },
  })

  // VAT als Tax ID
  if (p.vat_number && p.vat_number.trim()) {
    const vat = p.vat_number.trim()
    try {
      const existing = await stripe.customers.listTaxIds(customerId, { limit: 20 })
      const same = existing.data.find(t => t.type === 'eu_vat' && t.value?.toUpperCase() === vat.toUpperCase())
      if (!same) await stripe.customers.createTaxId(customerId, { type: 'eu_vat', value: vat })
    } catch (e) {
      console.warn('[stripe] createTaxId failed (ignored):', (e as any)?.message)
    }
  }
}

/* ---------------- main ---------------- */

async function createSessionForUser(req: Request) {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHORIZED')

  const { data: p, error } = await admin
    .from('profiles')
    .select(`
      email, first_name, last_name, company_name,
      street, house_number, postal_code, city, country,
      vat_number, stripe_customer_id
    `)
    .eq('id', user.id)
    .single()
  if (error || !p) throw new Error('PROFILE_NOT_FOUND')

  // Ensure Stripe customer
  let customerId = p.stripe_customer_id as string | null
  if (!customerId) {
    const cust = await stripe.customers.create({
      email: p.email || undefined,
      metadata: { supabase_user_id: user.id },
    })
    customerId = cust.id
    await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  } else {
    try { await stripe.customers.update(customerId, { metadata: { supabase_user_id: user.id } }) } catch {}
  }

  // Schreibe bekannte Daten (mit ISO-Ländercode) – sonst sammelt Checkout
  await syncCustomerDataToStripe(customerId, p)

  const baseUrl = getBaseUrl(req)
  const priceId = await resolvePriceId(process.env.STRIPE_PRICE_STARTER!)

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,

    // Wichtig für VAT: Adresse einsammeln & zurück zum Customer schreiben
    billing_address_collection: 'required',
    customer_update: { address: 'auto', name: 'auto', shipping: 'auto' },
    tax_id_collection: { enabled: true },
    automatic_tax: { enabled: true },
    // automatic_tax: { enabled: true }, // optional

    subscription_data: { metadata: { supabase_user_id: user.id } },
    success_url: `${baseUrl}/dashboard/danke`,
    cancel_url: `${baseUrl}/paywall?canceled=1`,
  })

  return session.url!
}

async function handler(req: Request) {
  const u = new URL(req.url)
  if (u.searchParams.get('ping')) return NextResponse.json({ ok: true, route: 'billing/checkout' })

  try {
    const url = await createSessionForUser(req)
    return NextResponse.redirect(url, 303)
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED')      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e?.message === 'PROFILE_NOT_FOUND') return NextResponse.json({ error: 'Profil nicht gefunden' }, { status: 400 })
    console.error('[checkout] error:', e)
    return NextResponse.json({ error: String(e?.message || 'Checkout error') }, { status: 500 })
  }
}

export async function GET(req: Request)  { return handler(req) }
export async function POST(req: Request) { return handler(req) }

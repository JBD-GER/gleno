// src/app/api/billing-settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

// Admin-Client mit Service-Role-Key für privates Storage-Listing
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  // 1) Authentifizieren
  const supa = await supabaseServer()
  const { data: { user }, error: authErr } = await supa.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  // 2) billing_settings laden oder anlegen
  let { data: settings, error } = await supa
    .from('billing_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code === 'PGRST116') {
    const { data: ins, error: insErr } = await supa
      .from('billing_settings')
      .insert({ user_id: user.id })
      .select('*')
      .single()
    if (insErr) {
      return NextResponse.json({ message: insErr.message }, { status: 500 })
    }
    settings = ins
  } else if (error || !settings) {
    return NextResponse.json(
      { message: error?.message ?? 'Not found' },
      { status: 404 }
    )
  }

  // 3) Liste aller PDF-Dateien aus dem Bucket
  const { data: rawFiles, error: listErr } = await supabaseAdmin
    .storage
    .from('rechnungvorlagen')
    .list('', { limit: 100 })

  if (listErr) {
    return NextResponse.json({ message: listErr.message }, { status: 500 })
  }

  const files = (rawFiles ?? []).map(f => f.name)

  // 4) Antwort: Einstellungen + Dateinamen
  return NextResponse.json(
    { ...settings, files },
    { status: 200 }
  )
}

export async function PATCH(request: NextRequest) {
  // 1) Authentifizieren
  const supa = await supabaseServer()
  const { data: { user }, error: authErr } = await supa.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  // 2) Body parsen
  const body = await request.json()
  const updates: Record<string, any> = {}
  const {
    template,
    invoice_prefix, invoice_suffix, invoice_start,
    quote_prefix, quote_suffix, quote_start,
    order_confirmation_prefix, order_confirmation_suffix, order_confirmation_start,
    agb_url, privacy_url,
    account_holder, iban, bic, billing_phone, billing_email
  } = body

  if (invoice_prefix      !== undefined) updates.invoice_prefix             = invoice_prefix.trim()
  if (invoice_suffix      !== undefined) updates.invoice_suffix             = invoice_suffix.trim()
  if (invoice_start       !== undefined) updates.invoice_start              = invoice_start
  if (quote_prefix        !== undefined) updates.quote_prefix               = quote_prefix.trim()
  if (quote_suffix        !== undefined) updates.quote_suffix               = quote_suffix.trim()
  if (quote_start         !== undefined) updates.quote_start                = quote_start
  if (order_confirmation_prefix !== undefined) updates.order_confirmation_prefix  = order_confirmation_prefix.trim()
  if (order_confirmation_suffix !== undefined) updates.order_confirmation_suffix  = order_confirmation_suffix.trim()
  if (order_confirmation_start  !== undefined) updates.order_confirmation_start   = order_confirmation_start

  if (template !== undefined) {
    updates.template = (template as string).trim() || 'Rechnung_Vorlage_1_Welle_Standard.pdf'
  }
  if (agb_url     !== undefined) updates.agb_url     = agb_url.trim() || null
  if (privacy_url !== undefined) updates.privacy_url = privacy_url.trim() || null

  // Neue Bank-/Kontofelder
  if (account_holder !== undefined) updates.account_holder = account_holder.trim() || null
  if (iban           !== undefined) updates.iban           = iban.trim()           || null
  if (bic            !== undefined) updates.bic            = bic.trim()            || null
  if (billing_phone  !== undefined) updates.billing_phone  = billing_phone.trim()  || null
  if (billing_email  !== undefined) updates.billing_email  = billing_email.trim()  || null

  // 3) Update in DB
  const { data, error: updErr } = await supa
    .from('billing_settings')
    .update(updates)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (updErr) {
    return NextResponse.json({ message: updErr.message }, { status: 400 })
  }

  return NextResponse.json(data, { status: 200 })
}

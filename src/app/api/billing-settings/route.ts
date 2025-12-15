// src/app/api/billing-settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

// Admin-Client mit Service-Role-Key für privates Storage-Listing
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** Helpers */
function isDefined<T>(v: T | undefined): v is T {
  return v !== undefined
}

function trimOrEmpty(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

/**
 * Für nullable Textfelder (z.B. agb_url, iban):
 * - undefined => nicht updaten
 * - null => null setzen
 * - string => trim; wenn leer => null
 */
function normalizeNullableText(v: unknown): string | null | undefined {
  if (v === undefined) return undefined
  if (v === null) return null
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t.length ? t : null
}

/**
 * Für "Pflicht-Strings" (prefix/suffix), die du als string speichern willst:
 * - undefined => nicht updaten
 * - null/sonst => '' (damit kein Crash)
 * - string => trim
 */
function normalizeRequiredText(v: unknown): string | undefined {
  if (v === undefined) return undefined
  return trimOrEmpty(v)
}

/**
 * Für Nummernfelder (start):
 * - undefined => nicht updaten
 * - number => übernehmen (wenn valide)
 * - string => Number(...) (wenn valide)
 * - null => nicht updaten (oder setze 0, wenn du willst)
 */
function normalizeNumber(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return undefined
  return n
}

export async function GET(request: NextRequest) {
  try {
    // 1) Auth
    const supa = await supabaseServer()
    const {
      data: { user },
      error: authErr,
    } = await supa.auth.getUser()

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
    const { data: rawFiles, error: listErr } = await supabaseAdmin.storage
      .from('rechnungvorlagen')
      .list('', { limit: 100 })

    if (listErr) {
      return NextResponse.json({ message: listErr.message }, { status: 500 })
    }

    const files = (rawFiles ?? []).map((f) => f.name)

    // 4) Antwort
    return NextResponse.json({ ...settings, files }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // 1) Auth
    const supa = await supabaseServer()
    const {
      data: { user },
      error: authErr,
    } = await supa.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 2) Body parsen (robust)
    let body: any = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    const updates: Record<string, any> = {}

    const {
      template,

      invoice_prefix,
      invoice_suffix,
      invoice_start,

      quote_prefix,
      quote_suffix,
      quote_start,

      order_confirmation_prefix,
      order_confirmation_suffix,
      order_confirmation_start,

      agb_url,
      privacy_url,

      account_holder,
      iban,
      bic,
      billing_phone,
      billing_email,
    } = body

    // Prefix/Suffix (immer string, nie crash)
    const invPref = normalizeRequiredText(invoice_prefix)
    if (isDefined(invPref)) updates.invoice_prefix = invPref

    const invSuf = normalizeRequiredText(invoice_suffix)
    if (isDefined(invSuf)) updates.invoice_suffix = invSuf

    const qtPref = normalizeRequiredText(quote_prefix)
    if (isDefined(qtPref)) updates.quote_prefix = qtPref

    const qtSuf = normalizeRequiredText(quote_suffix)
    if (isDefined(qtSuf)) updates.quote_suffix = qtSuf

    const ocPref = normalizeRequiredText(order_confirmation_prefix)
    if (isDefined(ocPref)) updates.order_confirmation_prefix = ocPref

    const ocSuf = normalizeRequiredText(order_confirmation_suffix)
    if (isDefined(ocSuf)) updates.order_confirmation_suffix = ocSuf

    // Start-Nummern (accept number oder string-number)
    const invStart = normalizeNumber(invoice_start)
    if (isDefined(invStart)) updates.invoice_start = invStart

    const qtStart = normalizeNumber(quote_start)
    if (isDefined(qtStart)) updates.quote_start = qtStart

    const ocStart = normalizeNumber(order_confirmation_start)
    if (isDefined(ocStart)) updates.order_confirmation_start = ocStart

    // Template: falls null/leer => Default
    if (template !== undefined) {
      const t = trimOrEmpty(template)
      updates.template = t || 'Rechnung_Vorlage_1_Welle_Standard.pdf'
    }

    // Nullable Textfelder (null erlaubt, '' => null)
    const agb = normalizeNullableText(agb_url)
    if (agb !== undefined) updates.agb_url = agb

    const priv = normalizeNullableText(privacy_url)
    if (priv !== undefined) updates.privacy_url = priv

    const ah = normalizeNullableText(account_holder)
    if (ah !== undefined) updates.account_holder = ah

    const i = normalizeNullableText(iban)
    if (i !== undefined) updates.iban = i

    const b = normalizeNullableText(bic)
    if (b !== undefined) updates.bic = b

    const bp = normalizeNullableText(billing_phone)
    if (bp !== undefined) updates.billing_phone = bp

    const be = normalizeNullableText(billing_email)
    if (be !== undefined) updates.billing_email = be

    // Falls nichts zu updaten ist
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: 'No updates provided' },
        { status: 400 }
      )
    }

    // 3) Update
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
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// src/app/api/digistore/ipn/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE   = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RAW_SITE_URL   = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gleno.de'
const PRODUCT_ID     = '649531' // dein GLENO-Produkt bei Digistore

// SITE_URL immer sauber normalisieren (wie in /api/users/route.ts)
const SITE_URL = (() => {
  try {
    const url = new URL(RAW_SITE_URL)

    // Wenn jemand "https://gleno.de" (ohne www) gesetzt hat → auf www drehen
    if (url.hostname === 'gleno.de') {
      url.hostname = 'www.gleno.de'
    }

    return url.origin
  } catch {
    return 'https://www.gleno.de'
  }
})()

// Supabase Admin-Client (Service-Role)
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * Digistore24 IPN Webhook
 * URL in Digistore: https://www.gleno.de/api/digistore/ipn
 *
 * Erwartet: application/x-www-form-urlencoded
 * Ziel: Nach erfolgreicher Bestellung → Invite für Supabase-Account mit
 *   - role: "admin"
 *   - class: "digi" (Sekundärrolle / Tag)
 * Redirect führt nach E-Mail-Bestätigung auf /willkommen
 */
export async function POST(req: Request) {
  try {
    const bodyText = await req.text()
    const params = new URLSearchParams(bodyText)

    const get = (name: string) => {
      const v = params.get(name)
      return v ? v.trim() : ''
    }

    // ---------------- Basisdaten aus IPN ----------------
    const email          = get('email').toLowerCase()
    const first_name     = get('first_name')
    const last_name      = get('last_name')
    const company        = get('company')
    const street         = get('street')
    const city           = get('city')
    const zipcode        = get('zipcode')
    const state          = get('state')
    const country_code   = get('country_code')
    const country_name   = get('country_name')
    const phone_no       = get('phone_no')

    const order_id       = get('order_id')
    const transaction_id = get('transaction_id')
    const product_id     = get('product_id')
    const product_name   = get('product_name')
    const product_name_intern = get('product_name_intern')
    const quantity       = get('quantity')

    const amount_brutto  = get('amount_brutto')
    const amount_netto   = get('amount_netto')
    const currency       = get('currency')

    const receipt_url    = get('receipt_url')
    const invoice_url    = get('invoice_url')

    const custom         = get('custom')
    const tags           = get('tags')
    const event          = get('event')

    // ---------------- Plausibilitätsprüfungen ----------------
    if (!email) {
      console.error('[Digistore IPN] Kein email-Feld vorhanden. Abbruch.')
      return NextResponse.json({ ok: false, error: 'missing_email' }, { status: 400 })
    }

    if (product_id !== PRODUCT_ID) {
      console.log('[Digistore IPN] Andere product_id, wird ignoriert:', product_id)
      return NextResponse.json({ ok: true, ignore: 'other_product' }, { status: 200 })
    }

    // Optional: auf bestimmtes Event filtern (z.B. "payment", "sale", o.Ä.)
    // if (event !== 'payment') { ... return; }

    // ---------------- Supabase-Invite ----------------
    // Wir erzeugen IMMER einen Invite – auch wenn es den User schon gibt.
    const redirectTo = `${SITE_URL}/willkommen`

    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo,
        data: {
          // Primäre Rolle + Sekundärrolle/Tag
          role: 'admin',    // hat Einfluss auf deine Software (wie bisher)
          class: 'digi',    // nur Kennzeichnung: „kam über Digistore“
          source: 'digistore',

          // Kontaktdaten
          first_name,
          last_name,
          company,
          street,
          city,
          zipcode,
          state,
          country_code,
          country_name,
          phone_no,

          // Bestelldaten
          order_id,
          transaction_id,
          product_id,
          product_name,
          product_name_intern,
          quantity,
          amount_brutto,
          amount_netto,
          currency,
          receipt_url,
          invoice_url,
          custom,
          tags,
          event,
        },
      },
    )

    if (inviteError) {
      console.error('[Digistore IPN] inviteUserByEmail fehlgeschlagen:', inviteError)
      return NextResponse.json(
        { ok: false, error: 'invite_failed', detail: inviteError.message },
        { status: 500 },
      )
    }

    const user = inviteData?.user
    console.log('[Digistore IPN] Invite erstellt für', email, 'User-ID:', user?.id)

    // ---------------- Profile-Update mit Sekundärrolle (class) ----------------
    // Voraussetzung: public.profiles hat Spalten:
    //  - id (uuid, PK)
    //  - email (text)
    //  - role (text)
    //  - first_name, last_name, company_name, street, postal_code, city, country (optional)
    //  - class (text)  ← Sekundärrolle / Tag
    try {
      if (user?.id) {
        await adminClient.from('profiles').upsert(
          {
            id: user.id,
            email,
            role: 'admin',
            first_name: first_name || null,
            last_name: last_name || null,
            company_name: company || null,
            street: street || null,
            postal_code: zipcode || null,
            city: city || null,
            country: (country_name || country_code) || null,
            class: 'digi', // hier landet deine Sekundärrolle im Profil
          },
          { onConflict: 'id' },
        )
      }
    } catch (profileErr) {
      console.error('[Digistore IPN] Profile-Upsert (optional) fehlgeschlagen:', profileErr)
      // Fehler im Profil-Update sollen den IPN nicht killen → wir loggen nur
    }

    // Digistore erwartet schnellen 200er
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err: any) {
    console.error('[Digistore IPN] Unhandled Error:', err)
    return NextResponse.json(
      { ok: false, error: 'server_error', detail: err?.message ?? String(err) },
      { status: 500 },
    )
  }
}

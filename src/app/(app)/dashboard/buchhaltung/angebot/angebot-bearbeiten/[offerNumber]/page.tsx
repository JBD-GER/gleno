// src/app/(app)/dashboard/buchhaltung/angebot/angebot-bearbeiten/[offerNumber]/page.tsx

import React from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { supabaseServer } from '@/lib/supabase-server'
import OfferWizard from '../../angebot-erstellen/OfferWizard'
import type {
  BillingSettings,
  Customer,
  Position,
  InitialData,
  Discount,
} from '../../angebot-erstellen/AngebotContext'

interface Params {
  offerNumber: string
}

export default async function EditOfferPage({
  params,
}: {
  params: Promise<Params> // in deinem Setup als Promise
}) {
  // 0) Request-Kontext loggen  ➜ headers() ist synchron, kein await!
  const h = await headers()
  const referer = h.get('referer') || ''
  const url = h.get('x-invoke-path') || ''
  console.log('[EDIT PAGE] Init', { referer, url, rawParams: params })

  // 1) URL-Param (PROMISE!) awaiten
  const { offerNumber } = await params
  console.log('[EDIT PAGE] offerNumber aus Route', offerNumber)

  // 2) Supabase-Client
  const supabase = await supabaseServer()
  console.log('[EDIT PAGE] Supabase-Client aufgebaut')

  // 3) Auth
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  console.log('[EDIT PAGE] Auth Result', {
    hasUser: !!user,
    authErr: authErr?.message,
    userId: user?.id,
  })
  if (authErr || !user) {
    console.error('[EDIT PAGE] Redirect -> /login wegen fehlender Auth', { authErr: authErr?.message })
    redirect('/login')
  }

  // 4) Angebot laden – nur existierende Spalten selektieren!  (KEINE Kommentare im Select!)
  console.log('[EDIT PAGE] Lade Angebot', { userId: user.id, offerNumber })
  const { data: offer, error: offerErr } = await supabase
    .from('offers')
    .select(`
      id,
      offer_number,
      date,
      valid_until,
      title,
      intro,
      tax_rate,
      positions,
      discount,
      customers:customers (
        id,
        first_name,
        last_name,
        company,
        email,
        street,
        house_number,
        postal_code,
        city,
        customer_number
      )
    `)
    .eq('user_id', user.id)
    .eq('offer_number', offerNumber)
    .maybeSingle()

  console.log('[EDIT PAGE] Angebot-Query Ergebnis', {
    offerErr: offerErr?.message,
    hasOffer: !!offer,
    offerKeys: offer ? Object.keys(offer) : [],
  })

  if (offerErr || !offer) {
    console.error('[EDIT PAGE] Redirect -> /dashboard/buchhaltung (Angebot nicht gefunden)', {
      reason: offerErr?.message || 'no-offer',
      userId: user.id,
      offerNumber,
    })
    redirect('/dashboard/buchhaltung')
  }

  // 5) Kunde typ-sicher
  let customer: Customer
  if (Array.isArray(offer.customers)) {
    console.log('[EDIT PAGE] customers ist Array', {
      length: offer.customers.length,
      firstHasValue: !!offer.customers[0],
    })
    if (!offer.customers[0]) {
      console.error('[EDIT PAGE] Redirect -> /dashboard/buchhaltung (kein verknüpfter Kunde)')
      redirect('/dashboard/buchhaltung')
    }
    customer = offer.customers[0] as Customer
  } else {
    console.log('[EDIT PAGE] customers ist Objekt', { hasValue: !!offer.customers })
    customer = offer.customers as Customer
  }
  console.log('[EDIT PAGE] Kunde extrahiert', {
    customerId: customer?.id,
    name: `${customer?.first_name ?? ''} ${customer?.last_name ?? ''}`.trim(),
    company: customer?.company,
  })

  // 6) Positionen
  const initialPositions = (offer.positions ?? []) as Position[]
  console.log('[EDIT PAGE] Positionen', { count: initialPositions.length })

  // 7) Rabatt (nur JSON-Variante)
  let initialDiscount: Discount | undefined = undefined
  if (offer.discount && typeof offer.discount === 'object') {
    const d = offer.discount as Partial<Discount>
    initialDiscount = {
      enabled: !!d.enabled,
      label: d.label ?? 'Rabatt',
      type: d.type === 'amount' ? 'amount' : 'percent',
      base: d.base === 'gross' ? 'gross' : 'net',
      value: Number(d.value ?? 0),
    }
    console.log('[EDIT PAGE] Discount aus JSON', initialDiscount)
  } else {
    console.log('[EDIT PAGE] Kein Discount vorhanden')
  }

  // 8) Billing-Settings
  const { data: bsData, error: bsErr } = await supabase
    .from('billing_settings')
    .select('quote_prefix, quote_start, quote_suffix, template')
    .eq('user_id', user.id)
    .maybeSingle()

  console.log('[EDIT PAGE] Billing-Settings', {
    bsErr: bsErr?.message,
    hasData: !!bsData,
    template: bsData?.template,
  })

  if (bsErr || !bsData) {
    console.error('[EDIT PAGE] Redirect -> /dashboard/buchhaltung (Billing-Settings fehlen)', {
      reason: bsErr?.message || 'no-bs',
      userId: user.id,
    })
    redirect('/dashboard/buchhaltung')
  }

  const billingSettings: BillingSettings = {
    quote_prefix: bsData.quote_prefix,
    quote_start:  bsData.quote_start,
    quote_suffix: bsData.quote_suffix,
    template:     bsData.template,
  }

  // 9) InitialData  (inkl. offerId, damit Save=Update)
  const initialData: InitialData = {
    offerId:          offer.id,
    offerNumber:      offer.offer_number,
    selectedCustomer: customer,
    date:             offer.date,
    validUntil:       offer.valid_until,
    title:            offer.title,
    intro:            offer.intro,
    positions:        initialPositions,
    taxRate:          offer.tax_rate,
    ...(initialDiscount ? { discount: initialDiscount } : {}),
  }
  console.log('[EDIT PAGE] InitialData vorbereitet', {
    offerId: initialData.offerId,
    offerNumber: initialData.offerNumber,
    date: initialData.date,
    validUntil: initialData.validUntil,
    positions: initialData.positions?.length ?? 0,
    hasDiscount: !!initialData.discount,
  })

  // 10) Wizard rendern
  console.log('[EDIT PAGE] Render OfferWizard (isEdit=true)')
  return (
    <OfferWizard
      customers={[customer]}
      billingSettings={billingSettings}
      initialData={initialData}
      isEdit={true}
    />
  )
}

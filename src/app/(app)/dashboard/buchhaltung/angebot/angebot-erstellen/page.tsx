import React from 'react'
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import OfferWizard from './OfferWizard'
import type { BillingSettings as BS } from './AngebotContext'

type SearchParams = {
  offerNumber?: string
  invoiceNumber?: string
}

export default async function AngebotPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await supabaseServer()

  // Auth
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) redirect('/login')

  // Kunden – NUR strukturierte Felder laden (KEIN address)
  const { data: customersData, error: custErr } = await supabase
    .from('customers')
    .select(`
      id,
      first_name,
      last_name,
      email,
      company,
      customer_number,
      street,
      house_number,
      postal_code,
      city,
      country
    `)
    .eq('user_id', user.id)
    .order('last_name', { ascending: true })

  if (custErr) console.error('Kunden-Fehler:', custErr)
  const customers = customersData ?? []

  // Billing Settings
  const { data: settingsData, error: setErr } = await supabase
    .from('billing_settings')
    .select('quote_prefix, quote_start, quote_suffix, template')
    .eq('user_id', user.id)
    .single()

  if (setErr) console.error('Settings-Fehler:', setErr)
  const bs = settingsData ?? {
    quote_prefix: '',
    quote_start: 1,
    quote_suffix: '',
    template: 'Rechnung_Vorlage_1_Welle_Standard.pdf',
  }

  const billingSettings: BS = {
    quote_prefix: bs.quote_prefix,
    quote_start: bs.quote_start,
    quote_suffix: bs.quote_suffix,
    template: bs.template,
  }

  const { offerNumber, invoiceNumber } = await searchParams
  const initialOfferNumber = offerNumber ?? invoiceNumber ?? undefined

  return (
    <OfferWizard
      customers={customers}
      billingSettings={billingSettings}
      initialOfferNumber={initialOfferNumber}
    />
  )
}

// src/app/(app)/dashboard/buchhaltung/rechnung/rechnung-erstellen/page.tsx
import React from 'react'
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import InvoiceWizard from './InvoiceWizard'
import type { BillingSettings as BS } from './RechnungContext'

interface Props {
  searchParams: { invoiceNumber?: string }
}

export default async function RechnungPage({
  searchParams,
}: {
  searchParams: Promise<Props['searchParams']>
}) {
  const supabase = await supabaseServer()

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) redirect('/login')

  const { data: customersData } = await supabase
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
      country,
      address
    `)
    .eq('user_id', user.id)
    .order('last_name', { ascending: true })

  const customers = customersData ?? []

  const { data: settingsData } = await supabase
    .from('billing_settings')
    .select('invoice_prefix, invoice_start, invoice_suffix, template')
    .eq('user_id', user.id)
    .single()

  const bs = settingsData ?? {
    invoice_prefix: '',
    invoice_start: 1,
    invoice_suffix: '',
    template: 'Rechnung_Vorlage_1_Welle_Standard.pdf',
  }

  const billingSettings: BS = {
    invoice_prefix: bs.invoice_prefix,
    invoice_start: bs.invoice_start,
    invoice_suffix: bs.invoice_suffix,
    template: bs.template,
  }

  const _sp = await searchParams
  const { invoiceNumber } = _sp || {}

  return (
    <InvoiceWizard
      customers={customers}
      billingSettings={billingSettings}
      initialinvoiceNumber={invoiceNumber}
    />
  )
}

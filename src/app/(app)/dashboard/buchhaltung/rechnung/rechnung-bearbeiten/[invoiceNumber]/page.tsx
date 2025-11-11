// src/app/(app)/dashboard/buchhaltung/rechnung/rechnung-bearbeiten/[invoiceNumber]/page.tsx

import React from 'react'
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import InvoiceWizard from '../../rechnung-erstellen/InvoiceWizard'
import type {
  BillingSettings,
  Customer,
  Position,
  InitialData,
  Discount,
} from '../../rechnung-erstellen/RechnungContext'

interface Params {
  invoiceNumber: string
}

export default async function EditinvoicePage({
  params,
}: {
  params: Promise<Params>
}) {
  // 1) URL-Param awaiten
  const { invoiceNumber } = await params

  // 2) Supabase-Client
  const supabase = await supabaseServer()

  // 3) Auth
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) redirect('/login')

  // 4) Rechnung laden (ohne Kommentare im SELECT!)
  const { data: invoice, error: invoiceErr } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      date,
      valid_until,
      title,
      intro,
      tax_rate,
      positions,
      discount,
      customer_id,
      customers (
        id,
        first_name,
        last_name,
        company,
        email,
        street,
        house_number,
        address,
        postal_code,
        city,
        customer_number
      )
    `)
    .eq('user_id', user.id)
    .eq('invoice_number', invoiceNumber)
    .maybeSingle()

  if (invoiceErr || !invoice) {
    console.error('Fehler beim Laden der Rechnung:', invoiceErr)
    redirect('/dashboard/buchhaltung')
  }

  // 5) Kunde typ-sicher (Array/Objekt)
  let customer: Customer
  if (Array.isArray(invoice.customers)) {
    if (!invoice.customers[0]) {
      console.error('[EDIT INVOICE] Kein verknüpfter Kunde')
      redirect('/dashboard/buchhaltung')
    }
    customer = invoice.customers[0] as Customer
  } else {
    customer = invoice.customers as Customer
  }

  // 6) Positionen
  const initialPositions = (invoice.positions ?? []) as Position[]

  // 7) Rabatt aus JSON übernehmen
  let initialDiscount: Discount | undefined = undefined
  if (invoice.discount && typeof invoice.discount === 'object') {
    const d = invoice.discount as Partial<Discount>
    initialDiscount = {
      enabled: !!d.enabled,
      label: d.label ?? 'Rabatt',
      type: d.type === 'amount' ? 'amount' : 'percent',
      base: d.base === 'gross' ? 'gross' : 'net',
      value: Number(d.value ?? 0),
    }
  }

  // 8) Billing-Settings
  const { data: bsData, error: bsErr } = await supabase
    .from('billing_settings')
    .select('invoice_prefix, invoice_start, invoice_suffix, template')
    .eq('user_id', user.id)
    .maybeSingle()

  if (bsErr || !bsData) {
    console.error('Fehler beim Laden der Billing-Settings:', bsErr)
    redirect('/dashboard/buchhaltung')
  }

  const billingSettings: BillingSettings = {
    invoice_prefix: bsData.invoice_prefix,
    invoice_start:  bsData.invoice_start,
    invoice_suffix: bsData.invoice_suffix,
    template:       bsData.template,
  }

  // 9) InitialData
  const initialData: InitialData = {
    // falls dein Wizard ein id-Feld unterstützt:
    // @ts-expect-error optional
    invoiceId:        invoice.id,
    invoiceNumber:    invoice.invoice_number,
    selectedCustomer: customer,
    date:             invoice.date,
    validUntil:       invoice.valid_until,
    title:            invoice.title,
    intro:            invoice.intro,
    positions:        initialPositions,
    taxRate:          invoice.tax_rate,
    ...(initialDiscount ? { discount: initialDiscount } : {}),
  }

  // 10) Wizard rendern
  return (
    <InvoiceWizard
      customers={[customer]}
      billingSettings={billingSettings}
      initialData={initialData}
      isEdit={true}
    />
  )
}

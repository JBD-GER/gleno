// src/app/api/rechnung/e-invoice/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

type Position = {
  type?: 'item' | 'heading' | 'description' | 'subtotal' | 'separator'
  description?: string
  quantity?: number
  unitPrice?: number
  unit?: string
}

type Discount = {
  enabled: boolean
  label: string
  type: 'percent' | 'absolute'
  base: 'net' | 'gross'
  value: number
}

type Customer = {
  id: string
  first_name: string
  last_name: string
  company?: string | null
  email?: string | null
  phone?: string | null
  street?: string | null
  house_number?: string | null
  postal_code?: string | null
  city?: string | null
  country?: string | null
  customer_number?: string | null
  e_invoice_leitweg_id?: string | null
  e_invoice_buyer_reference?: string | null
  e_invoice_order_reference?: string | null
}

type Meta = {
  invoiceNumber?: string
  date?: string
  validUntil?: string
  title?: string
  intro?: string
  taxRate: number
  discount: Discount
  currency?: string
}

function z(n: number) {
  return (Math.round(n * 100) / 100).toFixed(2)
}

function esc(s: string | null | undefined) {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildUBL({
  meta,
  customer,
  supplier,
  totals,
  lines,
}: {
  meta: Required<Pick<Meta, 'invoiceNumber' | 'date' | 'taxRate' | 'currency'>>
  customer: Customer
  supplier: {
    company_name: string
    street: string
    house_number: string
    postal_code: string
    city: string
    country: string
    vat_number: string
    iban: string
    bic: string
    email?: string | null
    phone?: string | null
  }
  totals: {
    net_subtotal: number
    discount_amount: number
    net_after_discount: number
    tax_amount: number
    gross_total: number
  }
  lines: Array<{
    id: number
    description: string
    qty: number
    unit: string
    unitPrice: number
    netLine: number
    taxAmount: number
    grossLine: number
  }>
}) {
  const customizationId =
    'urn:cen.eu:en16931:2017#compliant#urn:fdc:gov.xrechnung.de:2017'
  const profileId = 'urn:fdc:peppol.eu:poacc:billing:3.0'
  const currency = meta.currency

  const endpointId =
    (customer.e_invoice_leitweg_id || '').trim() ||
    (customer.e_invoice_buyer_reference || '').trim() ||
    ''

  const buyerRef = (customer.e_invoice_buyer_reference || '').trim()
  const orderRef = (customer.e_invoice_order_reference || '').trim()

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>${customizationId}</cbc:CustomizationID>
  <cbc:ProfileID>${profileId}</cbc:ProfileID>
  <cbc:ID>${esc(meta.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${esc(meta.date)}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${esc(currency)}</cbc:DocumentCurrencyCode>

  ${buyerRef ? `<cbc:BuyerReference>${esc(buyerRef)}</cbc:BuyerReference>` : ''}

  ${
    orderRef
      ? `
  <cac:OrderReference>
    <cbc:ID>${esc(orderRef)}</cbc:ID>
  </cac:OrderReference>`
      : ''
  }

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${esc(
        supplier.company_name
      )}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${esc(supplier.street)} ${esc(
    supplier.house_number
  )}</cbc:StreetName>
        <cbc:CityName>${esc(supplier.city)}</cbc:CityName>
        <cbc:PostalZone>${esc(supplier.postal_code)}</cbc:PostalZone>
        <cbc:CountrySubentity></cbc:CountrySubentity>
        <cac:Country><cbc:IdentificationCode>${esc(
          supplier.country
        )}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${esc(supplier.vat_number)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity><cbc:RegistrationName>${esc(
        supplier.company_name
      )}</cbc:RegistrationName></cac:PartyLegalEntity>
      ${
        supplier.email || supplier.phone
          ? `
      <cac:Contact>
        ${
          supplier.email
            ? `<cbc:ElectronicMail>${esc(supplier.email!)}</cbc:ElectronicMail>`
            : ''
        }
        ${
          supplier.phone
            ? `<cbc:Telephone>${esc(supplier.phone!)}</cbc:Telephone>`
            : ''
        }
      </cac:Contact>`
          : ''
      }
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      ${
        endpointId
          ? `<cbc:EndpointID schemeID="0204">${esc(
              endpointId
            )}</cbc:EndpointID>`
          : ''
      }
      <cac:PartyName>
        <cbc:Name>${esc(
          customer.company || `${customer.first_name} ${customer.last_name}`
        )}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${esc(
          (customer.street || '') +
            (customer.house_number ? ' ' + customer.house_number : '')
        )}</cbc:StreetName>
        <cbc:CityName>${esc(customer.city || '')}</cbc:CityName>
        <cbc:PostalZone>${esc(customer.postal_code || '')}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>${esc(
          customer.country || 'DE'
        )}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>31</cbc:PaymentMeansCode>
    <cac:PayeeFinancialAccount>
      <cbc:ID>${esc(supplier.iban)}</cbc:ID>
      <cac:FinancialInstitutionBranch>
        <cac:FinancialInstitution><cbc:ID>${esc(
          supplier.bic
        )}</cbc:ID></cac:FinancialInstitution>
      </cac:FinancialInstitutionBranch>
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>

  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${esc(
      currency
    )}">${z(totals.tax_amount)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${esc(
        currency
      )}">${z(totals.net_after_discount)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${esc(
        currency
      )}">${z(totals.tax_amount)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${z(meta.taxRate)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${esc(
      currency
    )}">${z(totals.net_subtotal)}</cbc:LineExtensionAmount>
    ${
      totals.discount_amount > 0
        ? `<cbc:AllowanceTotalAmount currencyID="${esc(
            currency
          )}">${z(totals.discount_amount)}</cbc:AllowanceTotalAmount>`
        : ''
    }
    <cbc:TaxExclusiveAmount currencyID="${esc(
      currency
    )}">${z(totals.net_after_discount)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${esc(
      currency
    )}">${z(totals.gross_total)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${esc(
      currency
    )}">${z(totals.gross_total)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  ${lines
    .map(
      (l) => `
  <cac:InvoiceLine>
    <cbc:ID>${l.id}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${esc(
      l.unit || 'C62'
    )}">${z(l.qty)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${esc(
      currency
    )}">${z(l.netLine)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${esc(l.description)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${z(meta.taxRate)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${esc(
        currency
      )}">${z(l.unitPrice)}</cbc:PriceAmount>
      <cbc:BaseQuantity unitCode="${esc(
        l.unit || 'C62'
      )}">${z(1)}</cbc:BaseQuantity>
    </cac:Price>
  </cac:InvoiceLine>`
    )
    .join('')}
</Invoice>`
}

export async function POST(req: NextRequest) {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error: uErr,
  } = await supabase.auth.getUser()

  if (uErr || !user) {
    return NextResponse.json({ message: 'Nicht authentifiziert' }, { status: 401 })
  }

  type Body = {
    invoiceNumber?: string
    customer?: Customer
    positions?: Position[]
    meta?: Meta
  }

  const body = (await req.json().catch(() => ({}))) as Body
  let { invoiceNumber, customer, positions, meta } = body

  /* ------------------------------------------------------ */
  /* Fallback: nur invoiceNumber → Invoice + Customer laden  */
  /* ------------------------------------------------------ */

  if (!customer?.id && invoiceNumber) {
    const trimmed = invoiceNumber.trim()

    const {
      data: invoice,
      error: invErr,
    } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user.id)
      .eq('invoice_number', trimmed)
      .maybeSingle()

    if (invErr) {
      console.error('E-INVOICE load error: invoice', invErr)
      return NextResponse.json(
        { message: `Fehler beim Laden der Rechnung: ${invErr.message}` },
        { status: 500 }
      )
    }

    if (!invoice) {
      return NextResponse.json(
        { message: `Rechnung mit Nummer "${trimmed}" nicht gefunden.` },
        { status: 404 }
      )
    }

    if (!(invoice as any).customer_id) {
      return NextResponse.json(
        { message: 'Rechnung hat keinen Kunden zugeordnet.' },
        { status: 400 }
      )
    }

    const {
      data: customerRecord,
      error: custErr,
    } = await supabase
      .from('customers')
      .select(
        `
        id,
        first_name,
        last_name,
        company,
        email,
        phone,
        street,
        house_number,
        postal_code,
        city,
        country,
        customer_number,
        e_invoice_leitweg_id,
        e_invoice_buyer_reference,
        e_invoice_order_reference
      `
      )
      .eq('id', (invoice as any).customer_id)
      .maybeSingle()

    if (custErr) {
      console.error('E-INVOICE load error: customer', custErr)
      return NextResponse.json(
        { message: `Fehler beim Laden des Kunden: ${custErr.message}` },
        { status: 500 }
      )
    }

    if (!customerRecord) {
      return NextResponse.json(
        { message: 'Kunde zur Rechnung nicht gefunden.' },
        { status: 400 }
      )
    }

    customer = customerRecord as Customer

    // -------- Positionen aus invoices.positions (JSON) --------
    const rawPositions = (invoice as any).positions || []
    const arr = Array.isArray(rawPositions) ? rawPositions : []
    positions = arr.map((p: any, idx: number): Position => ({
      type: (p.type as any) || 'item',
      description: p.description || `Position ${idx + 1}`,
      quantity: Number(p.quantity ?? p.qty ?? 0),
      unitPrice: Number(p.unitPrice ?? p.unit_price ?? 0),
      unit: p.unit || p.unit_code || 'C62',
    }))

    const invDiscount = (invoice as any).discount || {}
    const discount: Discount = {
      enabled: Boolean(invDiscount.enabled ?? false),
      label: invDiscount.label || 'Rabatt',
      type: (invDiscount.type || 'percent') as Discount['type'],
      base: (invDiscount.base || 'net') as Discount['base'],
      value: Number(invDiscount.value ?? 0),
    }

    meta = {
      ...(meta || {}),
      invoiceNumber: (invoice as any).invoice_number || invoiceNumber,
      date:
        (invoice as any).invoice_date ||
        (invoice as any).date ||
        meta?.date ||
        new Date().toISOString().slice(0, 10),
      validUntil:
        (invoice as any).due_date ||
        (invoice as any).valid_until ||
        meta?.validUntil,
      title:
        (invoice as any).title ||
        (invoice as any).subject ||
        meta?.title,
      intro:
        (invoice as any).intro ||
        (invoice as any).description ||
        meta?.intro,
      taxRate: Number(
        (invoice as any).tax_rate ??
          meta?.taxRate ??
          0
      ),
      discount,
      currency: (
        (invoice as any).currency ||
        (invoice as any).currency_code ||
        meta?.currency ||
        'EUR'
      ).toUpperCase(),
    }
  }

  if (!customer?.id) {
    return NextResponse.json(
      {
        message:
          'Kunde fehlt. (Weder im Body noch über invoiceNumber gefunden.)',
      },
      { status: 400 }
    )
  }

  if (!positions || !Array.isArray(positions) || positions.length === 0) {
    return NextResponse.json(
      { message: 'Keine Positionen vorhanden.' },
      { status: 400 }
    )
  }

  const [{ data: prof, error: pErr }, { data: bill, error: bErr }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select(
          'id, company_name, street, house_number, postal_code, city, country, vat_number, email, first_name, last_name, website'
        )
        .eq('id', user.id)
        .single(),
      supabase
        .from('billing_settings')
        .select('billing_email, billing_phone, iban, bic')
        .eq('user_id', user.id)
        .single(),
    ])

  if (pErr || !prof) {
    return NextResponse.json(
      { message: 'Profil nicht gefunden.' },
      { status: 400 }
    )
  }
  if (bErr || !bill) {
    return NextResponse.json(
      { message: 'Billing-Settings fehlen.' },
      { status: 400 }
    )
  }

  const company_name =
    prof.company_name ||
    `${prof.first_name || ''} ${prof.last_name || ''}`.trim()
  const required = {
    company_name,
    street: prof.street || '',
    house_number: prof.house_number || '',
    postal_code: prof.postal_code || '',
    city: prof.city || '',
    country: (prof.country || 'DE').toUpperCase(),
    vat_number: (prof.vat_number || '').toUpperCase(),
    iban: (bill.iban || '').replace(/\s+/g, ''),
    bic: (bill.bic || '').replace(/\s+/g, '').toUpperCase(),
  }

  for (const [k, v] of Object.entries(required)) {
    if (!v) {
      return NextResponse.json(
        {
          message: `Pflichtangabe "${k}" fehlt. Bitte im Onboarding/Profil ergänzen (E-Rechnung).`,
        },
        { status: 400 }
      )
    }
  }

  const taxRate = Number(meta?.taxRate ?? 0)
  const currency = (meta?.currency || 'EUR').toUpperCase()

  const itemLines = positions
    .filter((p) => (p.type ?? 'item') === 'item')
    .filter(
      (p) =>
        Number(p.quantity) > 0 &&
        Number(p.unitPrice) >= 0
    )
    .map((p, idx) => ({
      id: idx + 1,
      description: p.description || 'Position',
      qty: Number(p.quantity || 0),
      unit: p.unit || 'C62',
      unitPrice: Number(p.unitPrice || 0),
    }))

  const net_subtotal = itemLines.reduce(
    (sum, l) => sum + l.qty * l.unitPrice,
    0
  )

  const discount: Discount =
    meta?.discount ||
    ({
      enabled: false,
      label: 'Rabatt',
      type: 'percent',
      base: 'net',
      value: 0,
    } as Discount)

  let discount_amount = 0
  if (discount.enabled && discount.value > 0) {
    if (discount.type === 'percent') {
      const base =
        discount.base === 'gross'
          ? net_subtotal * (1 + taxRate / 100)
          : net_subtotal
      discount_amount = base * (discount.value / 100)
    } else {
      discount_amount = discount.value
    }
  }

  let net_after_discount = net_subtotal
  if (discount_amount > 0) {
    if (discount.base === 'gross') {
      net_after_discount = Math.max(
        0,
        net_subtotal - discount_amount / (1 + taxRate / 100)
      )
    } else {
      net_after_discount = Math.max(0, net_subtotal - discount_amount)
    }
  }

  const tax_amount = Math.max(0, net_after_discount * (taxRate / 100))
  const gross_total = net_after_discount + tax_amount

  const linesForXml = itemLines.map((l) => {
    const netLine = l.qty * l.unitPrice
    const taxAmount = netLine * (taxRate / 100)
    const grossLine = netLine + taxAmount
    return { ...l, netLine, taxAmount, grossLine }
  })

  const invNumber =
    meta?.invoiceNumber ||
    invoiceNumber ||
    `RE-${new Date().toISOString().slice(0, 10)}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`
  const invDate = meta?.date || new Date().toISOString().slice(0, 10)

  const xml = buildUBL({
    meta: { invoiceNumber: invNumber, date: invDate, taxRate, currency },
    customer: customer!,
    supplier: {
      company_name: required.company_name,
      street: required.street,
      house_number: required.house_number,
      postal_code: required.postal_code,
      city: required.city,
      country: required.country,
      vat_number: required.vat_number,
      iban: required.iban,
      bic: required.bic,
      email: bill.billing_email || prof.email || null,
      phone: bill.billing_phone || null,
    },
    totals: {
      net_subtotal,
      discount_amount,
      net_after_discount,
      tax_amount,
      gross_total,
    },
    lines: linesForXml,
  })

  const fileName = `${invNumber}.xml`
  const storagePath = `rechnung/e-rechnung/${user.id}/${fileName}`

  await supabase.storage
    .createBucket('dokumente', {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
    })
    .catch(() => {})

  const uploadRes = await supabase.storage
    .from('dokumente')
    .upload(storagePath, new Blob([xml], { type: 'application/xml' }), {
      contentType: 'application/xml',
      upsert: true,
    })

  if (uploadRes.error) {
    return NextResponse.json(
      { message: uploadRes.error.message },
      { status: 500 }
    )
  }

  const { data: signed, error: sErr } = await supabase.storage
    .from('dokumente')
    .createSignedUrl(storagePath, 60 * 60)

  if (sErr || !signed) {
    return NextResponse.json(
      { message: 'Signed URL fehlgeschlagen.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    filename: fileName,
    storagePath,
    downloadUrl: signed.signedUrl,
  })
}

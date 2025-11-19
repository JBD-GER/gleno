// src/app/api/rechnung/automation-runner/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Buffer } from 'buffer'
import { renderInvoiceAutomationMail } from '@/app/mails/emailTemplates'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Dein Storage-Setup: Bucket "dokumente", Ordner "rechnung"
const INVOICE_BUCKET = 'dokumente'
const INVOICE_PREFIX = 'rechnung'

function todayYYYYMMDD() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type IntervalKey =
  | 'weekly'
  | 'every_2_weeks'
  | 'monthly'
  | 'every_2_months'
  | 'quarterly'
  | 'every_6_months'
  | 'yearly'

function addInterval(
  date: string,
  unit: 'day' | 'week' | 'month' | 'year',
  value: number
) {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (unit === 'day') dt.setUTCDate(dt.getUTCDate() + value)
  if (unit === 'week') dt.setUTCDate(dt.getUTCDate() + value * 7)
  if (unit === 'month') dt.setUTCMonth(dt.getUTCMonth() + value)
  if (unit === 'year') dt.setUTCFullYear(dt.getFullYear() + value)
  const y2 = dt.getUTCFullYear()
  const m2 = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d2 = String(dt.getUTCDate()).padStart(2, '0')
  return `${y2}-${m2}-${d2}`
}

function intervalToUnit(interval: string | null | undefined): {
  unit: 'day' | 'week' | 'month' | 'year'
  value: number
} {
  const key = (interval || 'monthly') as IntervalKey
  switch (key) {
    case 'weekly':
      return { unit: 'day', value: 7 }
    case 'every_2_weeks':
      return { unit: 'day', value: 14 }
    case 'every_2_months':
      return { unit: 'month', value: 2 }
    case 'quarterly':
      return { unit: 'month', value: 3 }
    case 'every_6_months':
      return { unit: 'month', value: 6 }
    case 'yearly':
      return { unit: 'year', value: 1 }
    case 'monthly':
    default:
      return { unit: 'month', value: 1 }
  }
}

function intervalToLabel(interval: string | null | undefined): string {
  const key = (interval || 'monthly') as IntervalKey
  switch (key) {
    case 'weekly':
      return 'wöchentlich'
    case 'every_2_weeks':
      return 'alle 2 Wochen'
    case 'every_2_months':
      return 'alle 2 Monate'
    case 'quarterly':
      return 'vierteljährlich'
    case 'every_6_months':
      return 'halbjährlich'
    case 'yearly':
      return 'jährlich'
    case 'monthly':
    default:
      return 'monatlich'
  }
}

/**
 * Lädt die PDF-Datei direkt aus Supabase Storage
 * und liefert sie als Base64-String zurück.
 */
async function loadInvoicePdfBase64(
  pdfPath: string | null | undefined,
): Promise<string | null> {
  if (!pdfPath) return null

  // pdf_path kann z. B. "INV-1.pdf" ODER "rechnung/INV-1.pdf" sein
  let path = pdfPath.replace(/^\/+/, '')

  const prefix = INVOICE_PREFIX.replace(/^\/+|\/+$/g, '') // "rechnung"
  if (!path.startsWith(prefix + '/')) {
    path = `${prefix}/${path}`
  }

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(INVOICE_BUCKET)
      .download(path)

    if (error || !data) {
      console.error('[Automation] Fehler beim Download des PDFs aus Storage', {
        path,
        error,
      })
      return null
    }

    const arrayBuf = await (data as any).arrayBuffer()
    const buf = Buffer.from(arrayBuf)
    return buf.toString('base64')
  } catch (e) {
    console.error('[Automation] Unerwarteter Fehler beim PDF-Download', e)
    return null
  }
}

/**
 * Versendet die Rechnungsmail direkt über die Brevo-API inkl. PDF-Anhang.
 */
async function sendInvoiceMailWithAttachmentBrevo(opts: {
  to: string
  subject: string
  html: string
  pdfPath?: string | null
  invoiceNumber: string
}) {
  const { to, subject, html, pdfPath, invoiceNumber } = opts

  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.error('[Automation] BREVO_API_KEY fehlt – Mailversand abgebrochen')
    return
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@gleno.io'
  const senderName = process.env.BREVO_SENDER_NAME || 'GLENO'

  let attachment: { name: string; content: string }[] | undefined

  if (pdfPath) {
    const base64 = await loadInvoicePdfBase64(pdfPath)
    if (base64) {
      attachment = [
        {
          name: `Rechnung-${invoiceNumber}.pdf`,
          content: base64,
        },
      ]
    }
  }

  const payload: any = {
    sender: {
      email: senderEmail,
      name: senderName,
    },
    to: [{ email: to }],
    subject,
    htmlContent: html,
    textContent: `Neue Rechnung ${invoiceNumber} von GLENO`,
  }

  if (attachment) {
    // Brevo-API: Feld heißt "attachment"
    payload.attachment = attachment
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    console.error('[Automation] Brevo-Send fehlgeschlagen', {
      status: res.status,
      body: txt,
    })
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const urlToken = url.searchParams.get('token')
    const headerToken = req.headers.get('authorization')?.replace('Bearer ', '')
    const token = urlToken || headerToken || ''

    if (
      process.env.INVOICE_AUTOMATION_SECRET &&
      token !== process.env.INVOICE_AUTOMATION_SECRET
    ) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const today = todayYYYYMMDD()

    const { data: automations, error } = await supabaseAdmin
      .from('invoice_automations')
      .select(
        'id, user_id, source_invoice_id, next_run_date, end_date, active, interval'
      )
      .eq('active', true)
      .lte('next_run_date', today)

    if (error) throw error
    if (!automations || automations.length === 0) {
      return NextResponse.json({ message: 'nothing to do' })
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
      'http://localhost:3000'

    const cookieHeader = req.headers.get('cookie') || ''

    let successCount = 0
    let errorCount = 0

    for (const a of automations) {
      try {
        // 1) Ursprungsvorlage holen
        const { data: invoice, error: invErr } = await supabaseAdmin
          .from('invoices')
          .select(
            'id, user_id, customer_id, title, intro, tax_rate, positions, discount, invoice_number, net_subtotal, gross_total'
          )
          .eq('id', a.source_invoice_id)
          .single()

        if (invErr || !invoice) throw invErr || new Error('invoice not found')

        // 2) Kunde inkl. Opt-In
        const { data: customer, error: custErr } = await supabaseAdmin
          .from('customers')
          .select(
            'id, email, first_name, last_name, company, auto_send_invoices'
          )
          .eq('id', invoice.customer_id)
          .single()

        if (custErr || !customer)
          throw custErr || new Error('customer not found')

        // 3) Billing-Template
        const { data: billingSettings, error: bsErr } = await supabaseAdmin
          .from('billing_settings')
          .select('template')
          .eq('user_id', invoice.user_id)
          .single()

        if (bsErr || !billingSettings)
          throw bsErr || new Error('billing settings not found')

        const runDate = (a.next_run_date as string) || today
        const idempotencyKey = `${a.id}_${runDate}`

        // 4) Neue Rechnung generieren
        const res = await fetch(`${baseUrl}/api/rechnung/generate-invoice`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          },
          body: JSON.stringify({
            customer,
            meta: {
              date: runDate,
              title: invoice.title,
              intro: invoice.intro,
              taxRate: invoice.tax_rate,
              billingSettings: { template: billingSettings.template },
              discount: invoice.discount,
              commit: true,
              idempotencyKey,
            },
            positions: invoice.positions ?? [],
          }),
        })

        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(`generate-invoice failed: ${res.status} ${text}`)
        }

        // 5) Neu erzeugte Rechnung über idempotency_key finden
        const { data: newInvoice, error: newInvErr } = await supabaseAdmin
          .from('invoices')
          .select(
            'id, user_id, customer_id, invoice_number, gross_total, date, pdf_path'
          )
          .eq('user_id', invoice.user_id)
          .eq('customer_id', invoice.customer_id)
          .eq('idempotency_key', idempotencyKey)
          .single()

        if (newInvErr || !newInvoice) {
          throw newInvErr || new Error('generated invoice not found')
        }

        // 6) Partner-Profil für Anzeigenamen
        const { data: prof } = await supabaseAdmin
          .from('profiles')
          .select('company_name, first_name, last_name')
          .eq('id', invoice.user_id)
          .maybeSingle()

        const partnerName =
          prof?.company_name ||
          [prof?.first_name, prof?.last_name].filter(Boolean).join(' ') ||
          'GLENO-Partner'

        const customerName =
          customer.company ||
          [customer.first_name, customer.last_name].filter(Boolean).join(' ') ||
          'Kundin / Kunde'

        const runDateLabel = newInvoice.date
          ? new Date(newInvoice.date as string).toLocaleDateString('de-DE')
          : new Date().toLocaleDateString('de-DE')

        const intervalLabelStr = intervalToLabel(a.interval as string | null)

        // 7) Versand-Entscheidung: wir blocken NUR bei explizitem Opt-Out (false)
        const hasEmail = !!customer.email
        const explicitOptOut = customer.auto_send_invoices === false

        console.log('[Automation] Versand-Check', {
          customerId: customer.id,
          email: customer.email,
          auto_send_invoices: customer.auto_send_invoices,
          hasEmail,
          explicitOptOut,
        })

        if (hasEmail && !explicitOptOut) {
          const html = renderInvoiceAutomationMail({
            customerName,
            partnerName,
            amountGross: newInvoice.gross_total ?? null,
            invoiceNumber: newInvoice.invoice_number,
            intervalLabel: intervalLabelStr,
            runDate: runDateLabel,
          })

          const subject = `Neue Rechnung von ${partnerName} über GLENO`

          await sendInvoiceMailWithAttachmentBrevo({
            to: customer.email as string,
            subject,
            html,
            pdfPath: newInvoice.pdf_path,
            invoiceNumber: newInvoice.invoice_number,
          })

          console.log('[Automation] Rechnungsmail ausgelöst', {
            customerId: customer.id,
            invoiceId: newInvoice.id,
            invoiceNumber: newInvoice.invoice_number,
          })
        } else {
          console.log('[Automation] Versand übersprungen', {
            customerId: customer.id,
            reason: !hasEmail
              ? 'keine E-Mail-Adresse hinterlegt'
              : 'auto_send_invoices === false (Opt-Out)',
          })
        }

        // 8) Nächsten Lauf / Deaktivierung setzen
        let newActive = a.active as boolean
        let nextRun: string | null = null
        const { unit, value } = intervalToUnit(a.interval as string | null)

        if (a.end_date && runDate >= a.end_date) {
          newActive = false
        } else {
          nextRun = addInterval(runDate, unit, value)
        }

        await supabaseAdmin
          .from('invoice_automations')
          .update({
            last_run_date: runDate,
            next_run_date: nextRun,
            active: newActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', a.id)

        successCount++
      } catch (err) {
        console.error('automation error', a.id, err)
        errorCount++
      }
    }

    return NextResponse.json({ ok: true, successCount, errorCount })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json(
      { message: err?.message || 'automation failed' },
      { status: 500 }
    )
  }
}

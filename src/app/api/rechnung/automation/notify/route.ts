// src/app/api/rechnung/automation/notify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { renderInvoiceAutomationMail } from '@/app/mails/emailTemplates'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// HIER hängst du später deinen echten Mailversand mit Anhang dran
async function sendInvoiceMailWithAttachment(opts: {
  to: string
  subject: string
  html: string
  pdfPath?: string | null
  invoiceNumber: string
}) {
  const { to, subject, html, pdfPath, invoiceNumber } = opts

  // Falls du (noch) keinen Mailer angebunden hast:
  if (!process.env.RESEND_API_KEY) {
    console.log('[MAIL-STUB] Würde Rechnungsmail senden', {
      to,
      subject,
      pdfPath,
      invoiceNumber,
    })
    return
  }

  // Beispiel mit Resend (anpassen, wenn du was anderes nutzt)
  const apiKey = process.env.RESEND_API_KEY
  const from =
    process.env.INVOICE_FROM_EMAIL || 'GLENO Rechnungen <rechnungen@gleno.de>'

  // Falls pdfPath kein voller URL ist, baue ihn (Bucket-Namen ggf. anpassen)
  let attachmentUrl: string | undefined
  if (pdfPath) {
    if (pdfPath.startsWith('http')) {
      attachmentUrl = pdfPath
    } else if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')
      // TODO: 'billing' durch deinen echten Bucketnamen ersetzen
      attachmentUrl = `${base}/storage/v1/object/public/billing/${pdfPath.replace(
        /^\/+/,
        ''
      )}`
    }
  }

  // Hier einfaches fetch gegen Resend-API (du kannst auch das offizielle SDK nutzen)
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      attachments: attachmentUrl
        ? [
            {
              filename: `Rechnung-${invoiceNumber}.pdf`,
              path: attachmentUrl,
            },
          ]
        : [],
    }),
  })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ message: 'Nicht eingeloggt' }, { status: 401 })
    }

    const body = await req.json()
    const { invoiceNumber, to, subject, text, preview } = body as {
      invoiceNumber?: string
      to?: string
      subject?: string
      text?: string
      preview?: boolean
    }

    if (!invoiceNumber) {
      return NextResponse.json(
        { message: 'invoiceNumber erforderlich' },
        { status: 400 }
      )
    }

    const { data: invoice, error: invErr } = await supabaseAdmin
      .from('invoices')
      .select(
        'id, user_id, customer_id, invoice_number, gross_total, date, pdf_path'
      )
      .eq('user_id', user.id)
      .eq('invoice_number', invoiceNumber)
      .maybeSingle()

    if (invErr || !invoice) {
      return NextResponse.json(
        { message: 'Rechnung nicht gefunden' },
        { status: 404 }
      )
    }

    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('email, first_name, last_name, company')
      .eq('id', invoice.customer_id)
      .maybeSingle()

    if (!customer?.email && !to) {
      return NextResponse.json(
        { message: 'Keine Kunden-E-Mail hinterlegt' },
        { status: 400 }
      )
    }

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
      customer?.company ||
      [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') ||
      'Kundin / Kunde'

    const runDate = invoice.date
      ? new Date(invoice.date as string).toLocaleDateString('de-DE')
      : new Date().toLocaleDateString('de-DE')

    const finalTo = to || (customer?.email as string)
    const finalSubject =
      subject || `Neue Rechnung von ${partnerName} über GLENO`

    const html = renderInvoiceAutomationMail({
      customerName,
      partnerName,
      amountGross: invoice.gross_total ?? null,
      invoiceNumber: invoice.invoice_number,
      intervalLabel: 'wiederkehrend',
      runDate,
    })

    // PREVIEW-MODUS: Nur HTML zurückgeben, KEIN Versand
    if (preview) {
      return NextResponse.json({
        ok: true,
        to: finalTo,
        subject: finalSubject,
        html,
      })
    }

    // ECHTER VERSAND (mit Anhang, falls vorhanden)
    await sendInvoiceMailWithAttachment({
      to: finalTo,
      subject: finalSubject,
      html,
      pdfPath: invoice.pdf_path,
      invoiceNumber: invoice.invoice_number,
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json(
      { message: err?.message || 'Fehler beim E-Mail Versand' },
      { status: 500 }
    )
  }
}

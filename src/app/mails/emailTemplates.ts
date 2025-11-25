// src/app/mails/emailTemplates.ts
// Feste HTML-Templates (in Anlehnung an dein Layout)

type PartnerCtx = {
  // Besucher/Nutzer (Formularabsender)
  name: string
  email: string
  phone?: string
  message: string

  // Partner (Website-Betreiber)
  partnerName: string // Firmenname ODER Vor- & Nachname
  partnerAddress?: string
  partnerPhone?: string
  partnerEmail?: string
  websiteTitle?: string
}

// Deine Firmendaten (Footer)
const BRAND = {
  name: 'GLENO',
  supportEmail: 'support@gleno.de',
  phone: '+49 5035 3169991',
  legalNote: '© GLENO – Server in der EU • DSGVO-konform',
}

const baseWrap = (preheader: string, title: string, contentHtml: string) => `<!doctype html>
<html lang="de" style="margin:0;padding:0">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f6f9fc;color:#0a0a0a">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f6f9fc;margin:0;padding:24px 0;">
    <tr>
      <td align="center" style="padding:0 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e6edf5;">
          <tr>
            <td align="center" style="padding:28px 28px 8px 28px;">
              <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;color:#0a1b40;font-weight:700;letter-spacing:.2px;">
                ${BRAND.name}
              </div>
            </td>
          </tr>
          ${contentHtml}
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:14px auto 0;">
          <tr>
            <td align="center" style="padding:12px 10px;">
              <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:12px;line-height:1.6;color:#94a3b8;">
                Brauchst du Hilfe? Schreib uns an
                <a href="mailto:${BRAND.supportEmail}" style="color:#0a1b40;text-decoration:underline;">${BRAND.supportEmail}</a>
                oder ruf an: ${BRAND.phone.replace(/\s/g, '&nbsp;')}
              </p>
              <p style="margin:6px 0 0 0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:11px;line-height:1.6;color:#a1a1aa;">
                ${BRAND.legalNote}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

/** 1) Danke-Mail an den Formularabsender (Partner-Kontext) */
export function renderThankYou(ctx: PartnerCtx) {
  const pre = `Danke für Ihre Anfrage – ${ctx.partnerName} ist Partner von ${BRAND.name}.`
  const title = 'Danke für Ihre Anfrage'
  const lines: string[] = []

  if (ctx.partnerName) lines.push(`<div><b>Partner:</b> ${ctx.partnerName}</div>`)
  if (ctx.partnerAddress)
    lines.push(`<div><b>Adresse:</b> ${ctx.partnerAddress}</div>`)
  if (ctx.partnerPhone)
    lines.push(`<div><b>Telefon:</b> ${ctx.partnerPhone}</div>`)
  if (ctx.partnerEmail)
    lines.push(`<div><b>E-Mail:</b> ${ctx.partnerEmail}</div>`)

  const content = `
  <tr>
    <td align="center" style="padding:8px 28px 0 28px;">
      <h1 style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:22px;line-height:1.35;color:#0b1220;font-weight:800;">
        Danke für Ihre Anfrage
      </h1>
    </td>
  </tr>

  <tr>
    <td style="padding:12px 28px 8px 28px;">
      <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:15px;line-height:1.6;color:#334155;">
        Wir haben Ihre Nachricht erhalten und leiten sie an unseren Partner weiter:
      </p>
      <div style="margin:12px 0 0 0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;line-height:1.6;color:#0b1220;">
        ${lines.join('')}
      </div>
    </td>
  </tr>

  <tr>
    <td style="padding:8px 28px 0 28px;">
      <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;line-height:1.6;color:#334155;">
        <b>Ihre Nachricht:</b><br/>
        ${escapeHtml(ctx.message).replace(/\n/g, '<br/>')}
      </p>
    </td>
  </tr>

  <tr>
    <td style="padding:16px 28px 24px 28px;">
      <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:12px;line-height:1.6;color:#64748b;">
        Diese E-Mail wurde von ${BRAND.name} im Auftrag unseres Partners versendet.
      </p>
    </td>
  </tr>`

  return baseWrap(pre, title, content)
}

/** 2) Interne Benachrichtigung an den Betreiber (Partner-Kontext) */
export function renderNotify(ctx: PartnerCtx) {
  const pre = `Neue Website-Anfrage über ${ctx.websiteTitle ?? 'Website'}`
  const title = 'Neue Website-Anfrage'
  const content = `
  <tr>
    <td align="center" style="padding:8px 28px 0 28px;">
      <h1 style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:22px;line-height:1.35;color:#0b1220;font-weight:800;">
        Neue Website-Anfrage
      </h1>
    </td>
  </tr>
  <tr>
    <td style="padding:12px 28px 8px 28px;">
      <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;line-height:1.6;color:#334155;">
        <b>Absender:</b> ${escapeHtml(ctx.name)} &lt;${escapeHtml(
    ctx.email
  )}&gt;${ctx.phone ? `, Tel: ${escapeHtml(ctx.phone)}` : ''}
      </p>
      <p style="margin:12px 0 0 0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;line-height:1.6;color:#334155;">
        <b>Nachricht:</b><br/>
        ${escapeHtml(ctx.message).replace(/\n/g, '<br/>')}
      </p>
    </td>
  </tr>`
  return baseWrap(pre, title, content)
}

/* -------------------------------------------------------------------------- */
/* NEU: Templates für GbR-Starterpaket                                        */
/* -------------------------------------------------------------------------- */

export function renderGbrStarterpaketMail(opts: { email: string }) {
  const pre = 'Ihr Starterpaket zur Gründung einer GbR – Unterlagen im Anhang.'
  const title = 'Ihr Starterpaket „GbR gründen 2025“'

  const content = `
  <tr>
    <td align="center" style="padding:8px 28px 0 28px;">
      <h1 style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:22px;line-height:1.35;color:#0b1220;font-weight:800;">
        Ihr Starterpaket zur GbR-Gründung
      </h1>
    </td>
  </tr>

  <tr>
    <td style="padding:12px 28px 4px 28px;">
      <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;line-height:1.6;color:#334155;">
        vielen Dank für Ihr Interesse an der Gründung einer GbR. Sie finden im Anhang dieser E-Mail alle Unterlagen,
        die wir auf der Website angekündigt haben.
      </p>
    </td>
  </tr>

  <tr>
    <td style="padding:4px 28px 4px 28px;">
      <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;line-height:1.6;color:#334155;">
        <b>Verfügbar im Anhang:</b>
      </p>
      <ul style="margin:8px 0 0 18px;padding:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;color:#334155;">
        <li>PDF-Leitfaden „GbR gründen 2025 – Der komplette Überblick“</li>
        <li>Einfache Checkliste „Gründung einer GbR“</li>
        <li>Muster-Gesellschaftsvertrag (Word, editierbar)</li>
        <li>Excel-Vorlage zur Finanzplanung 2025 (Gründungs- &amp; laufende Kosten)</li>
        <li>Vier Wochenpläne (Woche 1–4) für die ersten 30 Tage nach Gründung</li>
      </ul>
    </td>
  </tr>

  <tr>
    <td style="padding:8px 28px 4px 28px;">
      <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;line-height:1.6;color:#334155;">
        Nutzen Sie die Dokumente gern als Arbeitsunterlagen. Sie können Inhalte anpassen, ergänzen oder mit Ihrem
        Steuerberater bzw. Rechtsanwalt durchgehen.
      </p>
    </td>
  </tr>

  <tr>
    <td style="padding:8px 28px 24px 28px;">
      <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:13px;line-height:1.6;color:#64748b;">
        Hinweis: Das Starterpaket ersetzt keine individuelle Steuer- oder Rechtsberatung. Es unterstützt Sie dabei,
        einen strukturierten Überblick zu behalten und die nächsten Schritte besser planen zu können.
      </p>
    </td>
  </tr>`

  return baseWrap(pre, title, content)
}

export function renderGbrLeadInternal(opts: {
  email: string
  phone?: string
}) {
  const pre = 'Neue Lead-Anfrage für das GbR-Starterpaket.'
  const title = 'Neuer GbR-Starterpaket-Lead'

  const content = `
  <tr>
    <td align="center" style="padding:8px 28px 0 28px;">
      <h1 style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:22px;line-height:1.35;color:#0b1220;font-weight:800;">
        Neuer Lead: GbR-Starterpaket
      </h1>
    </td>
  </tr>

  <tr>
    <td style="padding:12px 28px 16px 28px;">
      <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;line-height:1.6;color:#334155;">
        Es wurde das Starterpaket zur GbR-Gründung angefordert.
      </p>
      <p style="margin:12px 0 0 0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;line-height:1.6;color:#334155;">
        <b>E-Mail:</b> ${escapeHtml(opts.email)}<br/>
        <b>Telefon:</b> ${opts.phone ? escapeHtml(opts.phone) : '–'}
      </p>
    </td>
  </tr>`

  return baseWrap(pre, title, content)
}

/* -------------------------------------------------------------------------- */
/* NEU: Feedback-Mail aus dem Dashboard                                       */
/* -------------------------------------------------------------------------- */

export function renderFeedbackMail(opts: { message: string; userEmail?: string }) {
  const pre = 'Neues Feedback aus dem GLENO-Dashboard.'
  const title = 'Neues GLENO-Feedback'

  const content = `
  <tr>
    <td align="center" style="padding:8px 28px 0 28px;">
      <h1 style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:22px;line-height:1.35;color:#0b1220;font-weight:800;">
        Neues Feedback aus GLENO
      </h1>
    </td>
  </tr>

  <tr>
    <td style="padding:12px 28px 4px 28px;">
      <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;line-height:1.6;color:#334155;">
        Es wurde direkt aus dem Dashboard Feedback gesendet.
      </p>
    </td>
  </tr>

  <tr>
    <td style="padding:8px 28px 20px 28px;">
      <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;line-height:1.6;color:#334155;">
        <b>Nachricht:</b><br/>
        ${escapeHtml(opts.message).replace(/\n/g, '<br/>')}
      </p>
    </td>
  </tr>`

  return baseWrap(pre, title, content)
}

// src/app/mails/emailTemplates.ts

export function renderWebsiteDomainRequestInternalMail(opts: {
  userEmail: string
  websiteTitle: string
  websiteSlug?: string | null
}) {
  const pre = 'Neue Anfrage für eine professionelle Website inkl. eigener Domain.'
  const title = 'Neue Anfrage: Website + eigene Domain'

  const slugLine = opts.websiteSlug
    ? `/w/${escapeHtml(opts.websiteSlug)}`
    : '–'

  const content = `
  <tr>
    <td align="center" style="padding:8px 28px 0 28px;">
      <h1 style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:22px;line-height:1.35;color:#0b1220;font-weight:800;">
        Neue Anfrage: Website inkl. eigener Domain
      </h1>
    </td>
  </tr>

  <tr>
    <td style="padding:12px 28px 8px 28px;">
      <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;line-height:1.6;color:#334155;">
        Es wurde über das GLENO-Dashboard eine Anfrage für eine professionelle Website inkl. eigener Domain gestellt.
      </p>
    </td>
  </tr>

  <tr>
    <td style="padding:8px 28px 16px 28px;">
      <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;line-height:1.6;color:#334155;">
        <b>Nutzer-E-Mail:</b> ${escapeHtml(opts.userEmail)}<br/>
        <b>Website-Titel:</b> ${escapeHtml(opts.websiteTitle)}<br/>
        <b>Slug / URL:</b> ${slugLine}
      </p>
    </td>
  </tr>

  <tr>
    <td style="padding:8px 28px 24px 28px;">
      <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:13px;line-height:1.6;color:#64748b;">
        Bitte den Nutzer zeitnah kontaktieren, die Anforderungen aufnehmen und ein Angebot für Design, Umsetzung und Domainregistrierung erstellen.
      </p>
    </td>
  </tr>`

  return baseWrap(pre, title, content)
}

/* -------------------------------------------------------------------------- */
/* NEU: Automatisierungs-Rechnungsmail                                        */
/* -------------------------------------------------------------------------- */

export function renderInvoiceAutomationMail(opts: {
  customerName?: string
  partnerName: string
  amountGross?: number | null
  invoiceNumber: string
  intervalLabel?: string
  runDate?: string
}) {
  const pre = `Neue Rechnung von ${opts.partnerName} über GLENO`
  const title = `Neue Rechnung von ${opts.partnerName}`

  const amountStr =
    typeof opts.amountGross === 'number'
      ? new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR',
        }).format(opts.amountGross)
      : '–'

  const interval = opts.intervalLabel || 'wiederkehrend'
  const runDate = opts.runDate || ''

  const content = `
  <tr>
    <td align="center" style="padding:8px 28px 0 28px;">
      <h1 style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:22px;line-height:1.35;color:#0b1220;font-weight:800;">
        Ihre neue Rechnung
      </h1>
    </td>
  </tr>

  <tr>
    <td style="padding:12px 28px 4px 28px;">
      <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;line-height:1.6;color:#334155;">
        Hallo ${escapeHtml(opts.customerName || 'Kundin / Kunde')},
      </p>
      <p style="margin:8px 0 0 0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;line-height:1.6;color:#334155;">
        ${escapeHtml(opts.partnerName)} hat eine neue Rechnung für Sie erstellt.
        Die Rechnung wurde automatisch über die <b>GLENO-Plattform</b> erzeugt.
      </p>
    </td>
  </tr>

  <tr>
    <td style="padding:8px 28px 4px 28px;">
      <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;line-height:1.6;color:#334155;">
        <b>Rechnungsnummer:</b> ${escapeHtml(opts.invoiceNumber)}<br/>
        <b>Betrag:</b> ${amountStr}<br/>
        <b>Intervall:</b> ${escapeHtml(interval)}${
          runDate
            ? `<br/><b>Erstelldatum:</b> ${escapeHtml(runDate)}`
            : ''
        }
      </p>
    </td>
  </tr>

  <tr>
    <td style="padding:8px 28px 24px 28px;">
      <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:13px;line-height:1.6;color:#64748b;">
        Die Rechnung ist dieser E-Mail als PDF beigefügt (sofern vom ausstellenden Partner bereitgestellt).
        Bei Fragen zur Rechnung wenden Sie sich bitte direkt an Ihren Dienstleister
        <b>${escapeHtml(opts.partnerName)}</b>.
      </p>
    </td>
  </tr>`

  return baseWrap(pre, title, content)
}

/* -------------------------------------------------------------------------- */
/* NEU: Zoom-Beratungs-Termine                                                */
/* -------------------------------------------------------------------------- */

export function renderZoomBookingCustomerMail(opts: {
  name?: string
  email: string
  startTimeFormatted: string
  joinUrl: string
}) {
  const pre = 'Ihr GLENO Zoom-Beratungstermin – Zugangsdaten & Kalenderlink.'
  const title = 'Ihr GLENO Zoom-Beratungstermin'

  const greetingName = opts.name?.trim() || 'Guten Tag'

  const content = `
  <tr>
    <td align="center" style="padding:8px 28px 0 28px;">
      <h1 style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:22px;line-height:1.35;color:#0b1220;font-weight:800;">
        Ihr GLENO Beratungstermin per Zoom
      </h1>
    </td>
  </tr>

  <tr>
    <td style="padding:12px 28px 4px 28px;">
      <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;line-height:1.6;color:#334155;">
        ${escapeHtml(greetingName)},
      </p>
      <p style="margin:8px 0 0 0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;line-height:1.6;color:#334155;">
        vielen Dank für Ihre Buchung. Hier finden Sie die Daten zu Ihrem persönlichen GLENO-Beratungstermin:
      </p>
    </td>
  </tr>

  <tr>
    <td style="padding:10px 28px 4px 28px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
        <tr>
          <td style="padding:10px 14px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;">
            <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;line-height:1.6;color:#0b1220;">
              <b>Datum &amp; Uhrzeit:</b> ${escapeHtml(opts.startTimeFormatted)} (Europe/Berlin)<br/>
              <b>Format:</b> Online-Beratung per Zoom
            </p>
            <p style="margin:10px 0 0 0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;line-height:1.6;">
              <a href="${escapeHtml(
                opts.joinUrl
              )}" style="display:inline-block;padding:10px 18px;margin-top:2px;border-radius:999px;background:#0a1b40;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;">
                Zoom-Meeting betreten
              </a>
            </p>
            <p style="margin:10px 0 0 0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:12px;line-height:1.6;color:#64748b;">
              Hinweis: Der Termin ist zusätzlich als Kalenderdatei (.ics) im Anhang hinterlegt. Sie können diese in Ihren Kalender (z.&nbsp;B. Outlook, Google Kalender, Apple Kalender) importieren.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:12px 28px 22px 28px;">
      <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:13px;line-height:1.6;color:#64748b;">
        Falls Sie den Termin verschieben oder stornieren möchten, antworten Sie einfach auf diese E-Mail.
      </p>
    </td>
  </tr>`

  return baseWrap(pre, title, content)
}

export function renderZoomBookingInternalMail(opts: {
  name?: string
  email: string
  phone?: string
  note?: string
  startTimeFormatted: string
  joinUrl: string
  meetingId: string | number
}) {
  const pre = 'Neue GLENO-Zoom-Beratung über die öffentliche Buchungsseite.'
  const title = 'Neue Zoom-Beratung gebucht'

  const content = `
  <tr>
    <td align="center" style="padding:8px 28px 0 28px;">
      <h1 style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:22px;line-height:1.35;color:#0b1220;font-weight:800;">
        Neue GLENO Zoom-Beratung
      </h1>
    </td>
  </tr>

  <tr>
    <td style="padding:12px 28px 8px 28px;">
      <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;line-height:1.6;color:#334155;">
        Es wurde ein neuer Termin über die öffentliche Beratungsseite gebucht.
      </p>
    </td>
  </tr>

  <tr>
    <td style="padding:8px 28px 8px 28px;">
      <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;line-height:1.6;color:#334155;">
        <b>Kontakt:</b><br/>
        Name: ${opts.name ? escapeHtml(opts.name) : '–'}<br/>
        E-Mail: ${escapeHtml(opts.email)}<br/>
        Telefon: ${opts.phone ? escapeHtml(opts.phone) : '–'}
      </p>
      <p style="margin:10px 0 0 0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;line-height:1.6;color:#334155;">
        <b>Termin:</b><br/>
        Datum &amp; Uhrzeit: ${escapeHtml(opts.startTimeFormatted)} (Europe/Berlin)<br/>
        Meeting-ID: ${escapeHtml(String(opts.meetingId))}<br/>
        Zoom-Link: <a href="${escapeHtml(
          opts.joinUrl
        )}" style="color:#0a1b40;text-decoration:underline;">Meeting öffnen</a>
      </p>
      ${
        opts.note
          ? `<p style="margin:10px 0 0 0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;line-height:1.6;color:#334155;">
        <b>Notiz / Anliegen:</b><br/>
        ${escapeHtml(opts.note).replace(/\n/g, '<br/>')}
      </p>`
          : ''
      }
    </td>
  </tr>`

  return baseWrap(pre, title, content)
}


/* -------------------------------------------------------------------------- */

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) =>
    (
      {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
      } as Record<string, string>
    )[c]
  )
}

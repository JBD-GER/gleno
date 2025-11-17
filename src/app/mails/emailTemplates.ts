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

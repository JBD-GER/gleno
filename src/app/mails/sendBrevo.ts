// src/app/mails/sendBrevo.ts
'use server'

import nodemailer from 'nodemailer'

/** {{key}} Platzhalter ersetzen */
function interpolate(template: string, ctx: Record<string, string>) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => ctx[key] ?? '')
}

/** kleine Mask-Hilfe für Logs */
function mask(s?: string | null) {
  if (!s) return '(leer)'
  return s.length <= 3 ? '***' : s.slice(0, 3) + '***'
}

/**
 * Versendet E-Mails über Brevo SMTP.
 * Erwartet den Empfänger in `to` (Fallback: `email`).
 * Akzeptiert optionale Felder: subject, htmlContent, textContent, replyTo,
 * attachment (base64 Data URL), attachmentName.
 * Alle weiteren Felder werden als Context für {{platzhalter}} genutzt.
 */
export async function sendBrevo(formData: FormData) {
  // Empfänger (NEU: "to" statt "email", um Konflikte mit ctx.email zu vermeiden)
  const to =
    (formData.get('to') as string) ||
    (formData.get('email') as string) || // Fallback für ältere Aufrufer
    ''
  if (!to) throw new Error('Empfängeradresse fehlt.')

  const subject      = (formData.get('subject') as string) ?? ''
  const htmlContent  = (formData.get('htmlContent') as string) ?? ''
  const textContent  = (formData.get('textContent') as string) ?? ''
  const replyTo      = (formData.get('replyTo') as string) || (formData.get('reply_to') as string) || ''
  const attachment   = formData.get('attachment') as string | null
  const attachmentName = formData.get('attachmentName') as string | null

  // Kontext für {{platzhalter}}
  const ctx: Record<string, string> = {}
  formData.forEach((v, k) => { if (typeof v === 'string') ctx[k] = v })

  const finalSubject = interpolate(subject, ctx)
  const finalHtml    = interpolate(htmlContent, ctx)
  const finalText    = textContent ? interpolate(textContent, ctx) : undefined

  // SMTP Konfiguration (ENV)
  const host = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com'
  const port = Number(process.env.BREVO_SMTP_PORT || 587)
  const user = process.env.BREVO_SMTP_USER || 'apikey' // oder dein spezifischer Login
  const pass = process.env.BREVO_SMTP_PASS as string    // dein SMTP-Schlüssel

  const fromEmail = process.env.BREVO_SENDER_EMAIL || 'no-reply@your-domain.tld'
  const fromName  = process.env.BREVO_SENDER_NAME  || 'Software Fliesenleger'

  console.log('[sendBrevo] SMTP config', {
    host, port, user: mask(user), pass: pass ? `(${String(pass).length} chars)` : '(MISSING)'
  })
  console.log('[sendBrevo] From/To', { fromEmail, fromName, to, subject: finalSubject })

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: { user, pass },
    // Extra-Logs aktivieren – nur in Server-Umgebung
    logger: true,
    debug: true,
  })

  const ok = await transporter.verify().catch(e => {
    console.error('[sendBrevo] verify error', e)
    return false
  })
  console.log('[sendBrevo] transporter.verify() =>', ok)

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject: finalSubject,
    html: finalHtml,
    text: finalText,
    replyTo: replyTo || undefined,
    attachments: attachment && attachmentName ? [{
      filename: attachmentName,
      content: Buffer.from(attachment.replace(/^data:.*;base64,/, ''), 'base64'),
      contentType: 'application/pdf'
    }] : undefined,
  })

  console.log('[sendBrevo] sendMail OK', {
    messageId: info?.messageId,
    response: info?.response,
    accepted: info?.accepted,
    rejected: info?.rejected,
    envelope: info?.envelope,
  })

  return {
    ok: true,
    messageId: info?.messageId,
    accepted: info?.accepted,
    rejected: info?.rejected,
    envelope: info?.envelope,
  }
}

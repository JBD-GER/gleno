// src/app/api/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sendBrevo } from '@/app/mails/sendBrevo'
import { renderFeedbackMail } from '@/app/mails/emailTemplates'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { message?: string; userEmail?: string }
      | null

    const message = body?.message?.trim() ?? ''
    const userEmail = body?.userEmail?.trim() || undefined

    // nur noch sehr leichte Validierung
    if (!message || message.length < 2) {
      return NextResponse.json(
        { ok: false, error: 'Bitte gib eine kurze Nachricht ein.' },
        { status: 400 }
      )
    }

    // 1) HTML-Inhalt über dein Template
    const htmlContent = renderFeedbackMail({
      message,
      userEmail,
    })

    // 2) Text-Variante (Fallback)
    const textContent = `Neues Feedback aus dem GLENO-Dashboard:

Von: ${userEmail ?? '-'}
Nachricht:
${message}
`

    // 3) FormData für sendBrevo vorbereiten
    const fd = new FormData()
    fd.set('to', 'support@gleno.de')
    fd.set('subject', 'Neues Feedback aus dem GLENO-Dashboard')
    fd.set('htmlContent', htmlContent)
    fd.set('textContent', textContent)

    await sendBrevo(fd)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[feedback] error', error)
    return NextResponse.json(
      { ok: false, error: 'Fehler beim Versenden der Feedback-E-Mail.' },
      { status: 500 }
    )
  }
}

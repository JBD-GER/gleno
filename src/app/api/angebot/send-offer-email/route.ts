// src/app/api/send-offer-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sendBrevo } from '@/app/mails/sendBrevo'

export async function POST(req: NextRequest) {
  console.log('[/api/send-offer-email] called')
  console.log('BREVO_API_KEY present?', !!process.env.BREVO_API_KEY)

  try {
    const {
      email,
      template,
      subject,
      htmlContent,
      attachment,
      attachmentName
    }: {
      email: string
      template: string
      subject: string
      htmlContent: string
      attachment?: string
      attachmentName?: string
    } = await req.json()

    console.log('Request JSON:', { email, template, subject, htmlContent, attachmentName })

    if (!email) {
      console.warn('No email provided')
      return NextResponse.json({ error: 'E-Mail fehlt' }, { status: 400 })
    }

    const formData = new FormData()
    formData.append('email',       email)
    formData.append('template',    template)
    formData.append('subject',     subject)
    formData.append('htmlContent', htmlContent)
    if (attachment)     formData.append('attachment',     attachment)
    if (attachmentName) formData.append('attachmentName', attachmentName)

    console.log('FormData entries:')
    for (const [k, v] of formData.entries()) {
      console.log(`  ${k}:`, v?.toString().slice(0, 100))
    }

    await sendBrevo(formData)
    console.log('sendBrevo completed successfully')

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error in send-offer-email:', err)
    return NextResponse.json(
      { error: err.message || 'Versand fehlgeschlagen' },
      { status: 500 }
    )
  }
}

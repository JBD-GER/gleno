// src/app/api/website/contact/submit/route.ts
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'
import { sendBrevo } from '@/app/mails/sendBrevo'
import { renderNotify, renderThankYou } from '@/app/mails/emailTemplates'

// helper
const interpolate = (t: string, ctx: Record<string,string>) =>
  t.replace(/{{\s*(\w+)\s*}}/g, (_, k) => ctx[k] ?? '')

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const slug    = String(form.get('slug') || '').trim()
  const name    = String(form.get('name') || '').trim()
  const email   = String(form.get('email') || '').trim()
  const phone   = String(form.get('phone') || '').trim()
  const message = String(form.get('message') || '').trim()

  if (!slug || !name || !email || !message) {
    return NextResponse.json({ message: 'Ungültige Anfrage.' }, { status: 422 })
  }

  const supabase = await supabaseServer()

  const { data: website, error: wErr } = await supabase
    .from('websites')
    .select('id, user_id, slug, title, status, content')
    .eq('slug', slug)
    .single()

  if (wErr || !website || website.status !== 'published') {
    return NextResponse.json({ message: 'Website nicht gefunden/aktiv.' }, { status: 404 })
  }

  const siteTitle = website.title || 'Website'
  const content = (website.content as any) || {}
  const contact = content.contact || {}

  // Empfänger nur aus contact.recipient (oder fallback -> profile.email)
  let recipients: string[] = []
  const recipientsRaw: string = (contact.recipient || '') as string
  if (recipientsRaw) {
    recipients = recipientsRaw.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean)
  } else {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', website.user_id)
      .maybeSingle()
    if (profile?.email) recipients = [profile.email]
  }

  // Admin-Client für DB-Writes
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Kunde anlegen/deduplizieren
  let customerId: string | null = null
  {
    const { data: existing } = await admin
      .from('customers')
      .select('id')
      .eq('user_id', website.user_id)
      .eq('email', email)
      .maybeSingle()

    if (existing?.id) {
      customerId = existing.id
    } else {
      const [first_name, ...rest] = name.split(' ')
      const last_name = rest.join(' ').trim() || '-'
      const { data: created, error: insErr } = await admin
        .from('customers')
        .insert([{
          user_id: website.user_id,
          first_name: first_name || name,
          last_name,
          email,
          phone: phone || null,
          status: 'Lead',
          notes: `Website-Lead über /w/${slug}`,
        }])
        .select('id')
        .single()
      if (insErr) return NextResponse.json({ message: 'Fehler beim Anlegen.' }, { status: 500 })
      customerId = created?.id ?? null
    }
  }

  // Notiz
  if (customerId) {
    await admin.from('customer_notes').insert([{
      user_id: website.user_id,
      customer_id: customerId,
      content:
        `Website-Anfrage (${new Date().toISOString()}):\n\n` +
        `${message}\n\n` +
        `Kontakt: ${name} <${email}>${phone ? `, Tel: ${phone}` : ''}`
    }])
  }

  // Partner-Kontext für Templates
  const partnerCtx = {
    name,
    email,
    phone,
    message,
    partnerName: siteTitle,
    partnerAddress: (contact.address as string) || '',
    partnerPhone: (contact.phone as string) || '',
    partnerEmail: (contact.email as string) || '',
    websiteTitle: siteTitle,
  }

  // 1) Notify an Betreiber
  for (const to of recipients) {
    try {
      const html = renderNotify(partnerCtx)
      const fd = new FormData()
      fd.set('to', to)
      fd.set('subject', `Neue Website-Anfrage`)
      fd.set('htmlContent', html)
      fd.set('replyTo', email) // Antworten an Absender
      await sendBrevo(fd)
    } catch {}
  }

  // 2) Autoreply an Absender
  try {
    const html = renderThankYou(partnerCtx)
    const fd = new FormData()
    fd.set('to', email)
    fd.set('subject', `Danke für Ihre Anfrage`)
    fd.set('htmlContent', html)
    await sendBrevo(fd)
  } catch {}

  // Redirect zurück – mit #kontakt
  const url = new URL(`/w/${slug}?sent=1#kontakt`, request.url)
  return NextResponse.redirect(url, 303)
}

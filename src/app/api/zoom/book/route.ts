// src/app/api/zoom/book/route.ts
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { Buffer } from 'buffer'
import { supabaseAdmin } from '@/lib/supabase-server'
import {
  renderZoomBookingCustomerMail,
  renderZoomBookingInternalMail,
} from '@/app/mails/emailTemplates'

/** Hilfsfunktion: ISO ohne Millisekunden erzwingen */
function normalizeIso(iso: string) {
  const idx = iso.indexOf('.')
  return idx === -1 ? iso : iso.slice(0, idx) + 'Z'
}

async function getZoomAccessToken() {
  const accountId = process.env.ZOOM_ACCOUNT_ID
  const clientId = process.env.ZOOM_CLIENT_ID
  const clientSecret = process.env.ZOOM_CLIENT_SECRET

  if (!accountId || !clientId || !clientSecret) {
    throw new Error('Zoom OAuth-Konfiguration fehlt')
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
      },
    }
  )

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error('Zoom token error', text)
    throw new Error('Zoom Token konnte nicht geholt werden')
  }

  const data = await res.json().catch(() => null)
  if (!data?.access_token) {
    throw new Error('Kein Access-Token von Zoom erhalten')
  }

  return data.access_token as string
}

function buildICS(opts: {
  start: Date
  end: Date
  summary: string
  description: string
  location: string
}) {
  const toICSDate = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GLENO//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@gleno.de`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(opts.start)}`,
    `DTEND:${toICSDate(opts.end)}`,
    `SUMMARY:${opts.summary}`,
    `DESCRIPTION:${opts.description.replace(/\r?\n/g, '\\n')}`,
    `LOCATION:${opts.location}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

const BREVO_API_KEY = process.env.BREVO_API_KEY
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'support@gleno.de'
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'GLENO'

async function sendBrevoMail(params: {
  to: { email: string; name?: string }[]
  subject: string
  html: string
  icsContentBase64?: string
}) {
  if (!BREVO_API_KEY) {
    console.warn('BREVO_API_KEY fehlt – E-Mail-Versand wird übersprungen.')
    return
  }

  const body: any = {
    sender: {
      email: BREVO_SENDER_EMAIL,
      name: BREVO_SENDER_NAME,
    },
    to: params.to,
    subject: params.subject,
    htmlContent: params.html,
  }

  if (params.icsContentBase64) {
    body.attachment = [
      {
        name: 'gleno-beratung.ics',
        content: params.icsContentBase64,
      },
    ]
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    console.error('Brevo mail error', await res.text())
  }
}

/* ----------------------- GET: belegte Slots ----------------------- */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date') // YYYY-MM-DD

    if (!date) {
      return NextResponse.json(
        { error: 'date Parameter fehlt' },
        { status: 400 }
      )
    }

    const supabase = supabaseAdmin

    // Tag in UTC-Spanne aufziehen
    const dayStart = new Date(`${date}T00:00:00.000Z`)
    const dayEnd = new Date(`${date}T23:59:59.999Z`)

    const { data, error } = await supabase
      .from('zoom_bookings')
      .select('start_time')
      .gte('start_time', dayStart.toISOString())
      .lte('start_time', dayEnd.toISOString())

    if (error) {
      console.error('Supabase booked slots error', error)
      return NextResponse.json(
        { error: 'Fehler beim Laden der Slots' },
        { status: 500 }
      )
    }

    const booked = (data ?? [])
      .map((row: any) => row.start_time as string)
      .filter(Boolean)
      .map(normalizeIso)

    return NextResponse.json({ booked })
  } catch (err: any) {
    console.error('ZoomBooking GET Error', err?.message || err)
    return NextResponse.json(
      { error: 'Unbekannter Fehler beim Laden der Slots' },
      { status: 500 }
    )
  }
}

/* ----------------------- POST: Termin buchen ---------------------- */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      firstName,
      lastName,
      email,
      startTime, // ISO-String vom Frontend
      durationMinutes = 30,
      phone,
      note,
    } = body

    if (!email || !startTime) {
      return NextResponse.json(
        { error: 'email und startTime sind Pflichtfelder' },
        { status: 400 }
      )
    }

    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()
    const displayName = fullName || email

    const start = new Date(startTime)
    if (Number.isNaN(start.getTime())) {
      return NextResponse.json(
        { error: 'Ungültiges Startdatum' },
        { status: 400 }
      )
    }

    const end = new Date(start.getTime() + durationMinutes * 60_000)

    // Normalisierte ISO-Strings ohne Millisekunden
    const startIso = normalizeIso(start.toISOString())
    const endIso = normalizeIso(end.toISOString())

    const supabase = supabaseAdmin

    // Slot-Check (kein Double-Booking)
    const { data: existing, error: existingErr } = await supabase
      .from('zoom_bookings')
      .select('id')
      .eq('start_time', startIso)
      .maybeSingle()

    if (existingErr) {
      console.error('Supabase check error', existingErr)
    }

    if (existing) {
      return NextResponse.json(
        {
          error:
            'Dieser Slot wurde gerade bereits gebucht. Bitte wählen Sie einen anderen Termin.',
        },
        { status: 409 }
      )
    }

    const accessToken = await getZoomAccessToken()

    const descriptionLines = [
      'GLENO Zoom-Beratung',
      '',
      `Name: ${fullName || '-'}`,
      `E-Mail: ${email}`,
      `Telefon: ${phone || '-'}`,
      note ? `Notiz: ${note}` : '',
    ].filter(Boolean)

    // Zoom-Meeting erstellen – exakt mit Slotzeit
    const meetingRes = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: `GLENO Beratung mit ${displayName}`,
        type: 2, // Scheduled meeting
        start_time: startIso,
        timezone: 'Europe/Berlin',
        duration: durationMinutes,
        agenda: descriptionLines.join('\n'),
        settings: {
          waiting_room: true,
          join_before_host: false,
          approval_type: 2,
        },
      }),
    })

    const meetingText = await meetingRes.text()

    if (!meetingRes.ok) {
      console.error('Zoom meeting error', meetingText)
      return NextResponse.json(
        { error: 'Zoom-Meeting konnte nicht erstellt werden' },
        { status: 500 }
      )
    }

    const meeting = JSON.parse(meetingText)

    // Buchung speichern
    const { error: insertErr } = await supabase.from('zoom_bookings').insert({
      start_time: startIso,
      end_time: endIso,
      first_name: firstName || null,
      last_name: lastName || null,
      email,
      phone: phone || null,
      note: note || null,
      zoom_meeting_id: String(meeting.id),
      zoom_join_url: meeting.join_url,
      zoom_start_url: meeting.start_url,
    })

    if (insertErr) {
      console.error('Supabase insert error', insertErr)
      if ((insertErr as any).code === '23505') {
        return NextResponse.json(
          {
            error:
              'Dieser Slot wurde gerade bereits gebucht. Bitte wählen Sie einen anderen Termin.',
          },
          { status: 409 }
        )
      }
    }

    const startTimeFormatted = start.toLocaleString('de-DE', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'Europe/Berlin',
    })

    const icsContent = buildICS({
      start,
      end,
      summary: 'GLENO Zoom-Beratung',
      description: `Online-Beratung mit GLENO\nZoom-Link: ${
        meeting.join_url
      }\n\nName: ${fullName || '-'}\nE-Mail: ${email}\nTelefon: ${
        phone || '-'
      }${note ? `\nNotiz: ${note}` : ''}`,
      location: 'Online (Zoom)',
    })

    const icsBase64 = Buffer.from(icsContent, 'utf-8').toString('base64')

    // Mail an Kunde
    const customerHtml = renderZoomBookingCustomerMail({
      name: fullName,
      email,
      startTimeFormatted,
      joinUrl: meeting.join_url,
    })

    await sendBrevoMail({
      to: [{ email, name: displayName }],
      subject: 'Ihr GLENO Zoom-Beratungstermin',
      html: customerHtml,
      icsContentBase64: icsBase64,
    })

    // Interne Mail
    const internalHtml = renderZoomBookingInternalMail({
      name: fullName,
      email,
      phone,
      note,
      startTimeFormatted,
      joinUrl: meeting.join_url,
      meetingId: meeting.id,
    })

    await sendBrevoMail({
      to: [{ email: 'kontakt@gleno.de', name: 'GLENO' }],
      subject: 'Neue GLENO Zoom-Beratung',
      html: internalHtml,
    })

    return NextResponse.json({
      joinUrl: meeting.join_url,
      startUrl: meeting.start_url,
      startTime: startIso,
      meetingId: meeting.id,
    })
  } catch (err: any) {
    console.error('ZoomBooking Error', err?.message || err)
    return NextResponse.json(
      { error: err?.message || 'Unbekannter Fehler beim Buchen' },
      { status: 500 }
    )
  }
}

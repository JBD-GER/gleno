// src/app/api/telephony/voice/route.ts
import { NextResponse } from 'next/server'
import twilio from 'twilio'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function normalizeWsUrl(base: string): string {
  // akzeptiert:
  // - wss://phone.gleno.de
  // - https://phone.gleno.de
  // - wss://phone.gleno.de/twilio
  // - https://phone.gleno.de/twilio
  let b = (base || '').trim().replace(/\/+$/, '')
  if (!b) return ''

  // falls jemand aus Versehen https:// einträgt
  if (b.startsWith('https://')) b = 'wss://' + b.slice('https://'.length)
  if (b.startsWith('http://')) b = 'ws://' + b.slice('http://'.length)

  return b.endsWith('/twilio') ? b : `${b}/twilio`
}

function getPublicUrlFromRequest(req: Request): string {
  const u = new URL(req.url)
  const proto = req.headers.get('x-forwarded-proto') || u.protocol.replace(':', '') || 'https'
  const host =
    req.headers.get('x-forwarded-host') ||
    req.headers.get('host') ||
    u.host

  // Wichtig: Twilio signiert gegen die "vollständige" URL (ohne Query i.d.R.)
  return `${proto}://${host}${u.pathname}`
}

// Optional: im Browser sichtbar, dass POST erwartet wird
export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: 'This endpoint is called by Twilio via HTTP POST (TwiML).',
  })
}

export async function POST(req: Request) {
  const VoiceResponse = twilio.twiml.VoiceResponse
  const twiml = new VoiceResponse()

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    twiml.say('Technischer Fehler beim Verarbeiten des Anrufs.')
    twiml.hangup()
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  }

  // FormData -> Plain Object für Twilio Signatur-Validation
  const params: Record<string, string> = {}
  for (const [k, v] of form.entries()) params[k] = String(v)

  const to = (params.To || '').trim()
  const accountSid = (params.AccountSid || '').trim()

  // Diese kommen bei Twilio Client (Device.connect({ params })) als Request-Params mit
  const profileId = (params.profileId || '').trim()
  const callId = (params.callId || '').trim()

  if (!to || !accountSid) {
    twiml.say('Konfiguration fehlerhaft.')
    twiml.hangup()
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  }

  // Settings holen (inkl. Auth Token für Signatur-Prüfung)
  const { data: settings, error } = await supabaseAdmin
    .from('telephony_settings')
    .select('twilio_caller_id, twilio_auth_token')
    .eq('twilio_account_sid', accountSid)
    .single()

  if (error || !settings?.twilio_caller_id || !settings?.twilio_auth_token) {
    twiml.say('Keine Telefon-Konfiguration für dieses Konto gefunden.')
    twiml.hangup()
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  }

  // ✅ Twilio Request-Signatur validieren (wichtig!)
  const signature = req.headers.get('x-twilio-signature') || ''
  const url = getPublicUrlFromRequest(req)
  const valid = twilio.validateRequest(
    settings.twilio_auth_token,
    signature,
    url,
    params
  )

  if (!valid) {
    // nicht XML nötig – Twilio kann das ab, aber wir geben sauber XML zurück
    twiml.say('Unauthorized.')
    twiml.hangup()
    return new NextResponse(twiml.toString(), {
      status: 403,
      headers: { 'Content-Type': 'text/xml' },
    })
  }

  // 1) Media Stream Start (wss://...)
  const baseWsUrl = (process.env.TELEPHONY_STREAM_WSS_URL || '').trim()
  const secret = (process.env.TELEPHONY_STREAM_SECRET || '').trim()

  if (baseWsUrl) {
    const wsUrl = normalizeWsUrl(baseWsUrl)

    const stream = twiml.start().stream({
      url: wsUrl,
      track: 'both_tracks',
    })

    // Custom Parameters -> kommen im WS Server unter start.customParameters an
    if (secret) stream.parameter({ name: 'secret', value: secret })
    if (profileId) stream.parameter({ name: 'profileId', value: profileId })
    if (callId) stream.parameter({ name: 'callId', value: callId })
    stream.parameter({ name: 'direction', value: 'outbound' })
  }

  // 2) Dial
  const dial = twiml.dial({ callerId: settings.twilio_caller_id })
  dial.number(to)

  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}

// src/app/api/telephony/voice/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function xml(res: any) {
  return new NextResponse(res.toString(), {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  })
}

function baseUrl() {
  // ✅ wichtig: fallback auf gleno.de (ohne www)
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://gleno.de').replace(/\/$/, '')
}

function isE164(n: string) {
  return /^\+\d{6,15}$/.test((n || '').trim())
}

function normalizeWssUrl(url: string) {
  const u = (url || '').trim()
  if (!u) return ''
  // wenn jemand aus Versehen https://... eingetragen hat:
  const fixed = u.replace(/^http(s?):\/\//i, 'wss://')
  // wenn jemand "wss://host" ohne /twilio eingetragen hat, hängen wir /twilio an
  try {
    const parsed = new URL(fixed)
    if (!parsed.pathname || parsed.pathname === '/') parsed.pathname = '/twilio'
    return parsed.toString()
  } catch {
    return fixed
  }
}

export async function POST(req: Request) {
  // Twilio sendet x-www-form-urlencoded
  const bodyText = await req.text()
  const params = new URLSearchParams(bodyText)

  const CallSid = params.get('CallSid') || ''
  const To = (params.get('To') || '').trim() // aus Device.connect params
  const callId = (params.get('callId') || '').trim() // aus Device.connect params
  const profileId = (params.get('profileId') || '').trim() || null

  // ---- Guards (wenn hier was fehlt, beendet Twilio direkt) ----
  if (!callId) {
    const vr = new twilio.twiml.VoiceResponse()
    vr.say({ language: 'de-DE' }, 'Fehler. Call ID fehlt.')
    vr.hangup()
    return xml(vr)
  }

  if (!To || !isE164(To)) {
    const vr = new twilio.twiml.VoiceResponse()
    vr.say(
      { language: 'de-DE' },
      'Fehler. Zielnummer fehlt oder ist ungültig. Bitte Nummer im E 164 Format übergeben.',
    )
    vr.hangup()
    return xml(vr)
  }

  // ---- CallSid in DB mappen, damit StatusCallback später updaten kann ----
  try {
    await supabaseAdmin
      .from('telephony_calls')
      .update({
        twilio_call_sid: CallSid || null,
        result: 'initiated',
      })
      .eq('id', callId)
  } catch {
    // ignore
  }

  // ---- CallerId aus telephony_settings holen (über callId -> created_by) ----
  let callerId: string | undefined = undefined
  try {
    const { data: callRow } = await supabaseAdmin
      .from('telephony_calls')
      .select('created_by')
      .eq('id', callId)
      .single()

    const createdBy = (callRow as any)?.created_by as string | undefined
    if (createdBy) {
      const { data: settings } = await supabaseAdmin
        .from('telephony_settings')
        .select('twilio_caller_id')
        .eq('user_id', createdBy)
        .single()

      const c = (settings as any)?.twilio_caller_id as string | undefined
      if (c && isE164(c)) callerId = c
    }
  } catch {
    // ignore
  }

  if (!callerId) {
    const vr = new twilio.twiml.VoiceResponse()
    vr.say({ language: 'de-DE' }, 'Fehler. Caller ID fehlt in den Telefonie Einstellungen.')
    vr.hangup()
    return xml(vr)
  }

  const vr = new twilio.twiml.VoiceResponse()

  // ✅ Media Stream parallel (NON-blocking): <Start><Stream> ...
  // ❌ NICHT <Connect><Stream>, weil das den Callflow oft blockiert
  const rawWss = process.env.TELEPHONY_STREAM_WSS_URL || ''
  const wssUrl = normalizeWssUrl(rawWss)

  if (wssUrl) {
    // Twilio SDK Typings sind je nach Version nicht perfekt → any cast
    const start = (vr as any).start()
    const s = start.stream({ url: wssUrl })

    // Parameter: müssen im telephony-stream beim "start" als customParameters ankommen
    const streamSecret = (process.env.TELEPHONY_STREAM_SECRET || '').trim()
    if (streamSecret) s.parameter({ name: 'secret', value: streamSecret })
    if (profileId) s.parameter({ name: 'profileId', value: profileId })

    s.parameter({ name: 'callId', value: callId })
    s.parameter({ name: 'direction', value: 'outbound' })
  }

  const b = baseUrl()

  // ✅ StatusCallback serverseitig, damit UI sicher updatet
  const statusUrl =
    `${b}` +
    `/api/telephony/status?callId=${encodeURIComponent(callId)}` +
    (process.env.TELEPHONY_WEBHOOK_SECRET
      ? `&secret=${encodeURIComponent(process.env.TELEPHONY_WEBHOOK_SECRET)}`
      : '')

  // ✅ Action URL (wird nach Dial aufgerufen) -> updated DB als Backup
  const actionUrl =
    `${b}` +
    `/api/telephony/voice/action?callId=${encodeURIComponent(callId)}` +
    (process.env.TELEPHONY_WEBHOOK_SECRET
      ? `&secret=${encodeURIComponent(process.env.TELEPHONY_WEBHOOK_SECRET)}`
      : '')

  // ✅ Jetzt wirklich rauswählen
  const dial = vr.dial({
    callerId, // ✅ wichtig!
    action: actionUrl,
    method: 'POST',
  })

  dial.number(
    {
      statusCallback: statusUrl,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
    },
    To,
  )

  // optional – schadet nicht (nach Dial ist Ende)
  vr.hangup()

  return xml(vr)
}

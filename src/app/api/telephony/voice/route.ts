// src/app/api/telephony/voice/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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

export async function POST(req: Request) {
  // Twilio sendet x-www-form-urlencoded
  const bodyText = await req.text()
  const params = new URLSearchParams(bodyText)

  const CallSid = params.get('CallSid') || ''
  const To = params.get('To') || '' // aus Device.connect params
  const callId = params.get('callId') || '' // aus Device.connect params
  const profileId = params.get('profileId') || null

  if (!callId) {
    const vr = new twilio.twiml.VoiceResponse()
    vr.say({ language: 'de-DE' }, 'Fehler. Call ID fehlt.')
    vr.hangup()
    return xml(vr)
  }

  // CallSid in DB mappen, damit StatusCallback später updaten kann
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

  const vr = new twilio.twiml.VoiceResponse()

  // OPTIONAL: Media Stream parallel (falls du TELEPHONY_STREAM_WSS_URL nutzt)
  if (process.env.TELEPHONY_STREAM_WSS_URL) {
    const connect = vr.connect()
    connect.stream({
      url: process.env.TELEPHONY_STREAM_WSS_URL,
    })
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

  const dial = vr.dial({
    callerId: undefined, // CallerId setzt du in TwiML-App oder hier, je nach Flow
    action: actionUrl,
    method: 'POST',
  })

  // Zielnummer (To) – kommt aus deinem Device.connect({params:{To}})
  dial.number(
    {
      statusCallback: statusUrl,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
    },
    To
  )

  // wenn Dial fertig ist, soll die WebRTC-Leg nicht offen bleiben
  vr.hangup()

  return xml(vr)
}

// src/app/api/telephony/voice/action/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import twilio from 'twilio'
import { createClient } from '@supabase/supabase-js'

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

function asIsoNow() {
  return new Date().toISOString()
}

export async function POST(req: Request) {
  const url = new URL(req.url)
  const callId = (url.searchParams.get('callId') || '').trim()
  const secret = (url.searchParams.get('secret') || '').trim()

  // einfacher Schutz
  if (process.env.TELEPHONY_WEBHOOK_SECRET) {
    if (!secret || secret !== process.env.TELEPHONY_WEBHOOK_SECRET) {
      const vr = new twilio.twiml.VoiceResponse()
      vr.hangup()
      return xml(vr)
    }
  }

  // Twilio sendet x-www-form-urlencoded
  const bodyText = await req.text()
  const p = new URLSearchParams(bodyText)

  const CallSid = p.get('CallSid') || null

  // Dial Action Params:
  // DialCallStatus: completed|busy|no-answer|failed
  // DialCallDuration: seconds (string)
  const DialCallStatus = p.get('DialCallStatus') || null
  const DialCallDurationRaw = p.get('DialCallDuration') || null
  const durationSec = DialCallDurationRaw ? Number(DialCallDurationRaw) : null

  const patch: any = {
    ended_at: asIsoNow(),
    result: DialCallStatus ?? 'completed',
  }

  if (typeof durationSec === 'number' && !Number.isNaN(durationSec)) {
    patch.duration_sec = durationSec
  }

  try {
    if (callId) {
      await supabaseAdmin.from('telephony_calls').update(patch).eq('id', callId)
    } else if (CallSid) {
      await supabaseAdmin.from('telephony_calls').update(patch).eq('twilio_call_sid', CallSid)
    }
  } catch (e) {
    console.error('[telephony/voice/action] update error', e)
  }

  const vr = new twilio.twiml.VoiceResponse()
  vr.hangup()
  return xml(vr)
}

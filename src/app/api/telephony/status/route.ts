// src/app/api/telephony/status/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function asIsoNow() {
  return new Date().toISOString()
}

export async function POST(req: Request) {
  const url = new URL(req.url)
  const callId = (url.searchParams.get('callId') || '').trim()
  const secret = (url.searchParams.get('secret') || '').trim()

  // einfacher Schutz (weil Twilio Webhook public ist)
  if (process.env.TELEPHONY_WEBHOOK_SECRET) {
    if (!secret || secret !== process.env.TELEPHONY_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const bodyText = await req.text()
  const p = new URLSearchParams(bodyText)

  const CallSid = p.get('CallSid') || null
  const CallStatus = p.get('CallStatus') || null // initiated|ringing|in-progress|completed|busy|failed|no-answer|canceled
  const CallDurationRaw = p.get('CallDuration') // seconds (bei completed)
  const durationSec = CallDurationRaw ? Number(CallDurationRaw) : null

  // wenn callId nicht da ist, fallback auf CallSid
  if (!callId && !CallSid) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const patch: any = {
    twilio_call_sid: CallSid ?? undefined,
    result: CallStatus ?? undefined,
  }

  // answered
  if (CallStatus === 'in-progress') {
    patch.answered_at = asIsoNow()
  }

  // completed / failed / busy / no-answer / canceled -> ended
  if (
    CallStatus === 'completed' ||
    CallStatus === 'failed' ||
    CallStatus === 'busy' ||
    CallStatus === 'no-answer' ||
    CallStatus === 'canceled'
  ) {
    patch.ended_at = asIsoNow()
    if (typeof durationSec === 'number' && !Number.isNaN(durationSec)) {
      patch.duration_sec = durationSec
    }
  }

  try {
    if (callId) {
      await supabaseAdmin.from('telephony_calls').update(patch).eq('id', callId)
    } else if (CallSid) {
      await supabaseAdmin
        .from('telephony_calls')
        .update(patch)
        .eq('twilio_call_sid', CallSid)
    }
  } catch (e) {
    // Twilio erwartet 200 → Fehler nicht eskalieren
    console.error('[telephony/status] update error', e)
  }

  return NextResponse.json({ ok: true })
}

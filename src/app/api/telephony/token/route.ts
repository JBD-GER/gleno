// src/app/api/telephony/token/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import twilio from 'twilio'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  const {
    data: settings,
    error,
  } = await supabase
    .from('telephony_settings')
    .select('twilio_voice_app_sid')
    .eq('user_id', user.id)
    .single()

  if (error || !settings) {
    console.error('[telephony/token] settings error', error)
    return NextResponse.json(
      { error: 'Telephony für diesen Benutzer ist nicht konfiguriert.' },
      { status: 400 },
    )
  }

  const { twilio_voice_app_sid } = settings

  if (!twilio_voice_app_sid) {
    return NextResponse.json(
      { error: 'Keine TwiML App SID hinterlegt.' },
      { status: 400 },
    )
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const apiKeySid = process.env.TWILIO_API_KEY_SID
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET

  if (!accountSid || !apiKeySid || !apiKeySecret) {
    console.error('[telephony/token] Twilio env missing')
    return NextResponse.json(
      { error: 'Twilio-Konfiguration auf Server-Seite unvollständig.' },
      { status: 500 },
    )
  }

  const identity = user.email ?? user.id

  const AccessToken = twilio.jwt.AccessToken
  const VoiceGrant = AccessToken.VoiceGrant

  const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
    identity,
  })

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: twilio_voice_app_sid,
    incomingAllow: true,
  })

  token.addGrant(voiceGrant)

  return NextResponse.json({
    token: token.toJwt(),
    identity,
  })
}

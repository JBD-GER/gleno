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

  const { data: settings, error } = await supabase
    .from('telephony_settings')
    .select('twilio_account_sid, twilio_api_key_sid, twilio_api_key_secret, twilio_voice_app_sid')
    .eq('user_id', user.id)
    .single()

  if (error || !settings) {
    console.error('[telephony/token] settings error', error)
    return NextResponse.json(
      { error: 'Telephony für diesen Benutzer ist nicht konfiguriert.' },
      { status: 400 },
    )
  }

  const { twilio_account_sid, twilio_api_key_sid, twilio_api_key_secret, twilio_voice_app_sid } = settings

  if (!twilio_account_sid || !twilio_api_key_sid || !twilio_api_key_secret || !twilio_voice_app_sid) {
    return NextResponse.json(
      { error: 'Twilio-Daten unvollständig. Bitte Account SID, API Key SID/Secret und TwiML App SID hinterlegen.' },
      { status: 400 },
    )
  }

  const identity = user.email ?? user.id

  const AccessToken = twilio.jwt.AccessToken
  const VoiceGrant = AccessToken.VoiceGrant

  const token = new AccessToken(twilio_account_sid, twilio_api_key_sid, twilio_api_key_secret, {
    identity,
  })

  token.addGrant(
    new VoiceGrant({
      outgoingApplicationSid: twilio_voice_app_sid,
      incomingAllow: true,
    }),
  )

  return NextResponse.json({ token: token.toJwt(), identity })
}

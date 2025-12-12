// src/app/api/telephony/settings/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

type ConnectionStatus = 'ok' | 'error' | 'not_configured'

function mask(value: string | null | undefined) {
  if (!value) return null
  const v = String(value)
  if (v.length <= 6) return '••••'
  return `${v.slice(0, 2)}••••${v.slice(-2)}`
}

function isE164(n: string) {
  return /^\+\d{6,15}$/.test(n.trim())
}

/* ------------------- GET: Einstellungen laden (ohne Secrets) ------------------- */
export async function GET() {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('telephony_settings')
    .select(
      `
      twilio_account_sid,
      twilio_voice_app_sid,
      twilio_caller_id,
      twilio_api_key_sid
    `,
    )
    .eq('user_id', user.id)
    .single()

  // Kein Datensatz vorhanden → noch nicht konfiguriert
  if (error && (error as any).code === 'PGRST116') {
    return NextResponse.json({
      status: 'not_configured' as ConnectionStatus,
      statusMessage: 'Noch keine Twilio-Zugangsdaten hinterlegt.',
      accountSid: null,
      voiceAppSid: null,
      callerId: null,
      apiKeySid: null,
    })
  }

  if (error) {
    console.error('[telephony/settings] GET error', error)
    return NextResponse.json(
      {
        status: 'error' as ConnectionStatus,
        statusMessage: 'Einstellungen konnten nicht geladen werden.',
      },
      { status: 500 },
    )
  }

  const configured =
    !!data?.twilio_account_sid &&
    !!data?.twilio_voice_app_sid &&
    !!data?.twilio_caller_id &&
    !!data?.twilio_api_key_sid

  return NextResponse.json({
    status: configured ? ('ok' as ConnectionStatus) : ('not_configured' as ConnectionStatus),
    statusMessage: configured ? null : 'Bitte Twilio-Daten vollständig hinterlegen.',
    accountSid: data?.twilio_account_sid ?? null,
    voiceAppSid: data?.twilio_voice_app_sid ?? null,
    callerId: data?.twilio_caller_id ?? null,
    apiKeySidMasked: mask(data?.twilio_api_key_sid ?? null),
  })
}

/* ------------------- POST: Einstellungen speichern (mit Secrets) ------------------- */
type Body = {
  accountSid: string
  authToken: string
  apiKeySid: string
  apiKeySecret: string
  voiceAppSid: string
  callerId: string
}

export async function POST(req: Request) {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { accountSid, authToken, apiKeySid, apiKeySecret, voiceAppSid, callerId } = body

  if (!accountSid || !authToken || !apiKeySid || !apiKeySecret || !voiceAppSid || !callerId) {
    return NextResponse.json(
      { error: 'Account SID, Auth Token, API Key SID, API Key Secret, TwiML App SID und Caller ID sind Pflichtfelder.' },
      { status: 400 },
    )
  }

  if (!isE164(callerId)) {
    return NextResponse.json(
      { error: 'Caller ID muss im E.164 Format sein, z.B. +495111234567.' },
      { status: 400 },
    )
  }

  const payload = {
    user_id: user.id,
    twilio_account_sid: accountSid.trim(),
    twilio_auth_token: authToken.trim(),
    twilio_api_key_sid: apiKeySid.trim(),
    twilio_api_key_secret: apiKeySecret.trim(),
    twilio_voice_app_sid: voiceAppSid.trim(),
    twilio_caller_id: callerId.trim(),
  }

  const { error } = await supabase
    .from('telephony_settings')
    .upsert(payload, { onConflict: 'user_id' })

  if (error) {
    console.error('[telephony/settings] POST error', error)
    return NextResponse.json(
      {
        status: 'error' as ConnectionStatus,
        statusMessage: 'Einstellungen konnten nicht gespeichert werden.',
      },
      { status: 500 },
    )
  }

  // niemals Secrets zurückgeben
  return NextResponse.json({
    status: 'ok' as ConnectionStatus,
    statusMessage: 'Verbindung erfolgreich gespeichert.',
    accountSid: accountSid.trim(),
    voiceAppSid: voiceAppSid.trim(),
    callerId: callerId.trim(),
    apiKeySidMasked: mask(apiKeySid.trim()),
  })
}

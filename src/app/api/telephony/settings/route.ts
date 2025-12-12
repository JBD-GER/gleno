// src/app/api/telephony/settings/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

type ConnectionStatus = 'ok' | 'error' | 'not_configured'

/* ------------------- GET: Einstellungen laden ------------------- */

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
      twilio_caller_id
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

  return NextResponse.json({
    status: 'ok' as ConnectionStatus,
    statusMessage: null,
    accountSid: data?.twilio_account_sid ?? null,
    voiceAppSid: data?.twilio_voice_app_sid ?? null,
    callerId: data?.twilio_caller_id ?? null,
  })
}

/* ------------------- POST: Einstellungen speichern ------------------- */

type Body = {
  accountSid: string
  authToken?: string
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

  const { accountSid, authToken, voiceAppSid, callerId } = body

  // Pflichtfelder: wir verlangen hier bewusst das Auth Token jedes Mal
  if (!accountSid || !authToken || !voiceAppSid || !callerId) {
    return NextResponse.json(
      {
        error:
          'Account SID, Auth Token, TwiML App SID und Caller ID sind Pflichtfelder.',
      },
      { status: 400 },
    )
  }

  const payload = {
    user_id: user.id,
    twilio_account_sid: accountSid,
    twilio_auth_token: authToken,
    twilio_voice_app_sid: voiceAppSid,
    twilio_caller_id: callerId,
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

  return NextResponse.json({
    status: 'ok' as ConnectionStatus,
    statusMessage: 'Verbindung erfolgreich gespeichert.',
    accountSid,
    voiceAppSid,
    callerId,
  })
}

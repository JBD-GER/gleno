// src/app/api/telephony/settings/test/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import twilio from 'twilio'

export const runtime = 'nodejs'

type ConnectionStatus = 'ok' | 'error' | 'not_configured'

export async function POST() {
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
      twilio_auth_token,
      twilio_voice_app_sid,
      twilio_caller_id
    `,
    )
    .eq('user_id', user.id)
    .single()

  if (error && (error as any).code === 'PGRST116') {
    return NextResponse.json({
      status: 'not_configured' as ConnectionStatus,
      statusMessage: 'Noch keine Twilio-Zugangsdaten hinterlegt.',
    })
  }

  if (error || !data) {
    console.error('[telephony/settings/test] select error', error)
    return NextResponse.json({
      status: 'error' as ConnectionStatus,
      statusMessage: 'Telephony-Settings konnten nicht gelesen werden.',
    })
  }

  const {
    twilio_account_sid,
    twilio_auth_token,
    twilio_voice_app_sid,
    twilio_caller_id,
  } = data

  if (
    !twilio_account_sid ||
    !twilio_auth_token ||
    !twilio_voice_app_sid ||
    !twilio_caller_id
  ) {
    return NextResponse.json({
      status: 'error' as ConnectionStatus,
      statusMessage:
        'Bitte Account SID, Auth Token, TwiML App SID und Caller ID vollständig hinterlegen.',
    })
  }

  let client: any
  try {
    client = twilio(twilio_account_sid, twilio_auth_token)
  } catch (e) {
    console.error('[telephony/settings/test] client init error', e)
    return NextResponse.json({
      status: 'error' as ConnectionStatus,
      statusMessage:
        'Twilio-Client konnte nicht initialisiert werden. Bitte Zugangsdaten prüfen.',
    })
  }

  try {
    // 1) Account erreichbar?
    await client.api.accounts(twilio_account_sid).fetch()

    // 2) TwiML App existiert?
    await client.applications(twilio_voice_app_sid).fetch()

    // 3) Caller-ID ist aktive Nummer im Account?
    const numbers = await client.incomingPhoneNumbers.list({
      phoneNumber: twilio_caller_id,
      limit: 1,
    })

    if (!numbers || numbers.length === 0) {
      return NextResponse.json({
        status: 'error' as ConnectionStatus,
        statusMessage:
          'Die hinterlegte Caller ID ist keine aktive Twilio-Rufnummer in diesem Account.',
      })
    }

    return NextResponse.json({
      status: 'ok' as ConnectionStatus,
      statusMessage:
        'Twilio-Verbindung erfolgreich getestet: Account, TwiML-App und Rufnummer sind erreichbar.',
    })
  } catch (err: any) {
    console.error('[telephony/settings/test] twilio error', err)

    let statusMessage =
      'Twilio-Verbindung konnte nicht erfolgreich getestet werden.'

    const code = err?.code
    const httpStatus = err?.status

    if (httpStatus === 401 || code === 20003) {
      statusMessage =
        'Authentifizierung bei Twilio fehlgeschlagen. Bitte Account SID & Auth Token prüfen.'
    } else if (httpStatus === 404) {
      statusMessage =
        'TwiML App oder Ressource wurde bei Twilio nicht gefunden. Bitte TwiML App SID und Nummer prüfen.'
    }

    return NextResponse.json({
      status: 'error' as ConnectionStatus,
      statusMessage,
    })
  }
}

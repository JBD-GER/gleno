// src/app/api/telephony/live-events/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { chatJson } from '@/lib/server-openai'
import { sanitizeScript } from '@/lib/sanitize-script'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Body = {
  callId: string
  profileId?: string | null
  direction?: 'outbound' | 'inbound' | null
  transcript?: string | null
  stage?: 'intro' | 'need' | 'objection' | 'closing' | null
}

const LIVE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    speech_block: { type: 'array', items: { type: 'string' } },
    pause_question: { type: ['string', 'null'] },
    backup_block: { anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }] },
    stage: { type: 'string' },
    objection_type: { type: ['string', 'null'] },
    objection_label: { type: ['string', 'null'] },
    reasoning: { type: ['string', 'null'] },
    closing_priority: { type: ['string', 'null'] },
    closing_priority_label: { type: ['string', 'null'] },
    stop_signal: { type: 'string' },
  },
  required: [
    'speech_block','pause_question','backup_block','stage','objection_type','objection_label',
    'reasoning','closing_priority','closing_priority_label','stop_signal'
  ],
} as const

async function shouldThrottle(callId: string, minSeconds = 2): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('telephony_live_events')
    .select('created_at')
    .eq('call_id', callId)
    .eq('kind', 'suggestion')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data?.created_at) return false
  const last = new Date(data.created_at).getTime()
  return Date.now() - last < minSeconds * 1000
}

export async function POST(req: Request) {
  const secret = req.headers.get('x-telephony-secret') || ''
  if (!process.env.TELEPHONY_STREAM_SECRET || secret !== process.env.TELEPHONY_STREAM_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const callId = (body.callId || '').trim()
  const profileId = (body.profileId || '').trim() || null
  const transcript = (body.transcript || '').trim() || null
  const direction = body.direction ?? 'outbound'
  const stage = body.stage ?? 'need'

  if (!callId) return NextResponse.json({ error: 'callId missing' }, { status: 400 })
  if (!transcript) return NextResponse.json({ ok: true, skipped: true })

  // zu kurze Schnipsel bringen eher “Müll-Suggestions”
  if (transcript.length < 12) return NextResponse.json({ ok: true, skipped: true, reason: 'too_short' })

  // 1) Transcript speichern
  {
    const { error } = await supabaseAdmin.from('telephony_live_events').insert({
      call_id: callId,
      profile_id: profileId,
      kind: 'transcript',
      payload: { text: transcript, stage, direction },
    })
    if (error) console.error('[live-events] insert transcript error', error)
  }

  // 2) Suggestion throttlen
  if (await shouldThrottle(callId, 2)) {
    return NextResponse.json({ ok: true, throttled: true })
  }

  // 3) Suggestion erzeugen (nur wenn profileId da ist)
  if (!profileId) return NextResponse.json({ ok: true })

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('acquisition_profiles')
    .select('id, name, offer_name, target_audience, customer_profile, intros, closing_priorities, language')
    .eq('id', profileId)
    .single()

  if (profileErr || !profile) {
    if (profileErr) console.error('[live-events] profile fetch error', profileErr)
    return NextResponse.json({ ok: true, profileMissing: true })
  }

  const system = `
Du bist ein Live-Call-Coach für B2B-Telefonakquise.
- Kein Name, keine PII, keine Platzhalter.
- Max 2 Sätze als konkreter nächster Satz.
- Antworte NUR JSON gemäß Schema.
`

  const userContent = {
    profile: {
      name: profile.name,
      offer_name: profile.offer_name,
      target_audience: profile.target_audience,
      customer_profile: profile.customer_profile,
      intros: profile.intros,
      closing_priorities: profile.closing_priorities,
    },
    snippet: transcript,
    stage,
    direction,
    previous_learnings: [],
  }

  try {
    const ai = await chatJson<any>({
      system,
      user: userContent,
      schema: LIVE_SCHEMA,
      temperature: 0.5,
      maxOutputTokens: 250,
    })

    const speech = Array.isArray(ai.speech_block) ? ai.speech_block : []
    const suggestionText = sanitizeScript(speech.join(' ').trim())
    const backupText = ai.backup_block
      ? sanitizeScript((ai.backup_block as string[]).join(' ').trim())
      : null

    const { error } = await supabaseAdmin.from('telephony_live_events').insert({
      call_id: callId,
      profile_id: profileId,
      kind: 'suggestion',
      payload: {
        suggestion: suggestionText,
        backup: backupText,
        stage: ai.stage ?? stage,
        objectionType: ai.objection_type ?? null,
        objectionLabel: ai.objection_label ?? null,
        closingPriority: ai.closing_priority ?? null,
        closingPriorityLabel: ai.closing_priority_label ?? null,
        stopSignal: ai.stop_signal ?? 'continue',
      },
    })

    if (error) console.error('[live-events] insert suggestion error', error)
  } catch (e) {
    console.error('[live-events] suggest error', e)
  }

  return NextResponse.json({ ok: true })
}

// src/app/api/telephony/calls/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import crypto from 'crypto'

export const runtime = 'nodejs'

type Direction = 'outbound' | 'inbound'

type CallBody = {
  profileId?: string | null
  sipAccountId?: string | null
  direction: Direction
  remoteNumber: string
  startedAt?: string | null
  answeredAt?: string | null
  endedAt?: string | null
  durationSec?: number | null
  result?: string | null
  recordingPath?: string | null
  aiSummary?: any
}

type CallPatchBody = {
  id: string
  answeredAt?: string | null
  endedAt?: string | null
  durationSec?: number | null
  result?: string | null
  recordingPath?: string | null
  aiSummary?: any
}

function normalizePhone(number: string): string {
  return number.replace(/[^\d+]/g, '').trim()
}

function hashPhone(number: string): string {
  const normalized = normalizePhone(number)
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

function maskPhone(number: string): string {
  const n = normalizePhone(number)
  // Sehr simple Maskierung: nur letzte 4 Zeichen sichtbar
  const last4 = n.slice(-4)
  const prefix = n.startsWith('+') ? '+' : ''
  return `${prefix}••••${last4}`
}

/* ----------------------------- GET (Read one) ----------------------------- */

export async function GET(req: Request) {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = (searchParams.get('id') || '').trim()

  if (!id) {
    return NextResponse.json({ error: 'id ist erforderlich.' }, { status: 400 })
  }

  // ownership: created_by == auth user
  const { data, error } = await supabase
    .from('telephony_calls')
    .select('*')
    .eq('id', id)
    .eq('created_by', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Call nicht gefunden.' }, { status: 404 })
  }

  return NextResponse.json({ call: data })
}

/* ----------------------------- POST (Create) ----------------------------- */

export async function POST(req: Request) {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  let body: CallBody
  try {
    body = (await req.json()) as CallBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    profileId = null,
    sipAccountId = null,
    direction,
    remoteNumber,
    startedAt = null,
    answeredAt = null,
    endedAt = null,
    durationSec = null,
    result = null,
    recordingPath = null,
    aiSummary = null,
  } = body

  if (!remoteNumber || !direction) {
    return NextResponse.json(
      { error: 'remoteNumber und direction sind erforderlich.' },
      { status: 400 }
    )
  }

  // passendes Profile-Record holen (user_id in telephony_calls referenziert public.profiles.id)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json(
      { error: 'Kein Profil für diesen Benutzer gefunden.' },
      { status: 400 }
    )
  }

  const remoteHash = hashPhone(remoteNumber)
  const remoteMasked = maskPhone(remoteNumber)

  const { data: inserted, error: insertError } = await supabase
    .from('telephony_calls')
    .insert({
      user_id: profile.id,
      profile_id: profileId,
      sip_account_id: sipAccountId,
      direction,

      // IMPORTANT:
      // Wir speichern NICHT die echte Nummer (PII),
      // sondern nur maskiert + Hash.
      remote_number: remoteMasked,
      remote_number_hash: remoteHash,

      started_at: startedAt ? new Date(startedAt).toISOString() : new Date().toISOString(),
      answered_at: answeredAt ? new Date(answeredAt).toISOString() : null,
      ended_at: endedAt ? new Date(endedAt).toISOString() : null,
      duration_sec: durationSec ?? null,
      result,
      recording_path: recordingPath,
      ai_summary: aiSummary ?? null,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (insertError || !inserted) {
    console.error('[telephony/calls] insert error', insertError)
    return NextResponse.json(
      { error: 'Call konnte nicht gespeichert werden.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ call: inserted })
}

/* ----------------------------- PATCH (Update) ----------------------------- */

export async function PATCH(req: Request) {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  let body: CallPatchBody
  try {
    body = (await req.json()) as CallPatchBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { id, answeredAt, endedAt, durationSec, result, recordingPath, aiSummary } = body

  if (!id) {
    return NextResponse.json({ error: 'id ist erforderlich.' }, { status: 400 })
  }

  // ownership check über telephony_calls.user_id (profiles.id) vs user.id ist tricky
  // -> in deinem System ist profiles.id == auth.user.id, daher passt eq('created_by', user.id)
  const { data: updated, error } = await supabase
    .from('telephony_calls')
    .update({
      answered_at: answeredAt ? new Date(answeredAt).toISOString() : undefined,
      ended_at: endedAt ? new Date(endedAt).toISOString() : undefined,
      duration_sec: typeof durationSec === 'number' ? durationSec : undefined,
      result: result ?? undefined,
      recording_path: recordingPath ?? undefined,
      ai_summary: aiSummary ?? undefined,
    })
    .eq('id', id)
    .eq('created_by', user.id)
    .select('*')
    .single()

  if (error || !updated) {
    console.error('[telephony/calls] patch error', error)
    return NextResponse.json({ error: 'Call konnte nicht aktualisiert werden.' }, { status: 500 })
  }

  return NextResponse.json({ call: updated })
}

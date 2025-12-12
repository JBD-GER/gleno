// src/app/api/ai/acquisition/learning/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { sanitizeScript } from '@/lib/sanitize-script'

export const runtime = 'edge'

type CallStage = 'intro' | 'objection' | 'closing' | 'mixed'
type CallDirection = 'outbound' | 'inbound'

type SaveLearningBody = {
  profileId: string
  stage: CallStage
  callDirection: CallDirection
  outcome: 'success' | 'fail'
  objectionType?: string | null
  objectionLabel?: string | null
  suggestion: string
  usageHint?: string
}

export async function POST(req: Request) {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

  let body: SaveLearningBody
  try {
    body = (await req.json()) as SaveLearningBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    profileId,
    stage,
    callDirection,
    outcome,
    objectionType = null,
    objectionLabel = null,
    suggestion,
    usageHint,
  } = body

  if (!profileId || !stage || !callDirection || !outcome || !suggestion) {
    return NextResponse.json(
      { error: 'profileId, stage, callDirection, outcome, suggestion sind erforderlich.' },
      { status: 400 }
    )
  }

  // Check ownership
  const { data: profile, error: profileError } = await supabase
    .from('acquisition_profiles')
    .select('id, user_id')
    .eq('id', profileId)
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profil nicht gefunden.' }, { status: 404 })
  }

  const sanitized = sanitizeScript(suggestion)

  const { data: inserted, error: insertError } = await supabase
    .from('acquisition_learnings')
    .insert({
      user_id: user.id,
      profile_id: profileId,
      stage,
      call_direction: callDirection,
      outcome,
      objection_type: objectionType,
      objection_label: objectionLabel,
      suggestion: sanitized,
      usage_hint: usageHint ?? null,
    })
    .select('*')
    .single()

  if (insertError || !inserted) {
    console.error('[acquisition/learning] insert error', insertError)
    return NextResponse.json({ error: 'Learning konnte nicht gespeichert werden.' }, { status: 500 })
  }

  return NextResponse.json({ learning: inserted })
}

export async function GET(req: Request) {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const profileId = searchParams.get('profileId')
  const limitParam = searchParams.get('limit')
  const limit = limitParam ? Math.min(100, Math.max(1, Number(limitParam))) : 20

  if (!profileId) return NextResponse.json({ error: 'profileId ist erforderlich.' }, { status: 400 })

  const { data, error } = await supabase
    .from('acquisition_learnings')
    .select('id, profile_id, stage, call_direction, outcome, objection_type, objection_label, suggestion, usage_hint, created_at')
    .eq('profile_id', profileId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[acquisition/learning] select error', error)
    return NextResponse.json({ error: 'Learnings konnten nicht geladen werden.' }, { status: 500 })
  }

  return NextResponse.json({ learnings: data ?? [] })
}

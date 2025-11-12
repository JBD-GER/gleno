// src/app/api/markt/leads/route.ts
import { type NextRequest, NextResponse } from 'next/server'
import { supabaseServerRoute } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/** GET /api/markt/leads  -> eigene Anfragen (kompakt) */
export async function GET(req: NextRequest) {
  const { supabase, response } = supabaseServerRoute(req)

  const {
    data: { user },
    error: uerr,
  } = await supabase.auth.getUser()
  if (uerr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: response.headers })
  }

  // WICHTIG: nur eigene Requests laden
  const { data, error } = await supabase
    .from('market_requests')
    .select('id, summary, request_text, status, created_at, category, city')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: response.headers })
  }

  const leads = (data ?? []).map((r: any) => ({
    id: r.id,
    title: (r.summary && String(r.summary).trim()) || [r.category, r.city].filter(Boolean).join(' – ') || 'Anfrage',
    status: String(r.status || 'Anfrage').toLowerCase(),
    created_at: r.created_at,
  }))

  return NextResponse.json({ leads }, { headers: response.headers })
}

/**
 * POST /api/markt/leads
 * Body: { aiLead: {...}, externalSearchConsent?: boolean }
 */
export async function POST(req: NextRequest) {
  const { supabase, response } = supabaseServerRoute(req)

  const {
    data: { user },
    error: uerr,
  } = await supabase.auth.getUser()
  if (uerr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: response.headers })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400, headers: response.headers })
  }

  const aiLead = body?.aiLead
  const externalSearchConsent = !!body?.externalSearchConsent // 👈 jetzt korrekt gelesen

  if (!aiLead || typeof aiLead !== 'object') {
    return NextResponse.json({ error: 'missing_aiLead' }, { status: 400, headers: response.headers })
  }

  const request_text = String(aiLead.requestText || '').trim()
  if (request_text.length < 20) {
    return NextResponse.json({ error: 'request_text_too_short' }, { status: 400, headers: response.headers })
  }

  const fields = aiLead.fields || {}
  const summary = aiLead.summary ? String(aiLead.summary).slice(0, 500) : null
  const title =
    (summary && summary.trim()) ||
    [fields?.category, fields?.city].filter(Boolean).join(' – ') ||
    'Anfrage'

  const executionRaw = String(fields.execution || 'digital')
  const execution = /vorOrt|vorort/i.test(executionRaw) ? 'vorOrt' : 'digital'

  const payload = {
    user_id: user.id,
    status: 'Anfrage',
    branch: fields.branch ? String(fields.branch) : 'Allgemein',
    category: fields.category ? String(fields.category) : 'Sonstiges',
    city: fields.city ? String(fields.city) : null,
    zip: fields.zip ? String(fields.zip) : null,
    urgency: fields.urgency ? String(fields.urgency) : null,
    execution, // enum in DB
    budget_min: typeof fields.budget_min === 'number' ? fields.budget_min : null,
    budget_max: typeof fields.budget_max === 'number' ? fields.budget_max : null,
    extras: (fields.extras && typeof fields.extras === 'object') ? fields.extras : {},
    request_text: request_text.slice(0, 30000),
    summary,
    recommendations: Array.isArray(aiLead.recommendations) ? aiLead.recommendations : null,
    // 👇 neue Felder
    external_search_consent: externalSearchConsent,
    external_search_consent_at: externalSearchConsent ? new Date().toISOString() : null,
  }

  const { data, error } = await supabase
    .from('market_requests')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: response.headers })
  }

  return NextResponse.json({ ok: true, id: data?.id, title }, { status: 201, headers: response.headers })
}

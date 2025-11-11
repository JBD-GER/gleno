// src/app/api/markt/leads/[id]/route.ts
import { type NextRequest, NextResponse } from 'next/server'
import { supabaseServerRoute } from '@/lib/supabase-server'

export const runtime = 'nodejs'

// Hilfs-Mapping: Frontend-Strings -> DB-Enum (request_status)
function mapStatusToEnum(input: unknown): string | undefined {
  if (!input) return undefined
  const v = String(input).trim().toLowerCase()

  // Delete / Restore
  if (v === 'geloescht' || v === 'gelöscht' || v === 'geloscht') return 'Gelöscht'
  if (v === 'anfrage') return 'Anfrage'

  // Termin
  if (v === 'termin_angelegt' || v === 'termin angelegt') return 'Termin angelegt'
  if (v === 'termin_bestaetigt' || v === 'termin bestätigt') return 'Termin bestätigt'

  // Auftrag (neu: „Auftrag erstellt“ statt „Auftrag angelegt“)
  if (v === 'auftrag_erstellt' || v === 'auftrag angelegt' || v === 'auftrag_angelegt') return 'Auftrag erstellt'
  if (v === 'auftrag_bestaetigt' || v === 'auftrag bestätigt') return 'Auftrag bestätigt'

  // Rest
  if (v === 'rechnungsphase') return 'Rechnungsphase'
  if (v === 'abgeschlossen') return 'Abgeschlossen'
  if (v === 'feedback') return 'Feedback'
  if (v === 'problem') return 'Problem'

  return undefined
}

// Lead laden
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response } = supabaseServerRoute(req)
  const { id } = await params

  const { data: { user }, error: uerr } = await supabase.auth.getUser()
  if (uerr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: response.headers })
  }

  const { data, error } = await supabase
    .from('market_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('GET market_requests error:', error)
    return NextResponse.json({ error: error.message }, { status: 404, headers: response.headers })
  }

  const title =
    (data.summary && String(data.summary).trim()) ||
    [data.category, data.city].filter(Boolean).join(' – ') ||
    'Anfrage'

  return NextResponse.json({ lead: { title, ...data } }, { headers: response.headers })
}

// Lead updaten (inkl. Status-Updates)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response } = supabaseServerRoute(req)
  const { id } = await params

  const { data: { user }, error: uerr } = await supabase.auth.getUser()
  if (uerr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: response.headers })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400, headers: response.headers })
  }

  const patch: Record<string, any> = {}

  // STATUS: hier explizit mappen (wichtig!)
  if ('status' in body) {
    const mapped = mapStatusToEnum(body.status)
    if (!mapped) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 400, headers: response.headers })
    }
    patch.status = mapped
  }

  // Editierbare Felder
  if ('summary' in body)        patch.summary      = body.summary ?? null
  if ('city' in body)           patch.city         = body.city ?? null
  if ('zip' in body)            patch.zip          = body.zip ?? null
  if ('urgency' in body)        patch.urgency      = body.urgency ?? null
  if ('request_text' in body && typeof body.request_text === 'string')
                                patch.request_text = body.request_text.slice(0, 30000)

  if ('execution' in body) {
    const raw = String(body.execution ?? 'digital')
    patch.execution = /vorOrt|vorort/i.test(raw) ? 'vorOrt' : 'digital'
  }

  if ('budget_min' in body) {
    patch.budget_min =
      typeof body.budget_min === 'number' ? body.budget_min :
      body.budget_min === null ? null : undefined
  }
  if ('budget_max' in body) {
    patch.budget_max =
      typeof body.budget_max === 'number' ? body.budget_max :
      body.budget_max === null ? null : undefined
  }

  patch.updated_at = new Date().toISOString()

  // undefineds entfernen
  for (const k of Object.keys(patch)) {
    if (patch[k] === undefined) delete patch[k]
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, noop: true }, { headers: response.headers })
  }

  const { data, error } = await supabase
    .from('market_requests')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, status')
    .single()

  if (error) {
    console.error('UPDATE market_requests error:', error, 'payload:', patch)
    return NextResponse.json({ error: error.message }, { status: 500, headers: response.headers })
  }

  return NextResponse.json({ ok: true, status: data?.status }, { headers: response.headers })
}

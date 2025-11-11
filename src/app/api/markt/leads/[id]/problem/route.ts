import { type NextRequest, NextResponse } from 'next/server'
import { supabaseServerRoute } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // <- params ist ein Promise
) {
  const { supabase, response } = supabaseServerRoute(req)

  const { data: { user }, error: uerr } = await supabase.auth.getUser()
  if (uerr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: response.headers })
  }

  let body: any
  try { body = await req.json() } catch { /* noop */ }

  const { id: requestId } = await params          // <- await params
  const note = (body?.note || '').toString().trim()
  if (!note || note.length < 5) {
    return NextResponse.json({ error: 'note_too_short' }, { status: 400, headers: response.headers })
  }

  // Status auf "Problem" setzen + Notiz speichern (du kannst das an deine Tabellen anpassen)
  const { error: err1 } = await supabase
    .from('market_requests')
    .update({ status: 'Problem', updated_at: new Date().toISOString() })
    .eq('id', requestId)

  if (err1) {
    return NextResponse.json({ error: err1.message }, { status: 500, headers: response.headers })
  }

  // Optional eigene Tabelle für Meldungen:
  await supabase
    .from('market_inquiry_status_history')
    .insert({
      inquiry_id: requestId,
      old_status: null,
      new_status: 'Problem',
      note,
      changed_by: user.id
    })

  return NextResponse.json({ ok: true }, { status: 201, headers: response.headers })
}

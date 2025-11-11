import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Status = 'erstellt' | 'bezahlt' | 'verzug'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    if (!id) return NextResponse.json({ ok:false, error: 'id_required' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const status = String(body?.status || '').toLowerCase() as Status
    if (!['erstellt','bezahlt','verzug'].includes(status)) {
      return NextResponse.json({ ok:false, error: 'invalid_status' }, { status: 400 })
    }

    const supabase = await supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok:false, error: 'unauthorized' }, { status: 401 })

    // Dokument holen (inkl. request_id für Pfadcheck)
    const { data: row, error: qErr } = await supabase
      .from('market_documents')
      .select('id, uploaded_by_user_id, path, conversation_id, request_id, category')
      .eq('id', id)
      .maybeSingle()
    if (qErr || !row) return NextResponse.json({ ok:false, error: 'not_found' }, { status: 404 })

    // nur Uploader darf Status ändern
    if (row.uploaded_by_user_id !== user.id) {
      return NextResponse.json({ ok:false, error: 'forbidden' }, { status: 403 })
    }

    // Muss eine Rechnung sein
    const rid = row.request_id
    const path = String(row.path || '')
    if (!rid || !path.startsWith(`chat/rechnung/${rid}/`)) {
      return NextResponse.json({ ok:false, error: 'not_an_invoice' }, { status: 400 })
    }

    const newCategory = `rechnung:${status}`

    // Update verifizieren (RLS muss Update erlauben!)
    const { data: updated, error: upErr } = await supabase
      .from('market_documents')
      .update({ category: newCategory })
      .eq('id', id)
      .select('id, category')
      .maybeSingle()

    if (upErr) return NextResponse.json({ ok:false, error: upErr.message || 'update_failed' }, { status: 500 })
    if (!updated) return NextResponse.json({ ok:false, error: 'update_blocked_by_rls' }, { status: 403 })

    // Optionale Systemmeldung in Chat (schön gerendert im Frontend)
    try {
      if (row.conversation_id) {
        await supabase.from('market_messages').insert({
          conversation_id: row.conversation_id,
          sender_user_id: user.id,
          body_text: `INVOICE:STATUS:${status}:${id}`,
        })
      }
    } catch {}

    return NextResponse.json({ ok: true, category: updated.category })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'unknown_error' }, { status: 500 })
  }
}

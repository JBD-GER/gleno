// app/api/appointments/[id]/notes/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server'

type Params = { id: string }

type Author = { first_name: string | null; last_name: string | null; email: string | null }
type NoteRow = {
  id: string
  content: string
  created_at: string
  created_by: string | null
  author?: Author | null
}

/** companyId ermitteln (Owner für Mitarbeiter ermitteln) */
async function resolveCompanyId(userId: string): Promise<{ companyId: string }> {
  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('user_id')
    .eq('auth_user_id', userId)
    .maybeSingle()

  return { companyId: emp?.user_id ?? userId }
}

/** Hilfsfunktion: Join zu profiles ohne FK (Fallback) */
async function hydrateAuthors(notes: NoteRow[]): Promise<NoteRow[]> {
  const admin = await supabaseAdmin
  const ids = Array.from(new Set(notes.map(n => n.created_by).filter(Boolean))) as string[]
  if (ids.length === 0) return notes

  const { data: users } = await admin
    .from('profiles')
    .select('id, first_name, last_name, email')
    .in('id', ids)

  if (!users) return notes

  const map = new Map(users.map(u => [u.id, { first_name: u.first_name, last_name: u.last_name, email: u.email } as Author]))
  return notes.map(n => ({ ...n, author: n.created_by ? map.get(n.created_by) ?? null : null }))
}

/** Normiert author: Wenn Array → erstes Element, sonst wie ist */
function normalizeAuthorShape(rows: any[]): NoteRow[] {
  return (rows ?? []).map((r: any) => {
    const raw = r?.author
    const author: Author | null =
      Array.isArray(raw) ? (raw[0] ?? null) :
      raw && typeof raw === 'object' ? {
        first_name: raw.first_name ?? null,
        last_name:  raw.last_name  ?? null,
        email:      raw.email      ?? null,
      } : null

    return {
      id: r.id,
      content: r.content,
      created_at: r.created_at,
      created_by: r.created_by ?? null,
      author,
    }
  })
}

/** Liste Notizen inkl. Autor */
export async function GET(_req: Request, { params }: { params: Promise<Params> }) {
  const { id } = await params
  const supabase = await supabaseServer()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 401 })

  try {
    const { companyId } = await resolveCompanyId(user.id)

    // Termin gehört zur Firma?
    const { data: appt, error: apptErr } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('id', id)
      .eq('user_id', companyId)
      .maybeSingle()
    if (apptErr) throw apptErr
    if (!appt) return NextResponse.json([], { status: 200 })

    // 1) bevorzugt: Relation-Join
    const { data, error } = await supabase
      .from('appointment_notes')
      .select(`
        id,
        content,
        created_at,
        created_by,
        author:profiles (
          first_name,
          last_name,
          email
        )
      `)
      .eq('appointment_id', id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      return NextResponse.json(normalizeAuthorShape(data))
    }

    // 2) Fallback ohne Relation (falls „Could not find a relationship…“)
    const { data: plain, error: plainErr } = await supabase
      .from('appointment_notes')
      .select('id, content, created_at, created_by')
      .eq('appointment_id', id)
      .order('created_at', { ascending: false })
    if (plainErr) throw plainErr

    const hydrated = await hydrateAuthors((plain ?? []) as NoteRow[])
    return NextResponse.json(hydrated)
  } catch (err: any) {
    return NextResponse.json({ message: err.message ?? 'Fehler' }, { status: 500 })
  }
}

/** Neue Notiz anlegen (und Autor mitliefern, auch ohne FK) */
export async function POST(req: Request, { params }: { params: Promise<Params> }) {
  const { id } = await params
  const supabase = await supabaseServer()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 401 })

  try {
    const { content } = await req.json() as { content?: string }
    if (!content || !content.trim()) {
      return NextResponse.json({ message: 'Inhalt fehlt' }, { status: 400 })
    }

    // 1) bevorzugt: Relation-Join direkt im Select
    const { data, error } = await supabase
      .from('appointment_notes')
      .insert([{ appointment_id: id, content: content.trim(), created_by: user.id }])
      .select(`
        id,
        content,
        created_at,
        created_by,
        author:profiles (
          first_name,
          last_name,
          email
        )
      `)
      .single()

    if (!error && data) {
      return NextResponse.json(normalizeAuthorShape([data])[0], { status: 201 })
    }

    // 2) Fallback ohne Relation
    const { data: inserted, error: insErr } = await supabase
      .from('appointment_notes')
      .insert([{ appointment_id: id, content: content.trim(), created_by: user.id }])
      .select('id, content, created_at, created_by')
      .single()
    if (insErr) throw insErr

    const [hydrated] = await hydrateAuthors([inserted as NoteRow])
    return NextResponse.json(hydrated, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ message: err.message ?? 'Fehler' }, { status: 500 })
  }
}

/** Notiz löschen */
export async function DELETE(req: Request, { params }: { params: Promise<Params> }) {
  const { id } = await params
  const { note_id } = await req.json() as { note_id?: string }
  if (!note_id) return NextResponse.json({ message: 'note_id fehlt' }, { status: 400 })

  const supabase = await supabaseServer()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 401 })

  try {
    const { error } = await supabase
      .from('appointment_notes')
      .delete()
      .eq('id', note_id)
      .eq('appointment_id', id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ message: err.message ?? 'Fehler' }, { status: 500 })
  }
}

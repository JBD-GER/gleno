// app/api/appointments/[id]/documents/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server'

type Params = { id: string }
const BUCKET = 'termin'

/** companyId ermitteln */
async function resolveCompanyId(userId: string): Promise<{ companyId: string }> {
  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('user_id')
    .eq('auth_user_id', userId)
    .maybeSingle()

  return { companyId: emp?.user_id ?? userId }
}

/** Liste Dokumente zu einem Termin */
export async function GET(_req: Request, { params }: { params: Promise<Params> }) {
  const { id } = await params
  const supabase = await supabaseServer()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 401 })

  const { data, error } = await supabase
    .from('appointment_documents')
    .select('id, path, name, size, uploaded_at')
    .eq('appointment_id', id)
    .order('uploaded_at', { ascending: false })

  if (error) return NextResponse.json({ message: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

/** Dateien hochladen (multipart/form-data; Feldname: files) */
export async function POST(req: Request, { params }: { params: Promise<Params> }) {
  const { id: appointmentId } = await params

  const supabase = await supabaseServer()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 401 })

  try {
    const { companyId } = await resolveCompanyId(user.id)

    const form = await req.formData()
    const files = form.getAll('files') as File[]
    if (!files.length) return NextResponse.json({ message: 'Keine Datei übergeben' }, { status: 400 })

    const inserted: any[] = []
    for (const file of files) {
      const safeName = file.name.replace(/[^\w.\-]/g, '_')
      const path = `${companyId}/${appointmentId}/${crypto.randomUUID()}-${safeName}`

      // Upload in privaten Bucket – RLS-Policy sollte <companyId>/… als Prefix erlauben
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
      if (upErr) return NextResponse.json({ message: upErr.message }, { status: 500 })

      const { data, error } = await supabase
        .from('appointment_documents')
        .insert([{ appointment_id: appointmentId, path, name: file.name, size: file.size }])
        .select('id, path, name, size, uploaded_at')
        .single()

      if (error) return NextResponse.json({ message: error.message }, { status: 500 })
      inserted.push(data)
    }

    return NextResponse.json(inserted, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ message: err.message ?? 'Fehler' }, { status: 500 })
  }
}

/** Datei löschen */
export async function DELETE(req: Request, { params }: { params: Promise<Params> }) {
  const { id: appointmentId } = await params
  const { document_id } = await req.json() as { document_id?: string }
  if (!document_id) return NextResponse.json({ message: 'document_id fehlt' }, { status: 400 })

  const supabase = await supabaseServer()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 401 })

  // Datei lesen
  const { data: doc, error: selErr } = await supabase
    .from('appointment_documents')
    .select('id, path')
    .eq('id', document_id)
    .eq('appointment_id', appointmentId)
    .single()
  if (selErr || !doc) return NextResponse.json({ message: selErr?.message ?? 'Nicht gefunden' }, { status: 404 })

  // Aus Storage löschen
  const { error: remErr } = await supabase.storage.from(BUCKET).remove([doc.path])
  if (remErr) return NextResponse.json({ message: remErr.message }, { status: 500 })

  // DB-Eintrag löschen
  const { error: delErr } = await supabase
    .from('appointment_documents')
    .delete()
    .eq('id', document_id)
  if (delErr) return NextResponse.json({ message: delErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

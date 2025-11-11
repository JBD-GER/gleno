// src/app/api/employees/[id]/absences/[absenceId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

const BUCKET = 'mitarbeiter'

function prefixes(userId: string, employeeId: string) {
  return {
    general: `${userId}/${employeeId}`,
    absences: `abwesenheit/${employeeId}`,
  }
}

// ---------- DELETE: Abwesenheit + evtl. Datei löschen ----------
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; absenceId: string }> }
) {
  const { id: employeeId, absenceId } = await params
  const supabase = await supabaseServer()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user)
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  // Datensatz holen (inkl. document_path) und Ownership prüfen
  const { data: row, error: readErr } = await supabase
    .from('absences')
    .select('id, user_id, employee_id, document_path')
    .eq('id', absenceId)
    .eq('employee_id', employeeId)
    .eq('user_id', user.id)
    .single()

  if (readErr || !row) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 })
  }

  // Datei (falls vorhanden) löschen – nur wenn Pfad erlaubt
  if (row.document_path) {
    const { general, absences } = prefixes(user.id, employeeId)
    const allowed =
      row.document_path.startsWith(general + '/') ||
      row.document_path.startsWith(absences + '/')

    if (allowed) {
      const { error: rmErr } = await supabase
        .storage
        .from(BUCKET)
        .remove([row.document_path])
      if (rmErr) {
        // Datei-Löschfehler nicht fatal machen, aber loggen
        console.warn('Storage remove failed:', rmErr.message)
      }
    } else {
      console.warn('Skip remove: path not allowed', row.document_path)
    }
  }

  // Datensatz löschen
  const { error: delErr } = await supabase
    .from('absences')
    .delete()
    .eq('id', absenceId)
    .eq('employee_id', employeeId)
    .eq('user_id', user.id)

  if (delErr) return NextResponse.json({ message: delErr.message }, { status: 400 })
  return NextResponse.json({ message: 'Deleted' }, { status: 200 })
}

// ---------- (optional) PATCH: Abwesenheit aktualisieren ----------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; absenceId: string }> }
) {
  const { id: employeeId, absenceId } = await params
  const supabase = await supabaseServer()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user)
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const updates = await req.json()
  const allowed = ['start_date', 'end_date', 'type', 'reason', 'document_path'] as const
  const body: Record<string, any> = {}
  for (const k of allowed) if (updates[k] !== undefined) body[k] = updates[k]

  const { data, error } = await supabase
    .from('absences')
    .update(body)
    .eq('id', absenceId)
    .eq('employee_id', employeeId)
    .eq('user_id', user.id)
    .select('*')

  if (error) return NextResponse.json({ message: error.message }, { status: 400 })
  if (!data?.length) return NextResponse.json({ message: 'Not found' }, { status: 404 })
  return NextResponse.json(data[0], { status: 200 })
}

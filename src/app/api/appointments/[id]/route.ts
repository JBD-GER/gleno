// ✅ PFAD: src/app/api/appointments/[id]/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server'

async function resolveCompanyId(userId: string): Promise<{ companyId: string; employeeId?: string }> {
  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('id,user_id')
    .eq('auth_user_id', userId)
    .maybeSingle()
  return { companyId: emp?.user_id ?? userId, employeeId: emp?.id ?? undefined }
}

async function assertEmployeesBelongToCompany(employeeIds: string[], companyId: string) {
  if (!employeeIds?.length) return
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('id')
    .eq('user_id', companyId)
    .in('id', employeeIds)
  if (error) throw error
  const found = new Set((data ?? []).map((e) => e.id))
  const missing = employeeIds.filter((id) => !found.has(id))
  if (missing.length) throw new Error('Mindestens ein zugewiesener Mitarbeiter gehört nicht zur Firma.')
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await supabaseServer()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 401 })

  try {
    const { companyId } = await resolveCompanyId(user.id)

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        id,
        reason,
        title,
        location,
        start_time,
        end_time,
        notes,
        customer_id,
        customer:customers ( first_name, last_name ),
        employees:appointment_employees (
          employee_id,
          employees ( first_name, last_name )
        ),
        documents:appointment_documents ( id, path, name, size, uploaded_at ),
        extra_notes:appointment_notes ( id, content, created_at, created_by )
      `)
      .eq('user_id', companyId)
      .eq('id', id)
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Fehler'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await supabaseServer()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 401 })

  const body = await request.json() as {
    reason?: string | null
    title?: string | null
    location?: string
    start_time?: string
    end_time?: string
    notes?: string | null
    customer_id?: string
    employee_ids?: string[]
    project_id?: string | null
  }

  const updatePayload: Record<string, any> = {}
  if (body.reason !== undefined)      updatePayload.reason = body.reason
  if (body.title !== undefined)       updatePayload.title = body.title
  if (body.location !== undefined)    updatePayload.location = body.location
  if (body.start_time !== undefined)  updatePayload.start_time = body.start_time
  if (body.end_time !== undefined)    updatePayload.end_time = body.end_time
  if (body.notes !== undefined)       updatePayload.notes = body.notes
  if (body.customer_id !== undefined) updatePayload.customer_id = body.customer_id
  if (body.project_id !== undefined)  updatePayload.project_id = body.project_id

  try {
    const { companyId } = await resolveCompanyId(user.id)

    // Termin gehört zur Firma?
    const { data: appt, error: apptErr } = await supabaseAdmin
      .from('appointments')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', companyId)
      .single()
    if (apptErr || !appt) throw new Error('Termin nicht gefunden oder nicht berechtigt.')

    // Basisfelder via RLS-Client updaten
    if (Object.keys(updatePayload).length) {
      const { error: updErr } = await supabase
        .from('appointments')
        .update(updatePayload)
        .eq('id', id)
        .eq('user_id', companyId)
      if (updErr) throw updErr
    }

    // Mitarbeiter-Zuordnungen ersetzen
    if (body.employee_ids) {
      await assertEmployeesBelongToCompany(body.employee_ids, companyId)

      const { error: delErr } = await supabaseAdmin
        .from('appointment_employees')
        .delete()
        .eq('appointment_id', id)
      if (delErr) throw delErr

      if (body.employee_ids.length) {
        const rows = body.employee_ids.map((eid) => ({ appointment_id: id, employee_id: eid }))
        const { error: insErr } = await supabaseAdmin
          .from('appointment_employees')
          .insert(rows)
        if (insErr) throw insErr
      }
    }

    return NextResponse.json({ status: 'updated' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Fehler'
    return NextResponse.json({ message }, { status: 500 })
  }
}

// PUT delegiert auf PATCH
export async function PUT(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  return PATCH(request, ctx)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await supabaseServer()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 401 })

  try {
    const { companyId } = await resolveCompanyId(user.id)
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)
      .eq('user_id', companyId)
    if (error) throw error

    // optional: aufräumen
    await supabaseAdmin.from('appointment_employees').delete().eq('appointment_id', id)

    return NextResponse.json({ status: 'deleted' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Fehler'
    return NextResponse.json({ message }, { status: 500 })
  }
}

// app/api/appointments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server'

/** Firmen-/Owner-ID (companyId) für eingeloggten User ermitteln */
async function resolveCompanyId(userId: string): Promise<{ companyId: string; employeeId?: string }> {
  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('id,user_id')
    .eq('auth_user_id', userId)
    .maybeSingle()
  return { companyId: emp?.user_id ?? userId, employeeId: emp?.id ?? undefined }
}

/** Prüft, ob wirklich alle employee_ids zur companyId gehören */
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
  if (missing.length) {
    throw new Error('Mindestens ein zugewiesener Mitarbeiter gehört nicht zur Firma.')
  }
}

/**
 * GET /api/appointments?employee_id=all|<uuid>&from=<iso>&to=<iso>
 */
export async function GET(request: NextRequest) {
  const supabase = await supabaseServer()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 401 })

  const search = request.nextUrl.searchParams
  const employeeId = (search.get('employee_id') || 'all').trim()
  const fromISO = search.get('from') || undefined
  const toISO = search.get('to') || undefined

  const baseFields = `
    id,
    reason,
    title,
    location,
    start_time,
    end_time,
    notes,
    customer:customers ( first_name, last_name )
  `

  try {
    const { companyId } = await resolveCompanyId(user.id)

    let query
    if (employeeId !== 'all') {
      query = supabaseAdmin
        .from('appointments')
        .select(
          baseFields + `,
          employees:appointment_employees!inner (
            employee_id,
            employees ( first_name, last_name )
          )`
        )
        .eq('user_id', companyId)
        .eq('appointment_employees.employee_id', employeeId)
    } else {
      query = supabaseAdmin
        .from('appointments')
        .select(
          baseFields + `,
          employees:appointment_employees (
            employees ( first_name, last_name )
          )`
        )
        .eq('user_id', companyId)
    }

    if (fromISO) query = query.gte('start_time', fromISO)
    if (toISO)  query = query.lte('start_time', toISO)

    const { data, error } = await query.order('start_time', { ascending: true })
    if (error) throw error

    return NextResponse.json(data ?? [])
  } catch (err: any) {
    return NextResponse.json({ message: err.message ?? 'Fehler' }, { status: 500 })
  }
}

/**
 * POST /api/appointments
 * Body: { reason?, title?, location, start_time, end_time, notes?, customer_id, employee_ids[], project_id? }
 */
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 401 })

  const {
    reason, title, location, start_time, end_time, notes,
    customer_id, employee_ids, project_id,
  } = (await request.json()) as {
    reason?: string | null
    title?: string | null
    location: string
    start_time: string
    end_time: string
    notes?: string | null
    customer_id: string
    employee_ids: string[]
    project_id?: string | null
  }

  try {
    const { companyId } = await resolveCompanyId(user.id)

    // 1) Termin anlegen (mit companyId)
    const { data: appt, error: apptErr } = await supabase
      .from('appointments')
      .insert([{
        user_id: companyId,
        reason: reason ?? null,
        title: title ?? null,
        location,
        start_time,
        end_time,
        notes: notes ?? null,
        customer_id,
        project_id: project_id ?? null,
      }])
      .select('id, user_id')
      .single()
    if (apptErr || !appt) throw new Error(apptErr?.message ?? 'Einfügen fehlgeschlagen')

    // 2) employee_ids prüfen & über Admin einfügen (umgeht RLS, aber vorher verifiziert)
    if (employee_ids?.length) {
      await assertEmployeesBelongToCompany(employee_ids, companyId)
      const rows = employee_ids.map((eid) => ({ appointment_id: appt.id, employee_id: eid }))
      const { error: joinErr } = await supabaseAdmin.from('appointment_employees').insert(rows)
      if (joinErr) throw joinErr
    }

    return NextResponse.json({ id: appt.id }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ message: err.message ?? 'Fehler' }, { status: 500 })
  }
}

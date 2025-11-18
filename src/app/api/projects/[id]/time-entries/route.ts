// app/api/projects/[id]/time-entries/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

type ParamsP = Promise<{ id: string }>

async function getSupaUser() {
  const supa = await supabaseServer()
  const {
    data: { user },
    error,
  } = await supa.auth.getUser()

  return { supa, user, error }
}

/**
 * GET /api/projects/:id/time-entries?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Liefert alle Zeiteinträge für dieses Projekt (+ Mitarbeitername),
 * gefiltert nach work_date.
 */
export async function GET(req: Request, { params }: { params: ParamsP }) {
  const { id: projectId } = await params
  const { supa, user } = await getSupaUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Nur Projekt-Mitglieder dürfen Zeiten sehen
  const { data: isMember } = await supa.rpc('is_project_member', {
    p_project_id: projectId,
  })

  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Query-Parameter from/to
  const url = new URL(req.url)
  const fromParam = url.searchParams.get('from')
  const toParam = url.searchParams.get('to')

  const today = new Date()
  const defaultTo = today.toISOString().slice(0, 10)
  const dFrom = new Date(today)
  dFrom.setDate(dFrom.getDate() - 30)
  const defaultFrom = dFrom.toISOString().slice(0, 10)

  const from = fromParam || defaultFrom
  const to = toParam || defaultTo

  // Daten aus bestehender Tabelle `time_entries` holen
  const { data, error } = await supa
    .from('time_entries')
    .select(
      `
      id,
      user_id,
      employee_id,
      project_id,
      work_date,
      start_time,
      end_time,
      break_minutes,
      notes,
      created_at,
      updated_at,
      employee:employees ( id, first_name, last_name )
    `,
    )
    .eq('project_id', projectId)
    .gte('work_date', from)
    .lte('work_date', to)
    .order('work_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const rows =
    (data ?? []).map((row: any) => {
      const empName = row.employee
        ? `${row.employee.first_name ?? ''} ${
            row.employee.last_name ?? ''
          }`.trim() || null
        : null

      return {
        id: row.id,
        user_id: row.user_id,
        employee_id: row.employee_id,
        employee_name: empName,
        project_id: row.project_id,
        work_date: row.work_date,
        start_time: row.start_time,
        end_time: row.end_time,
        break_minutes: row.break_minutes ?? 0,
        notes: row.notes ?? null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }
    }) ?? []

  return NextResponse.json(rows, { status: 200 })
}

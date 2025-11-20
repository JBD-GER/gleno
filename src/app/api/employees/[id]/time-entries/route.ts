// src/app/api/employees/[id]/time-entries/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const revalidate = 0
export const dynamic = 'force-dynamic'

// GET /api/employees/:id/time-entries?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await ctx.params
    const supa = await supabaseServer()
    const {
      data: { user },
      error,
    } = await supa.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let from = req.nextUrl.searchParams.get('from') || ''
    let to = req.nextUrl.searchParams.get('to') || ''

    // Mitarbeiter gehört zum eingeloggten Account?
    const { data: emp } = await supa
      .from('employees')
      .select('id')
      .eq('id', employeeId)
      .eq('user_id', user.id)
      .single()

    if (!emp) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Query aufbauen (ohne zusätzlichen user_id-Filter)
    let q = supa
      .from('time_entries')
      .select(`
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
        project:projects ( id, title )
      `)
      .eq('employee_id', employeeId)
      .order('work_date', { ascending: false })
      .order('start_time', { ascending: false })

    if (from) q = q.gte('work_date', from)
    if (to) q = q.lte('work_date', to)

    const { data, error: listErr } = await q
    if (listErr) {
      return NextResponse.json(
        { error: listErr.message },
        { status: 400 }
      )
    }

    return NextResponse.json(data ?? [], {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Server error' },
      { status: 500 }
    )
  }
}

// POST /api/employees/:id/time-entries
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await ctx.params
    const supa = await supabaseServer()
    const {
      data: { user },
      error,
    } = await supa.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Mitarbeiter gehört zum eingeloggten Account?
    const { data: emp } = await supa
      .from('employees')
      .select('id')
      .eq('id', employeeId)
      .eq('user_id', user.id)
      .single()

    if (!emp) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!body.work_date) {
      return NextResponse.json(
        { error: 'work_date ist erforderlich' },
        { status: 400 }
      )
    }

    const nowIso = new Date().toISOString()

    const payload = {
      user_id: user.id, // neue Einträge bekommen user_id
      employee_id: employeeId,
      work_date: body.work_date, // YYYY-MM-DD
      start_time: body.start_time ?? null,
      end_time: body.end_time ?? null,
      break_minutes: Number(body.break_minutes || 0),
      notes: body.notes ?? null,
      project_id: body.project_id ?? null,
      created_at: nowIso,
      updated_at: nowIso,
    }

    const { data: inserted, error: insErr } = await supa
      .from('time_entries')
      .insert(payload)
      .select(`
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
        project:projects ( id, title )
      `)
      .single()

    if (insErr) {
      return NextResponse.json(
        { error: insErr.message },
        { status: 400 }
      )
    }

    return NextResponse.json(inserted, { status: 201 })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Server error' },
      { status: 500 }
    )
  }
}

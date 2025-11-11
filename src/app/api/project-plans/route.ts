import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

type BodyCreate = {
  project_id: string
  start_date: string
  end_date: string
  color?: string
  status?: 'open' | 'done'
}

export async function GET() {
  const supa = await supabaseServer()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supa
    .from('project_plans')
    .select(`
      id, project_id, start_date, end_date, color, status, created_at, updated_at,
      projects(
        id, title, customer_id,
        customers(id, first_name, last_name)
      )
    `)
    .eq('user_id', user.id)
    .order('start_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const rows = (data ?? []).map((r: any) => ({
    id: r.id,
    project_id: r.project_id,
    start_date: r.start_date,
    end_date: r.end_date,
    color: r.color,
    status: r.status as 'open' | 'done',
    title: r.projects?.title ?? '',
    customer: r.projects?.customers
      ? `${r.projects.customers.first_name ?? ''} ${r.projects.customers.last_name ?? ''}`.trim()
      : '—',
  }))

  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const supa = await supabaseServer()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: BodyCreate
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { project_id, start_date, end_date, color = '#3b82f6', status = 'open' } = body || {}
  if (!project_id || !start_date || !end_date) {
    return NextResponse.json({ error: 'project_id, start_date und end_date sind erforderlich' }, { status: 400 })
  }
  if (new Date(end_date) < new Date(start_date)) {
    return NextResponse.json({ error: 'end_date muss >= start_date sein' }, { status: 400 })
  }

  const { data: proj, error: projErr } = await supa
    .from('projects')
    .select('id, user_id')
    .eq('id', project_id)
    .single()
  if (projErr || !proj) return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })

  const { data: inserted, error } = await supa
    .from('project_plans')
    .insert({
      user_id: user.id,
      project_id,
      start_date,
      end_date,
      color,
      status,
      completed_at: status === 'done' ? new Date().toISOString() : null
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: inserted?.id }, { status: 201 })
}

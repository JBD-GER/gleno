// src/app/api/todos/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: Request) {
  const supabase = await supabaseServer()
  const { searchParams } = new URL(req.url)

  const page = Number(searchParams.get('page') ?? '1')
  const limit = Number(searchParams.get('limit') ?? '50')
  const status = searchParams.get('status') // 'open' | 'in_progress' | 'done' | null
  const projectId = searchParams.get('projectId')
  const employeeId = searchParams.get('employeeId')
  const q = searchParams.get('q')?.trim() || ''

  const from = (page - 1) * limit
  const to = from + limit - 1

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let query = supabase
    .from('todos')
    .select(
      `
      id,
      user_id,
      title,
      description,
      status,
      due_date,
      project_id,
      employee_id,
      completed_at,
      created_at,
      updated_at,
      project:projects (id, title),
      employee:employees (id, first_name, last_name)
    `,
      { count: 'exact' }
    )
    .eq('user_id', user.id)
    .order('status', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  if (employeeId) {
    query = query.eq('employee_id', employeeId)
  }

  if (q) {
    query = query.ilike('title', `%${q}%`)
  }

  const { data, error, count } = await query.range(from, to)

  if (error) {
    console.error('GET /api/todos error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data,
    page,
    limit,
    count: count ?? 0,
  })
}

export async function POST(req: Request) {
  const supabase = await supabaseServer()
  const body = await req.json().catch(() => null)

  if (!body || !body.title?.trim()) {
    return NextResponse.json(
      { error: 'Titel ist erforderlich.' },
      { status: 400 }
    )
  }

  const { title, description, due_date, project_id, employee_id } = body

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const insertPayload = {
    user_id: user.id,
    title: title.trim(),
    description: description?.trim() || null,
    status: 'open' as const,
    due_date: due_date || null,
    project_id: project_id || null,
    employee_id: employee_id || null,
  }

  const { data, error } = await supabase
    .from('todos')
    .insert(insertPayload)
    .select(
      `
      id,
      user_id,
      title,
      description,
      status,
      due_date,
      project_id,
      employee_id,
      completed_at,
      created_at,
      updated_at,
      project:projects (id, title),
      employee:employees (id, first_name, last_name)
    `
    )
    .single()

  if (error) {
    console.error('POST /api/todos error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}

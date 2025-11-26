// src/app/api/todos/[id]/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

type Params = { params: { id: string } }

export async function PATCH(req: Request, { params }: Params) {
  const supabase = await supabaseServer()
  const { id } = params
  const body = await req.json().catch(() => ({} as any))

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const fields: any = {}
  if (typeof body.title === 'string') fields.title = body.title.trim()
  if (typeof body.description === 'string')
    fields.description = body.description.trim() || null
  if (body.due_date !== undefined) fields.due_date = body.due_date || null
  if (body.project_id !== undefined)
    fields.project_id = body.project_id || null
  if (body.employee_id !== undefined)
    fields.employee_id = body.employee_id || null

  // Status / Done-Toggle
  if (body.status) {
    fields.status = body.status
    if (body.status === 'done') {
      fields.completed_at = new Date().toISOString()
    } else if (body.status === 'open') {
      fields.completed_at = null
    }
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json(
      { error: 'Keine Felder zum Aktualisieren.' },
      { status: 400 }
    )
  }

  fields.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('todos')
    .update(fields)
    .eq('id', id)
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
    console.error('PATCH /api/todos/[id] error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function DELETE(_req: Request, { params }: Params) {
  const supabase = await supabaseServer()
  const { id } = params

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { error } = await supabase.from('todos').delete().eq('id', id)

  if (error) {
    console.error('DELETE /api/todos/[id] error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

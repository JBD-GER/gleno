import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

type BodyUpdate = Partial<{
  start_date: string
  end_date: string
  color: string
  status: 'open' | 'done'
}>

/**
 * Next.js: context.params ist async in Route Handlers.
 * => { params }: { params: Promise<{ id: string }> }
 * => const { id } = await params
 */

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supa = await supabaseServer()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: BodyUpdate
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.start_date && body.end_date && new Date(body.end_date) < new Date(body.start_date)) {
    return NextResponse.json({ error: 'end_date must be >= start_date' }, { status: 400 })
  }

  const patch: any = { ...body }
  if (typeof body.status !== 'undefined') {
    patch.completed_at = body.status === 'done' ? new Date().toISOString() : null
  }

  const { error } = await supa
    .from('project_plans')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supa = await supabaseServer()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supa
    .from('project_plans')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

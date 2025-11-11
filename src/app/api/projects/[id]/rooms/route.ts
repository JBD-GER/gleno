import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await ctx.params
  const supa = await supabaseServer()
  const { data: { user }, error: authErr } = await supa.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: isOwner } = await supa.rpc('is_project_owner', { p_project_id: projectId })
  if (!isOwner) return NextResponse.json({ error: 'Only owner can create rooms' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  const { name, width, length, notes, tasks = [], materials = [] } = body as {
    name: string; width?: number|null; length?: number|null; notes?: string|null;
    tasks?: { work: string; description?: string }[];
    materials?: { material_id: string; quantity?: number; notes?: string }[];
  }

  // Raum anlegen
  const { data: room, error: rErr } = await supa
    .from('project_rooms')
    .insert({
      project_id: projectId,
      name,
      width: width ?? null,
      length: length ?? null,
      notes: notes ?? null
    })
    .select('id')
    .single()
  if (rErr || !room) return NextResponse.json({ error: rErr?.message ?? 'room insert failed' }, { status: 400 })

  const room_id = room.id

  // Tasks (nur sinnvolle)
  const taskRows = (tasks ?? [])
    .filter(t => (t.work ?? '').trim().length > 0)
    .map(t => ({ room_id, work: t.work, description: t.description ?? '' }))

  if (taskRows.length) {
    const { error } = await supa.from('project_room_tasks').insert(taskRows)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Materials (nur sinnvolle)
  const matRows = (materials ?? [])
    .filter(m => (m.material_id ?? '') !== '')
    .map(m => ({ room_id, material_id: m.material_id, quantity: m.quantity ?? 0, notes: m.notes ?? '' }))

  if (matRows.length) {
    const { error } = await supa.from('project_room_materials').insert(matRows)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, room_id })
}

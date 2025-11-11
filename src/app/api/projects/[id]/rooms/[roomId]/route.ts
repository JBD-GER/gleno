import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function PUT(req: Request, ctx: { params: Promise<{ id: string; roomId: string }> }) {
  const { roomId } = await ctx.params
  const supa = await supabaseServer()
  const { data: { user }, error: authErr } = await supa.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Raum -> Projekt holen & Owner prüfen
  const { data: roomRow, error: rErr } = await supa
    .from('project_rooms')
    .select('project_id')
    .eq('id', roomId)
    .single()
  if (rErr || !roomRow) return NextResponse.json({ error: rErr?.message ?? 'Room not found' }, { status: 404 })

  const { data: isOwner } = await supa.rpc('is_project_owner', { p_project_id: roomRow.project_id })
  if (!isOwner) return NextResponse.json({ error: 'Only owner' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  const { name, width, length, notes, tasks = [], materials = [] } = body as {
    name: string; width?: number|null; length?: number|null; notes?: string|null;
    tasks?: { id?: string; work: string; description?: string }[];
    materials?: { id?: string; material_id: string; quantity?: number; notes?: string }[];
  }

  // Raum updaten
  const { error: uErr } = await supa
    .from('project_rooms')
    .update({ name, width: width ?? null, length: length ?? null, notes: notes ?? null })
    .eq('id', roomId)
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 400 })

  // ===== Tasks: upsert + diff-delete =====
  const { data: existingTasks } =
    await supa.from('project_room_tasks').select('id').eq('room_id', roomId)

  const keepTaskIds = new Set<string>()
  const upsertTasks = (tasks ?? [])
    .filter(t => (t.work ?? '').trim().length > 0)
    .map(t => {
      const row: any = {
        room_id: roomId,
        work: t.work,
        description: t.description ?? ''
      }
      if (t.id) { row.id = t.id; keepTaskIds.add(t.id) }  // <-- id nur setzen, wenn vorhanden
      return row
    })

  if (upsertTasks.length) {
    const { error } = await supa
      .from('project_room_tasks')
      .upsert(upsertTasks, { onConflict: 'id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const toDeleteTaskIds = (existingTasks ?? [])
    .map(t => t.id)
    .filter((id: string) => !keepTaskIds.has(id))

  if (toDeleteTaskIds.length) {
    const { error } = await supa
      .from('project_room_tasks')
      .delete()
      .in('id', toDeleteTaskIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // ===== Materials: upsert + diff-delete =====
  const { data: existingMats } =
    await supa.from('project_room_materials').select('id').eq('room_id', roomId)

  const keepMatIds = new Set<string>()
  const upsertMats = (materials ?? [])
    .filter(m => (m.material_id ?? '') !== '')
    .map(m => {
      const row: any = {
        room_id: roomId,
        material_id: m.material_id,
        quantity: m.quantity ?? 0,
        notes: m.notes ?? ''
      }
      if (m.id) { row.id = m.id; keepMatIds.add(m.id) }    // <-- id nur setzen, wenn vorhanden
      return row
    })

  if (upsertMats.length) {
    const { error } = await supa
      .from('project_room_materials')
      .upsert(upsertMats, { onConflict: 'id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const toDeleteMatIds = (existingMats ?? [])
    .map(m => m.id)
    .filter((id: string) => !keepMatIds.has(id))

  if (toDeleteMatIds.length) {
    const { error } = await supa
      .from('project_room_materials')
      .delete()
      .in('id', toDeleteMatIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; roomId: string }> }) {
  const { roomId } = await ctx.params
  const supa = await supabaseServer()
  const { data: { user }, error: authErr } = await supa.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: roomRow, error: rErr } = await supa
    .from('project_rooms')
    .select('project_id')
    .eq('id', roomId)
    .single()
  if (rErr || !roomRow) return NextResponse.json({ error: rErr?.message ?? 'Room not found' }, { status: 404 })

  const { data: isOwner } = await supa.rpc('is_project_owner', { p_project_id: roomRow.project_id })
  if (!isOwner) return NextResponse.json({ error: 'Only owner' }, { status: 403 })

  // falls kein ON DELETE CASCADE
  await supa.from('project_room_materials').delete().eq('room_id', roomId)
  await supa.from('project_room_tasks').delete().eq('room_id', roomId)
  const { error } = await supa.from('project_rooms').delete().eq('id', roomId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}

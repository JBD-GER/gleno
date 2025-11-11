import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

type ParamsP = Promise<{ id: string }>

async function getSupaUser() {
  const supa = await supabaseServer()
  const { data: { user }, error } = await supa.auth.getUser()
  return { supa, user, error }
}

/** DETAIL: Projekt laden (RLS: nur Member sehen es) */
export async function GET(_req: Request, { params }: { params: ParamsP }) {
  const { id } = await params
  const { supa, user } = await getSupaUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // optional „höflicher“ 403 statt einfach leere Antwort
  const { data: isMember } = await supa.rpc('is_project_member', { p_project_id: id })
  if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supa
    .from('projects')
    .select(`
      id, user_id, customer_id, title, description, address, object_name, floor, created_at, updated_at,
      customer:customers ( id, first_name, last_name ),
      assignees:project_assignees ( employee_id, employees ( id, first_name, last_name ) ),
      project_offers ( offer_id, offers ( id, offer_number ) ),
      project_documents ( id, path, name, size, uploaded_at ),
      project_before_images ( id, path, uploaded_at ),
      project_after_images ( id, path, uploaded_at ),
      project_comments ( id, user_id, content, created_at ),
      project_rooms (
        id, name, width, length, notes,
        project_room_tasks ( id, work, description ),
        project_room_materials ( id, material_id, quantity, notes, materials ( id, name, unit ) )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

/** PATCH: Nur Owner (Stammdaten) */
export async function PATCH(req: Request, { params }: { params: ParamsP }) {
  const { id } = await params
  const { supa, user } = await getSupaUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: isOwner } = await supa.rpc('is_project_owner', { p_project_id: id })
  if (!isOwner) return NextResponse.json({ error: 'Only owner can update project' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  const { title, description, address, object_name, floor } = body

  const { error } = await supa
    .from('projects')
    .update({
      title,
      description,
      address,
      object_name,
      floor,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

type RoomPayload = {
  name: string
  width?: number | null
  length?: number | null
  notes?: string | null
  tasks?: { work: string; description?: string }[]
  materials?: { material_id: string; quantity: number; notes?: string }[]
}

type ProjectUpdatePayload = {
  customer_id: string
  title: string
  description?: string
  address?: string
  object_name?: string
  floor?: string
  offer_ids?: string[]
  rooms?: RoomPayload[]
}

/** PUT: Nur Owner – vollständiges Ersetzen (Offers/Räume neu) */
export async function PUT(req: Request, { params }: { params: ParamsP }) {
  const { id } = await params
  const { supa, user } = await getSupaUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: isOwner } = await supa.rpc('is_project_owner', { p_project_id: id })
  if (!isOwner) return NextResponse.json({ error: 'Only owner can update project' }, { status: 403 })

  let body: ProjectUpdatePayload
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const { error: upErr } = await supa
    .from('projects')
    .update({
      customer_id: body.customer_id,
      title: body.title,
      description: body.description ?? null,
      address: body.address ?? null,
      object_name: body.object_name ?? null,
      floor: body.floor ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 })

  // Offers neu setzen
  await supa.from('project_offers').delete().eq('project_id', id)
  if (body.offer_ids?.length) {
    const { error } = await supa
      .from('project_offers')
      .insert(body.offer_ids.map(offer_id => ({ project_id: id, offer_id })))
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Räume komplett neu aufbauen
  const { data: oldRooms } = await supa.from('project_rooms').select('id').eq('project_id', id)
  if (oldRooms?.length) {
    const ids = oldRooms.map(r => r.id)
    await supa.from('project_room_tasks').delete().in('room_id', ids)
    await supa.from('project_room_materials').delete().in('room_id', ids)
    await supa.from('project_rooms').delete().eq('project_id', id)
  }

  if (body.rooms?.length) {
    for (const r of body.rooms) {
      const { data: room, error: roomErr } = await supa
        .from('project_rooms')
        .insert({ project_id: id, name: r.name, width: r.width ?? null, length: r.length ?? null, notes: r.notes ?? null })
        .select('id')
        .single()
      if (roomErr || !room) return NextResponse.json({ error: roomErr?.message ?? 'room insert failed' }, { status: 400 })

      const room_id = room.id

      if (r.tasks?.length) {
        const { error } = await supa
          .from('project_room_tasks')
          .insert(r.tasks.map(t => ({ room_id, work: t.work, description: t.description ?? '' })))
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      }

      if (r.materials?.length) {
        const { error } = await supa
          .from('project_room_materials')
          .insert(r.materials.map(m => ({ room_id, material_id: m.material_id, quantity: m.quantity, notes: m.notes ?? '' })))
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
  }

  return NextResponse.json({ success: true })
}

/** LÖSCHEN: Nur Owner */
export async function DELETE(_req: Request, { params }: { params: ParamsP }) {
  const { id } = await params
  const { supa, user } = await getSupaUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: isOwner } = await supa.rpc('is_project_owner', { p_project_id: id })
  if (!isOwner) return NextResponse.json({ error: 'Only owner can delete project' }, { status: 403 })

  const { error } = await supa.from('projects').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}

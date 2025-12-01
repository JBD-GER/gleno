// app/api/projects/[id]/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// Next.js 15: params sind ein Promise
type ParamsP = Promise<{ id: string }>

async function getSupaUser() {
  const supa = await supabaseServer()
  const {
    data: { user },
    error,
  } = await supa.auth.getUser()
  return { supa, user, error }
}

/** DETAIL: Projekt laden (RLS: nur Member sehen es) */
export async function GET(_req: Request, { params }: { params: ParamsP }) {
  const { id } = await params
  const { supa, user } = await getSupaUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Member-Check
  const { data: isMember } = await supa.rpc('is_project_member', {
    p_project_id: id,
  })
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 1) Projekt + Relationen (ohne todo-assignees)
  const { data: project, error } = await supa
    .from('projects')
    .select(
      `
      id,
      user_id,
      customer_id,
      kind,
      details,
      title,
      description,
      address,
      object_name,
      floor,
      created_at,
      updated_at,

      customer:customers (
        id,
        first_name,
        last_name
      ),

      project_offers (
        offer_id,
        offers (
          id,
          offer_number
        )
      ),

      project_todos (
        id,
        title,
        description,
        status,
        priority,
        due_date,
        created_at,
        offer_id,
        offers (
          id,
          offer_number
        )
      ),

      project_documents (
        id,
        path,
        name,
        size,
        uploaded_at
      ),

      project_before_images (
        id,
        path,
        uploaded_at
      ),

      project_after_images (
        id,
        path,
        uploaded_at
      ),

      project_comments (
        id,
        user_id,
        content,
        created_at
      ),

      project_rooms (
        id,
        name,
        width,
        length,
        notes,
        project_room_tasks (
          id,
          work,
          description
        ),
        project_room_materials (
          id,
          material_id,
          quantity,
          notes,
          materials (
            id,
            name,
            unit
          )
        )
      )
    `,
    )
    .eq('id', id)
    .single()

  if (error || !project) {
    return NextResponse.json(
      { error: error?.message ?? 'Not found' },
      { status: 404 },
    )
  }

  // 2) Projektweite Mitarbeitende laden (project_assignees)
  const { data: assRows } = await supa
    .from('project_assignees')
    .select(
      `
        employee_id,
        employees (
          id,
          first_name,
          last_name
        )
      `,
    )
    .eq('project_id', id)

  const assignees = assRows ?? []

  // 3) Todo-Assignees separat laden und nach todo_id gruppieren
  const todos = Array.isArray(project.project_todos)
    ? project.project_todos
    : []

  const todoIds = todos.map((t: any) => t.id).filter(Boolean)

  let todoAssigneeMap: Record<string, any[]> = {}

  if (todoIds.length) {
    const { data: todoAssRows } = await supa
      .from('project_todo_assignees')
      .select(
        `
        todo_id,
        employee_id,
        employees (
          id,
          first_name,
          last_name,
          email
        )
      `,
      )
      .in('todo_id', todoIds)

    for (const row of todoAssRows ?? []) {
      const tid = (row as any).todo_id
      if (!tid) continue
      if (!todoAssigneeMap[tid]) todoAssigneeMap[tid] = []
      todoAssigneeMap[tid].push(row)
    }
  }

  // Todos mit project_todo_assignees anreichern
  const enrichedTodos = todos.map((t: any) => ({
    ...t,
    project_todo_assignees: todoAssigneeMap[t.id] ?? [],
  }))

  const payload = {
    ...project,
    project_todos: enrichedTodos,
    assignees,
  }

  return NextResponse.json(payload)
}

/** PATCH: Nur Owner (Stammdaten + Offers-Links) */
export async function PATCH(req: Request, { params }: { params: ParamsP }) {
  const { id } = await params
  const { supa, user } = await getSupaUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: isOwner } = await supa.rpc('is_project_owner', {
    p_project_id: id,
  })
  if (!isOwner) {
    return NextResponse.json(
      { error: 'Only owner can update project' },
      { status: 403 },
    )
  }

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  const {
    title,
    description,
    address,
    object_name,
    floor,
    offer_ids,
  } = body as {
    title?: string
    description?: string
    address?: string
    object_name?: string
    floor?: string
    offer_ids?: string[]
  }

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }
  if (typeof title !== 'undefined') updateData.title = title
  if (typeof description !== 'undefined') updateData.description = description
  if (typeof address !== 'undefined') updateData.address = address
  if (typeof object_name !== 'undefined') updateData.object_name = object_name
  if (typeof floor !== 'undefined') updateData.floor = floor

  const { error: projErr } = await supa
    .from('projects')
    .update(updateData)
    .eq('id', id)

  if (projErr) {
    return NextResponse.json({ error: projErr.message }, { status: 400 })
  }

  if (Array.isArray(offer_ids)) {
    await supa.from('project_offers').delete().eq('project_id', id)

    if (offer_ids.length) {
      const { error } = await supa
        .from('project_offers')
        .insert(
          offer_ids.map((offer_id) => ({
            project_id: id,
            offer_id,
          })),
        )
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
  }

  return NextResponse.json({ ok: true })
}

/* ---------- PUT: vollständiger Replace (inkl. Räume/Offers/Assignees/Details) ---------- */

type RoomPayload = {
  name: string
  width?: number | null
  length?: number | null
  notes?: string | null
  tasks?: { work: string; description?: string }[]
  materials?: { material_id: string; quantity: number; notes?: string }[]
}

type ProjectUpdatePayload = {
  customer_id?: string | null
  title: string
  description?: string | null
  address?: string | null
  object_name?: string | null
  floor?: string | null
  offer_ids?: string[]
  rooms?: RoomPayload[]
  details?: Record<string, any>
  assignee_ids?: string[]
  kind?: 'general' | 'handwerk' | 'it' | string
}

/** PUT: Nur Owner – vollständiges Ersetzen (Offers neu, Räume optional, Assignees & Details inkl. todo_drafts) */
export async function PUT(req: Request, { params }: { params: ParamsP }) {
  const { id } = await params
  const { supa, user } = await getSupaUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: isOwner } = await supa.rpc('is_project_owner', {
    p_project_id: id,
  })
  if (!isOwner) {
    return NextResponse.json(
      { error: 'Only owner can update project' },
      { status: 403 },
    )
  }

  let body: ProjectUpdatePayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  const {
    customer_id,
    title,
    description,
    address,
    object_name,
    floor,
    offer_ids,
    rooms,
    details,
    assignee_ids,
    kind,
  } = body

  // Stamm-Daten + Details
  const updateData: Record<string, any> = {
    customer_id: customer_id ?? null,
    title,
    description: description ?? null,
    address: address ?? null,
    object_name: object_name ?? null,
    floor: floor ?? null,
    updated_at: new Date().toISOString(),
  }

  if (typeof details !== 'undefined') {
    updateData.details =
      details && typeof details === 'object' ? details : {}
  }

  if (typeof kind !== 'undefined') {
    updateData.kind = kind
  }

  const { error: upErr } = await supa
    .from('projects')
    .update(updateData)
    .eq('id', id)

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 400 })
  }

  // Assignees neu setzen, wenn mitgegeben
  if (Array.isArray(assignee_ids)) {
    await supa.from('project_assignees').delete().eq('project_id', id)

    if (assignee_ids.length) {
      const { error } = await supa
        .from('project_assignees')
        .insert(
          assignee_ids.map((employee_id) => ({
            project_id: id,
            employee_id,
          })),
        )

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
  }

  // Offers immer neu setzen
  await supa.from('project_offers').delete().eq('project_id', id)
  if (offer_ids?.length) {
    const { error } = await supa
      .from('project_offers')
      .insert(
        offer_ids.map((offer_id) => ({
          project_id: id,
          offer_id,
        })),
      )
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
  }

  // Räume nur dann löschen/neu anlegen, wenn "rooms" im Body vorhanden ist
  const hasRoomsField = Object.prototype.hasOwnProperty.call(body, 'rooms')

  if (hasRoomsField) {
    const roomPayloads = (rooms ?? []) as RoomPayload[]

    const { data: oldRooms } = await supa
      .from('project_rooms')
      .select('id')
      .eq('project_id', id)

    if (oldRooms?.length) {
      const ids = oldRooms.map((r) => r.id)
      await supa.from('project_room_tasks').delete().in('room_id', ids)
      await supa.from('project_room_materials').delete().in('room_id', ids)
      await supa.from('project_rooms').delete().eq('project_id', id)
    }

    if (roomPayloads.length) {
      for (const r of roomPayloads) {
        const { data: room, error: roomErr } = await supa
          .from('project_rooms')
          .insert({
            project_id: id,
            name: r.name,
            width: r.width ?? null,
            length: r.length ?? null,
            notes: r.notes ?? null,
            user_id: user.id,
          })
          .select('id')
          .single()

        if (roomErr || !room) {
          return NextResponse.json(
            { error: roomErr?.message ?? 'room insert failed' },
            { status: 400 },
          )
        }

        const room_id = room.id

        if (r.tasks?.length) {
          const { error } = await supa
            .from('project_room_tasks')
            .insert(
              r.tasks.map((t) => ({
                room_id,
                work: t.work,
                description: t.description ?? '',
              })),
            )
          if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
          }
        }

        if (r.materials?.length) {
          const { error } = await supa
            .from('project_room_materials')
            .insert(
              r.materials.map((m) => ({
                room_id,
                material_id: m.material_id,
                quantity: m.quantity ?? 0,
                notes: m.notes ?? '',
              })),
            )
          if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
          }
        }
      }
    }
  }

  return NextResponse.json({ success: true })
}

/** LÖSCHEN: Nur Owner */
export async function DELETE(_req: Request, { params }: { params: ParamsP }) {
  const { id } = await params
  const { supa, user } = await getSupaUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: isOwner } = await supa.rpc('is_project_owner', {
    p_project_id: id,
  })
  if (!isOwner) {
    return NextResponse.json(
      { error: 'Only owner can delete project' },
      { status: 403 },
    )
  }

  const { error } = await supa.from('projects').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}

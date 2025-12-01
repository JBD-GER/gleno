// src/app/api/projects/[id]/rooms/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

type RouteParams = {
  params: { id: string }
}

type TaskPayload = {
  work: string
  description?: string | null
}

type MaterialPayload = {
  material_id: string
  quantity?: number | null
  notes?: string | null
}

type RoomPayload = {
  name: string
  width?: number | null | string
  length?: number | null | string
  notes?: string | null
  tasks?: TaskPayload[]
  materials?: MaterialPayload[]
}

const toNumOrNull = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const projectId = params.id
    const body = (await req.json()) as RoomPayload

    const supa = await supabaseServer()
    const {
      data: { user },
      error: userError,
    } = await supa.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Nicht eingeloggt' },
        { status: 401 },
      )
    }

    // Projekt + Owner prüfen
    const { data: project, error: projError } = await supa
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .single()

    if (projError || !project) {
      return NextResponse.json(
        { error: 'Projekt nicht gefunden' },
        { status: 404 },
      )
    }

    if (project.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Kein Zugriff auf dieses Projekt' },
        { status: 403 },
      )
    }

    // Raum anlegen – Spalten passend zu project_rooms
    const roomInsert = {
      project_id: projectId,
      user_id: project.user_id, // FK auf auth.users
      name: body.name?.trim() || 'Unbenannter Bereich',
      width: toNumOrNull(body.width),
      length: toNumOrNull(body.length),
      notes: body.notes ?? null,
    }

    const { data: newRoom, error: roomError } = await supa
      .from('project_rooms')
      .insert(roomInsert)
      .select('id')
      .single()

    if (roomError || !newRoom) {
      console.error('Room insert error', roomError)
      return NextResponse.json(
        { error: 'Raum konnte nicht angelegt werden' },
        { status: 500 },
      )
    }

    const roomId = newRoom.id as string

    // Tasks (project_room_tasks: work, description)
    const tasks = (body.tasks ?? [])
      .filter((t) => t.work && t.work.trim() !== '')
      .map((t) => ({
        room_id: roomId,
        work: t.work.trim(),
        description: t.description ?? '',
      }))

    if (tasks.length > 0) {
      const { error: tErr } = await supa
        .from('project_room_tasks')
        .insert(tasks)

      if (tErr) {
        console.error('Task insert error', tErr)
        return NextResponse.json(
          { error: 'Arbeiten konnten nicht gespeichert werden' },
          { status: 500 },
        )
      }
    }

    // Materialien (project_room_materials: material_id, quantity, notes)
    const materials = (body.materials ?? [])
      .filter((m) => m.material_id)
      .map((m) => ({
        room_id: roomId,
        material_id: m.material_id,
        quantity: toNumOrNull(m.quantity) ?? 0,
        notes: m.notes ?? '',
      }))

    if (materials.length > 0) {
      const { error: mErr } = await supa
        .from('project_room_materials')
        .insert(materials)

      if (mErr) {
        console.error('Material insert error', mErr)
        return NextResponse.json(
          { error: 'Materialien konnten nicht gespeichert werden' },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({ id: roomId }, { status: 201 })
  } catch (e) {
    console.error('POST /api/projects/[id]/rooms error', e)
    return NextResponse.json(
      { error: 'Interner Fehler' },
      { status: 500 },
    )
  }
}

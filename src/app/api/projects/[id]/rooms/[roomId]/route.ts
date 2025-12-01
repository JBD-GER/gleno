// src/app/api/projects/[id]/rooms/[roomId]/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

type RouteParams = {
  params: Promise<{ id: string; roomId: string }>
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

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const { id: projectId, roomId } = await params
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

    // Raum updaten (nur Spalten, die es in project_rooms gibt)
    const roomUpdate = {
      name: body.name?.trim() || 'Unbenannter Bereich',
      width: toNumOrNull(body.width),
      length: toNumOrNull(body.length),
      notes: body.notes ?? null,
      updated_at: new Date().toISOString(),
    }

    const { error: roomError } = await supa
      .from('project_rooms')
      .update(roomUpdate)
      .eq('id', roomId)
      .eq('project_id', projectId)

    if (roomError) {
      console.error('Room update error', roomError)
      return NextResponse.json(
        { error: 'Raum konnte nicht aktualisiert werden' },
        { status: 500 },
      )
    }

    // Alte Tasks/Materialien löschen
    const { error: delTasksErr } = await supa
      .from('project_room_tasks')
      .delete()
      .eq('room_id', roomId)

    if (delTasksErr) {
      console.error('Delete room tasks error', delTasksErr)
      return NextResponse.json(
        { error: 'Alte Arbeiten konnten nicht gelöscht werden' },
        { status: 500 },
      )
    }

    const { error: delMatErr } = await supa
      .from('project_room_materials')
      .delete()
      .eq('room_id', roomId)

    if (delMatErr) {
      console.error('Delete room materials error', delMatErr)
      return NextResponse.json(
        { error: 'Alte Materialien konnten nicht gelöscht werden' },
        { status: 500 },
      )
    }

    // Neue Tasks
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
        console.error('Insert room tasks error', tErr)
        return NextResponse.json(
          { error: 'Arbeiten konnten nicht gespeichert werden' },
          { status: 500 },
        )
      }
    }

    // Neue Materialien
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
        console.error('Insert room materials error', mErr)
        return NextResponse.json(
          { error: 'Materialien konnten nicht gespeichert werden' },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e) {
    console.error('PUT /api/projects/[id]/rooms/[roomId] error', e)
    return NextResponse.json(
      { error: 'Interner Fehler' },
      { status: 500 },
    )
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const { id: projectId, roomId } = await params

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

    // Children löschen (falls keine ON DELETE CASCADE FKs definiert sind)
    const { error: tErr } = await supa
      .from('project_room_tasks')
      .delete()
      .eq('room_id', roomId)

    if (tErr) {
      console.error('Delete room tasks error', tErr)
      return NextResponse.json(
        { error: 'Arbeiten konnten nicht gelöscht werden' },
        { status: 500 },
      )
    }

    const { error: mErr } = await supa
      .from('project_room_materials')
      .delete()
      .eq('room_id', roomId)

    if (mErr) {
      console.error('Delete room materials error', mErr)
      return NextResponse.json(
        { error: 'Materialien konnten nicht gelöscht werden' },
        { status: 500 },
      )
    }

    const { error: roomErr } = await supa
      .from('project_rooms')
      .delete()
      .eq('id', roomId)
      .eq('project_id', projectId)

    if (roomErr) {
      console.error('Delete room error', roomErr)
      return NextResponse.json(
        { error: 'Raum konnte nicht gelöscht werden' },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e) {
    console.error('DELETE /api/projects/[id]/rooms/[roomId] error', e)
    return NextResponse.json(
      { error: 'Interner Fehler' },
      { status: 500 },
    )
  }
}

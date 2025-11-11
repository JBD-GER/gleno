// app/api/projects/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

/** Hilfsfunktion: ermittelt Firmen-Kontext des eingeloggten Users */
async function getEmployeeRecord() {
  const supa = await supabaseServer()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return { user: null as null, employee: null as null, companyId: null as null }

  // Ist der eingeloggte User ein Mitarbeiter?
  const { data: employee } = await supa
    .from('employees')
    .select('id, user_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  // companyId = Firmen-Owner-ID (bei Owner = user.id, bei Mitarbeiter = employees.user_id)
  const companyId = employee?.user_id ?? user.id
  return { user, employee, companyId }
}

/** Deduplication-Helfer für Assignees (nach employee_id) */
function dedupeAssignees(list: any[] | null | undefined) {
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  const out: any[] = []
  for (const a of list) {
    const id = a?.employee_id
    if (!id) continue
    if (seen.has(id)) continue
    seen.add(id)
    out.push(a)
  }
  return out
}

/** LISTE: Projekte (Owner: alle Firmenprojekte; Mitarbeiter: nur zugewiesene) */
export async function GET() {
  const supa = await supabaseServer()
  const { user, employee, companyId } = await getEmployeeRecord()
  if (!user || !companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // inkl. Assignees (über FK employee_id -> employees.id)
  const baseSelect = `
    id, title, created_at, user_id,
    customer:customers ( id, first_name, last_name ),
    project_rooms(count),
    project_documents(count),
    project_before_images(count),
    project_comments(count),
    assignees:project_assignees (
      employee_id,
      employees ( id, first_name, last_name )
    )
  `

  let idsFilter: string[] | null = null

  if (employee) {
    // Mitarbeiter sieht nur Projekte, denen er zugewiesen ist
    const { data: pa, error: paErr } = await supa
      .from('project_assignees')
      .select('project_id')
      .eq('employee_id', employee.id)

    if (paErr) {
      return NextResponse.json({ error: paErr.message }, { status: 400 })
    }
    idsFilter = (pa ?? []).map(r => r.project_id)
    if ((idsFilter?.length ?? 0) === 0) {
      return NextResponse.json([]) // keine Zuweisungen -> leere Liste
    }
  }

  // Firmenfilter (Owner-ID) + optional einschränken auf zugewiesene IDs
  let q = supa.from('projects').select(baseSelect).eq('user_id', companyId)
  if (idsFilter) q = q.in('id', idsFilter)

  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Deduplizieren der Assignees pro Projekt (defensiv, falls Altbestände existieren)
  const cleaned = (data ?? []).map(p => ({
    ...p,
    assignees: dedupeAssignees(p.assignees)
  }))

  return NextResponse.json(cleaned)
}

type RoomPayload = {
  name: string
  width?: number | null
  length?: number | null
  notes?: string | null
  tasks?: { work: string; description?: string }[]
  materials?: { material_id: string; quantity: number; notes?: string }[]
}

type ProjectCreatePayload = {
  customer_id: string
  title: string
  description?: string
  address?: string
  object_name?: string
  floor?: string
  offer_ids?: string[]
  assignee_ids?: string[]         // <- NEU: Mitarbeiter-Zuweisungen
  rooms?: RoomPayload[]
}

/** ANLEGEN: Nur Owner (Mitarbeiter sind geblockt) */
export async function POST(req: Request) {
  const supa = await supabaseServer()
  const { user, employee, companyId } = await getEmployeeRecord()
  if (!user || !companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (employee) {
    return NextResponse.json({ error: 'Only owner can create projects' }, { status: 403 })
  }

  let body: ProjectCreatePayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.customer_id || !body.title) {
    return NextResponse.json({ error: 'customer_id and title are required' }, { status: 400 })
  }

  // Projekt anlegen
  const { data: proj, error: insErr } = await supa
    .from('projects')
    .insert({
      user_id: companyId,
      customer_id: body.customer_id,
      title: body.title,
      description: body.description ?? null,
      address: body.address ?? null,
      object_name: body.object_name ?? null,
      floor: body.floor ?? null
    })
    .select('id')
    .single()

  if (insErr || !proj) {
    return NextResponse.json({ error: insErr?.message ?? 'Insert failed' }, { status: 400 })
  }
  const project_id = proj.id

  // (Sicherheitscheck) Assignee-IDs müssen zu dieser Firma gehören
  let safeAssigneeIds: string[] = []
  if (body.assignee_ids?.length) {
    const { data: employeesOfCompany, error: empErr } = await supa
      .from('employees')
      .select('id')
      .eq('user_id', companyId)
      .in('id', body.assignee_ids)

    if (empErr) return NextResponse.json({ error: empErr.message }, { status: 400 })
    safeAssigneeIds = (employeesOfCompany ?? []).map(e => e.id)
  }

  // Mitarbeiter-Zuweisungen: konfliktfrei via UPSERT (verhindert Duplikate)
  if (safeAssigneeIds.length) {
    const rows = safeAssigneeIds
      .filter(Boolean)
      .map(employee_id => ({ project_id, employee_id, assigned_by: user.id }))

    const { error } = await supa
      .from('project_assignees')
      .upsert(rows, { onConflict: 'project_id,employee_id' }) // <- wichtig gegen doppelte Einträge
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Offers (optional)
  if (body.offer_ids?.length) {
    const { error } = await supa
      .from('project_offers')
      .insert(body.offer_ids.map(offer_id => ({ project_id, offer_id })))
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Räume (optional)
  if (body.rooms?.length) {
    for (const r of body.rooms) {
      const { data: room, error: roomErr } = await supa
        .from('project_rooms')
        .insert({
          project_id,
          name: r.name,
          width: r.width ?? null,
          length: r.length ?? null,
          notes: r.notes ?? null
        })
        .select('id')
        .single()

      if (roomErr || !room) {
        return NextResponse.json({ error: roomErr?.message ?? 'room insert failed' }, { status: 400 })
      }

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
          .insert(r.materials.map(m => ({
            room_id,
            material_id: m.material_id,
            quantity: m.quantity,
            notes: m.notes ?? ''
          })))
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
  }

  return NextResponse.json({ id: project_id }, { status: 201 })
}

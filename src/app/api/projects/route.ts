// app/api/projects/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

type ProjectKind = 'general' | 'handwerk' | 'it'

/** Hilfsfunktion: ermittelt Firmen-Kontext des eingeloggten Users */
async function getEmployeeRecord() {
  const supa = await supabaseServer()
  const {
    data: { user },
  } = await supa.auth.getUser()

  if (!user) {
    return {
      supa,
      user: null as null,
      employee: null as null,
      companyId: null as null,
    }
  }

  // Ist der eingeloggte User ein Mitarbeiter?
  const { data: employee } = await supa
    .from('employees')
    .select('id, user_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  // companyId = Firmen-Owner-ID (bei Owner = user.id, bei Mitarbeiter = employees.user_id)
  const companyId = employee?.user_id ?? user.id

  return { supa, user, employee, companyId }
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
  const { supa, user, employee, companyId } = await getEmployeeRecord()
  if (!user || !companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseSelect = `
    id,
    title,
    created_at,
    user_id,
    kind,
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
    idsFilter = (pa ?? []).map((r) => r.project_id)
    if (!idsFilter.length) {
      return NextResponse.json([]) // keine Zuweisungen -> leere Liste
    }
  }

  let q = supa.from('projects').select(baseSelect).eq('user_id', companyId)
  if (idsFilter) q = q.in('id', idsFilter)

  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const cleaned = (data ?? []).map((p) => ({
    ...p,
    assignees: dedupeAssignees(p.assignees),
  }))

  return NextResponse.json(cleaned)
}

/* ---------- Typen für Create ---------- */

type RoomPayload = {
  name: string
  width?: number | null
  length?: number | null
  notes?: string | null
  tasks?: { work: string; description?: string }[]
  materials?: { material_id: string; quantity: number; notes?: string }[]
}

type TodoDraftPayload = {
  title: string
  description?: string | null
  assignee_ids?: string[]
}

/**
 * Body vom Frontend:
 * - bekannte Felder (customer_id, title, description, address, object_name, floor, offer_ids, assignee_ids, rooms, kind, details)
 * - details: { kind, general, handwerk, it, todo_drafts: [...] }
 */
type ProjectCreateBody = {
  customer_id?: string | null
  title?: string
  description?: string | null
  address?: string | null
  object_name?: string | null
  floor?: string | null
  offer_ids?: string[]
  assignee_ids?: string[]
  rooms?: RoomPayload[]
  kind?: ProjectKind
  details?: {
    kind?: ProjectKind
    general?: any
    handwerk?: any
    it?: any
    todo_drafts?: TodoDraftPayload[]
    [key: string]: any
  }
  // sonstige Felder ignorieren wir erstmal
  [key: string]: any
}

/** ANLEGEN: Nur Owner (Mitarbeiter sind geblockt) */
export async function POST(req: Request) {
  const { supa, user, employee, companyId } = await getEmployeeRecord()
  if (!user || !companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (employee) {
    return NextResponse.json(
      { error: 'Only owner can create projects' },
      { status: 403 },
    )
  }

  let raw: ProjectCreateBody
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    customer_id = null,
    title,
    description = null,
    address = null,
    object_name = null,
    floor = null,
    offer_ids = [],
    assignee_ids = [],
    rooms = [],
    kind: rawKind,
    details: rawDetails,
  } = raw

  if (!title || !title.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }
  if (!customer_id) {
    return NextResponse.json(
      { error: 'customer_id is required' },
      { status: 400 },
    )
  }

  const allowedKinds: ProjectKind[] = ['general', 'handwerk', 'it']
  const kind: ProjectKind = allowedKinds.includes(rawKind as ProjectKind)
    ? (rawKind as ProjectKind)
    : 'general'

  // Details exakt so speichern, wie das Frontend sie baut
  const safeDetails =
    rawDetails && typeof rawDetails === 'object' ? rawDetails : { kind }

  // Projekt anlegen
  const { data: proj, error: insErr } = await supa
    .from('projects')
    .insert({
      user_id: companyId,
      customer_id,
      title: title.trim(),
      description,
      address,
      object_name,
      floor,
      kind,
      details: safeDetails,
    })
    .select('id')
    .single()

  if (insErr || !proj) {
    return NextResponse.json(
      { error: insErr?.message ?? 'Insert failed' },
      { status: 400 },
    )
  }

  const project_id = proj.id

  /* ---------- Assignees (Mitarbeiter-Zuweisungen) ---------- */

  let safeAssigneeIds: string[] = []
  if (assignee_ids && assignee_ids.length) {
    const { data: employeesOfCompany, error: empErr } = await supa
      .from('employees')
      .select('id')
      .eq('user_id', companyId)
      .in('id', assignee_ids)

    if (empErr) {
      return NextResponse.json({ error: empErr.message }, { status: 400 })
    }
    safeAssigneeIds = (employeesOfCompany ?? []).map((e) => e.id)
  }

  if (safeAssigneeIds.length) {
    const rows = safeAssigneeIds.map((employee_id) => ({
      project_id,
      employee_id,
      assigned_by: user.id,
    }))

    const { error } = await supa
      .from('project_assignees')
      .upsert(rows, { onConflict: 'project_id,employee_id' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
  }

  /* ---------- Offers (optional) ---------- */

  if (offer_ids && offer_ids.length) {
    const { error } = await supa
      .from('project_offers')
      .insert(
        offer_ids.map((offer_id) => ({
          project_id,
          offer_id,
        })),
      )
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
  }

  /* ---------- Räume (optional) ---------- */

  if (rooms && rooms.length) {
    for (const r of rooms) {
      const { data: room, error: roomErr } = await supa
        .from('project_rooms')
        .insert({
          project_id,
          user_id: companyId,
          name: r.name,
          width: r.width ?? null,
          length: r.length ?? null,
          notes: r.notes ?? null,
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
              quantity: m.quantity,
              notes: m.notes ?? '',
            })),
          )
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 })
        }
      }
    }
  }

  /* ---------- Todo-Entwürfe -> project_todos / project_todo_assignees ---------- */

  const todoDrafts: TodoDraftPayload[] = Array.isArray(
    (safeDetails as any)?.todo_drafts,
  )
    ? ((safeDetails as any).todo_drafts as TodoDraftPayload[])
    : []

  if (todoDrafts.length) {
    let position = 0

    // allowed assignees der Firma für Todos (zur Sicherheit nochmal)
    const { data: employeesOfCompany, error: empErr } = await supa
      .from('employees')
      .select('id')
      .eq('user_id', companyId)

    if (empErr) {
      return NextResponse.json({ error: empErr.message }, { status: 400 })
    }

    const employeeIdSet = new Set((employeesOfCompany ?? []).map((e) => e.id))

    for (const td of todoDrafts) {
      if (!td.title || !td.title.trim()) continue

      position += 10

      const { data: todo, error: todoErr } = await supa
        .from('project_todos')
        .insert({
          project_id,
          title: td.title.trim(),
          description: td.description ?? null,
          status: 'open',
          priority: 0,
          position,
          created_by: user.id,
        })
        .select('id')
        .single()

      if (todoErr || !todo) {
        return NextResponse.json(
          { error: todoErr?.message ?? 'Todo insert failed' },
          { status: 400 },
        )
      }

      const todo_id = todo.id
      const assignee_ids_for_todo = Array.isArray(td.assignee_ids)
        ? td.assignee_ids.filter((id) => employeeIdSet.has(id))
        : []

      if (assignee_ids_for_todo.length) {
        const rows = assignee_ids_for_todo.map((employee_id) => ({
          todo_id,
          employee_id,
        }))

        const { error: assErr } = await supa
          .from('project_todo_assignees')
          .insert(rows)

        if (assErr) {
          return NextResponse.json(
            { error: assErr.message },
            { status: 400 },
          )
        }
      }
    }
  }

  // Wichtig für Frontend-Redirect: ID zurückgeben
  return NextResponse.json({ id: project_id }, { status: 201 })
}

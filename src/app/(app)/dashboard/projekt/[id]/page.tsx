import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import ProjectDetailClient from './ProjectDetailClient'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // <- hier jetzt korrekt mit await
  const { id } = await params

  const supabase = await supabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Member-Check
  const { data: isMember } = await supabase.rpc('is_project_member', {
    p_project_id: id,
  })
  if (!isMember) {
    redirect('/dashboard/projekt')
  }

  // 1) Projekt + Todos laden (ohne Todo-Assignees)
  const { data: project, error } = await supabase
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
    redirect('/dashboard/projekt')
  }

  // 2) Projektweite Assignees (project_assignees)
  const { data: assRows } = await supabase
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

  // 3) Todo-Assignees separat laden & mappen
  const todos = Array.isArray(project.project_todos)
    ? project.project_todos
    : []

  const todoIds = todos.map((t: any) => t.id).filter(Boolean)

  let todoAssigneeMap: Record<string, any[]> = {}

  if (todoIds.length) {
    const { data: todoAssRows } = await supabase
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

  const enrichedTodos = todos.map((t: any) => ({
    ...t,
    project_todo_assignees: todoAssigneeMap[t.id] ?? [],
  }))

  const projectWithAssignees = {
    ...project,
    project_todos: enrichedTodos,
    assignees,
  }

  // 4) An Client geben (volle Breite im bestehenden Layout)
  return <ProjectDetailClient project={projectWithAssignees} />
}

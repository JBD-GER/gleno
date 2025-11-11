// app/(app)/dashboard/projekt/[id]/page.tsx
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import ProjectDetailClient from './ProjectDetailClient'

type ParamsP = Promise<{ id: string }>

export default async function ProjectDetailPage({ params }: { params: ParamsP }) {
  const { id } = await params
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      id, user_id, customer_id, title, description, address, object_name, floor, created_at,
      customer:customers ( id, first_name, last_name ),
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

  if (error || !project) redirect('/dashboard/projekt')
  return <ProjectDetailClient project={project} />
}

// app/(app)/dashboard/projekt-erstellen/page.tsx
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import ProjectCreateClient from './ProjectCreateClient'

type SearchParams = {
  projectId?: string
}

type SearchParamsP = Promise<SearchParams>

export default async function ProjectCreatePage({
  searchParams,
}: {
  searchParams: SearchParamsP
}) {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { projectId } = await searchParams
  let initialProject: any = null
  let mode: 'create' | 'edit' = 'create'

  if (projectId) {
    // Member-Check – nur Mitglieder dürfen bearbeiten
    const { data: isMember } = await supabase.rpc('is_project_member', {
      p_project_id: projectId,
    })

    if (!isMember) {
      redirect('/dashboard/projekt')
    }

    const { data, error } = await supabase
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

        project_assignees (
          employee_id
        ),

        project_offers (
          offer_id
        )
      `,
      )
      .eq('id', projectId)
      .single()

    if (error || !data) {
      redirect('/dashboard/projekt')
    }

    initialProject = data
    mode = 'edit'
  }

  return <ProjectCreateClient mode={mode} initialProject={initialProject} />
}

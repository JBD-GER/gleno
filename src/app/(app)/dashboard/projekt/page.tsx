// app/(app)/dashboard/projekt/page.tsx
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import ProjectsClient from './ProjectsClient'

export default async function ProjektPage() {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <ProjectsClient userId={user.id} />
}

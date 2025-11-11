import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import PlannerClient from './PlannerClient'

export default async function ProjektPlanerPage() {
  const supa = await supabaseServer()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) redirect('/login')
  return <PlannerClient />
}

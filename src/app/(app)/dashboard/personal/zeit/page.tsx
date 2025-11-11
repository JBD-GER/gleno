import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import TimeTrackerPage from './TimeTrackerPage'

export default async function PersonalTimePage() {
  const supabase = await supabaseServer()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  // Volle Breite: kein zentrierendes max-width, nur etwas Padding
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <TimeTrackerPage />
    </div>
  )
}

// src/app/(app)/dashboard/cloud/page.tsx
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import CloudClient from './CloudClient'

export default async function CloudPage() {
  const supabase = await supabaseServer()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return (
    <div className="sm:px-6 lg:px-8">
      <CloudClient userId={user.id} userEmail={user.email ?? ''} />
    </div>
  )
}

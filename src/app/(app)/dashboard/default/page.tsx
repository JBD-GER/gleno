import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'

export default async function BeispielSeite() {
  const supabase = await supabaseServer()

  // Hole den verifizierten User (vermeidet Supabase-Warnung)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return (
    <div className="p-8 bg-white rounded-lg shadow">
      <h1 className="text-3xl font-bold text-primary mb-4">
        Willkommen, {user.email}
      </h1>
      <p className="text-text-600">
        Diese Seite ist geschützt und nur für eingeloggte Benutzer sichtbar.
      </p>
    </div>
  )
}

// src/app/(app)/dashboard/aktivitaet/page.tsx
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import ActivityLogClient from './ActivityLogClient'

export const metadata = {
  title: 'Aktivität – GLENO',
}

export default async function ActivityLogPage() {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-slate-900">
          Aktivität & Verlauf
        </h1>
        <p className="text-sm text-slate-500">
          Vollständiger Verlauf aller wichtigen Aktionen in Ihrem Account:
          Datenänderungen, Dokumente, E-Mails, Logins, Automationen & mehr.
        </p>
      </div>

      <ActivityLogClient />
    </div>
  )
}

import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import CalendarClient from './CalendarClient'
import { CalendarDaysIcon } from '@heroicons/react/24/outline'

export default async function CalendarPage() {
  const supabase = await supabaseServer()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  return (
    <div className="min-h-[100dvh] p-6 bg-[radial-gradient(1200px_350px_at_-10%_-30%,rgba(2,6,23,0.06),transparent_60%),radial-gradient(1200px_350px_at_110%_130%,rgba(15,23,42,0.08),transparent_60%),#e9edf4] text-slate-700">
      {/* HERO (Glass, clean dark) */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_40px_rgba(2,6,23,0.12)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(900px_220px_at_-10%_-20%,rgba(2,6,23,0.10),transparent_60%),radial-gradient(900px_220px_at_110%_120%,rgba(15,23,42,0.10),transparent_60%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-white/60 bg-white/80 p-2 shadow-sm">
              <CalendarDaysIcon className="h-6 w-6 text-slate-800" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">Kalender</h1>
              <p className="text-sm text-slate-600">
                Termine planen, nach Mitarbeitern filtern und Details im Glas-Modal öffnen.
              </p>
            </div>
          </div>

          {/* sekundäre Actions könnten hier später rein (z. B. iCal Import) */}
          <div className="flex flex-wrap items-center gap-2"></div>
        </div>
      </div>

      {/* CONTENT */}
      <CalendarClient />
    </div>
  )
}

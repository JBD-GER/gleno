// src/app/(app)/dashboard/kalender/page.tsx
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import CalendarClient from './CalendarClient'
import { CalendarDaysIcon } from '@heroicons/react/24/outline'

export default async function CalendarPage() {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(1200px_350px_at_-10%_-30%,rgba(2,6,23,0.06),transparent_60%),radial-gradient(1200px_350px_at_110%_130%,rgba(15,23,42,0.08),transparent_60%),#e9edf4] px-3 pb-6 pt-4 text-slate-700 sm:px-6 sm:pt-6">
      {/* HERO (Glass, clean) */}
      <div className="relative mb-4 overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_10px_40px_rgba(2,6,23,0.12)] backdrop-blur-xl sm:mb-6 sm:p-5">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(900px_220px_at_-10%_-20%,rgba(2,6,23,0.10),transparent_60%),radial-gradient(900px_220px_at_110%_120%,rgba(15,23,42,0.10),transparent_60%)]" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-white/60 bg-white/80 p-2 shadow-sm">
              <CalendarDaysIcon className="h-6 w-6 text-slate-800" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                Kalender
              </h1>
              <p className="text-xs text-slate-600 sm:text-sm">
                Termine planen, nach Mitarbeitern filtern und Details im Glas-Modal öffnen – optimiert für Desktop, Tablet und Handy.
              </p>
            </div>
          </div>

          {/* Platz für spätere Aktionen (Import, Sync, etc.) */}
          <div className="flex flex-wrap items-center justify-end gap-2 text-xs sm:text-sm" />
        </div>
      </div>

      {/* CONTENT */}
      <CalendarClient />
    </div>
  )
}

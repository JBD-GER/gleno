import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import FleetManager from './FleetManager'
import { TruckIcon } from '@heroicons/react/24/outline'

export default async function FuhrparkPage() {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      {/* volle Breite */}
      <div className="w-full space-y-4">
        <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/90 px-4 py-4 shadow-[0_14px_40px_rgba(15,23,42,0.26)] backdrop-blur-2xl sm:px-5 sm:py-5">
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(900px_240px_at_-10%_-20%,rgba(15,23,42,0.08),transparent_60%),radial-gradient(900px_240px_at_110%_120%,rgba(30,64,175,0.10),transparent_60%)]" />
          <div className="relative flex items-center gap-3">
            <div className="rounded-2xl border border-white/70 bg-white/90 p-2.5 shadow-sm">
              <TruckIcon className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Fuhrpark
              </h1>
              <p className="text-sm text-slate-600">
                Verwalten Sie Fahrzeuge, Schlüssel, Stellplätze, Status und
                Wartungen.
              </p>
            </div>
          </div>
        </div>

        <FleetManager />
      </div>
    </div>
  )
}

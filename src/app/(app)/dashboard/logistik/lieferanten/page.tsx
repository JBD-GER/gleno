import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import SuppliersManager from './SuppliersManager'
import { BuildingStorefrontIcon } from '@heroicons/react/24/outline'

export default async function LieferantenPage() {
  const supabase = await supabaseServer()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  return (
    <div className="min-h-[100dvh] p-6 bg-[radial-gradient(1200px_350px_at_-10%_-30%,rgba(15,23,42,0.05),transparent_60%),radial-gradient(1200px_350px_at_110%_130%,rgba(88,101,242,0.08),transparent_60%),#e8edf5] text-slate-700">
      {/* HERO (black/indigo blur glass) */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/50 bg-white/60 p-5 shadow-[0_10px_40px_rgba(2,6,23,0.12)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(800px_200px_at_-10%_-20%,rgba(15,23,42,0.08),transparent_60%),radial-gradient(800px_200px_at_110%_120%,rgba(88,101,242,0.10),transparent_60%)]" />
        <div className="relative flex items-center gap-3">
          <div className="rounded-lg border border-white/60 bg-white/80 p-2 text-slate-700 shadow-sm backdrop-blur">
            <BuildingStorefrontIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Lieferanten</h1>
            <p className="text-sm text-slate-600">Verwalte Partner, Kontaktinfos und Notizen.</p>
          </div>
        </div>
      </div>

      {/* KEINE große Hintergrund-Box – die Karten kommen direkt */}
      <SuppliersManager />
    </div>
  )
}

import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import ToolsManager from './ToolsManager'
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline'

export default async function WerkzeugPage() {
  const supabase = await supabaseServer()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  return (
    <div className="px-6 py-6">
      <header
        className="mb-4 flex items-center justify-between rounded-2xl border border-white/60 bg-white/80 p-4 shadow-[0_10px_30px_rgba(2,6,23,0.08)] backdrop-blur-xl"
        style={{ backgroundImage: 'radial-gradient(900px 360px at 120% -30%, rgba(15,23,42,0.06), transparent)' }}
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-white/60 bg-white/80 p-2 shadow-sm">
            <WrenchScrewdriverIcon className="h-6 w-6 text-slate-700" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Werkzeug</h1>
            <p className="text-sm text-slate-600">
              Verwalte Werkzeuge, Ausgabe, Prüfungen und Zustände.
            </p>
          </div>
        </div>
      </header>

      <div
        className="overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-4 shadow-[0_10px_40px_rgba(2,6,23,0.08)] backdrop-blur-xl sm:p-6"
        style={{ backgroundImage: 'radial-gradient(1100px 420px at 110% -20%, rgba(30,64,175,0.08), transparent)' }}
      >
        <ToolsManager />
      </div>
    </div>
  )
}

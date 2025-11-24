import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import ToolsManager from './ToolsManager'
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline'

export default async function WerkzeugPage() {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      {/* kein mx-auto / max-w */}
      <div className="w-full space-y-4">
        <header
          className="flex items-center justify-between rounded-3xl border border-white/70 bg-white/90 px-4 py-4 shadow-[0_14px_40px_rgba(15,23,42,0.26)] backdrop-blur-2xl sm:px-5 sm:py-5"
          style={{
            backgroundImage:
              'radial-gradient(900px 360px at 120% -30%, rgba(15,23,42,0.06), transparent)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/70 bg-white/90 p-2.5 shadow-sm">
              <WrenchScrewdriverIcon className="h-6 w-6 text-slate-800" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Werkzeug
              </h1>
              <p className="text-sm text-slate-600">
                Verwalte Werkzeuge, Ausgabe, Prüfungen und Zustände auf einen
                Blick.
              </p>
            </div>
          </div>
        </header>

        <section
          className="overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.30)] backdrop-blur-2xl sm:p-6"
          style={{
            backgroundImage:
              'radial-gradient(1100px 420px at 110% -20%, rgba(30,64,175,0.08), transparent)',
          }}
        >
          <ToolsManager />
        </section>
      </div>
    </div>
  )
}

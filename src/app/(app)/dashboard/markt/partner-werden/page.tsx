// app/partner-werden/page.tsx
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import PartnerOnboardingWizard from './wirzard/PartnerOnboardingWizard'
import { SparklesIcon } from '@heroicons/react/24/outline'

export const dynamic = 'force-dynamic'

export default async function PartnerWerdenPage() {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // ➜ Prüfen, ob bereits ein Partnerprofil existiert
  const { data: existing } = await supabase
    .from('partners')
    .select('id')
    .eq('owner_user_id', user.id)
    .maybeSingle()

  if (existing?.id) {
    // bereits Partner ➜ auf Bearbeiten-Seite
    redirect('/partner-bearbeiten')
  }

  return (
    <div className="min-h-[100dvh] w-full px-3 py-4 text-slate-700 sm:px-4 sm:py-6 lg:px-8 bg-[radial-gradient(1200px_350px_at_-10%_-30%,rgba(15,23,42,0.05),transparent_60%),radial-gradient(1200px_350px_at_110%_130%,rgba(15,23,42,0.08),transparent_60%),#e8edf5]">
      {/* Header-Karte */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.18)] backdrop-blur-2xl sm:p-5">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(800px_200px_at_-10%_-20%,rgba(15,23,42,0.08),transparent_60%),radial-gradient(800px_200px_at_110%_120%,rgba(15,23,42,0.10),transparent_60%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-[11px] font-medium text-slate-700 backdrop-blur">
              <SparklesIcon className="h-4 w-4 text-slate-900" />
              Onboarding &amp; Profilanalyse
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Partner werden
              </h1>
              <p className="mt-1 max-w-2xl text-xs text-slate-600 sm:text-sm">
                Beschreiben Sie Ihr Unternehmen oder fügen Sie Ihre Website ein. Die KI analysiert
                Ihre Seite, erkennt Branche, Kategorien, Leistungen und Kontaktdaten. Im Anschluss
                können Sie alles prüfen, anpassen und Ihre Services priorisieren (Summe = 100%).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Wizard – übernimmt die eigentliche Logik & Steps */}
      <div className="relative">
        <PartnerOnboardingWizard />
      </div>
    </div>
  )
}

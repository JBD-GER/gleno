// app/partner-werden/page.tsx
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import PartnerOnboardingWizard from './wirzard/PartnerOnboardingWizard'
import { SparklesIcon } from '@heroicons/react/24/outline'

export const dynamic = 'force-dynamic'

export default async function PartnerWerdenPage() {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
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
    <div className="min-h-[100dvh] p-6 bg-[radial-gradient(1200px_350px_at_-10%_-30%,rgba(15,23,42,0.05),transparent_60%),radial-gradient(1200px_350px_at_110%_130%,rgba(15,23,42,0.08),transparent_60%),#e8edf5] text-slate-700">
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/50 bg-white/60 p-5 shadow-[0_10px_40px_rgba(2,6,23,0.12)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(800px_200px_at_-10%_-20%,rgba(15,23,42,0.08),transparent_60%),radial-gradient(800px_200px_at_110%_120%,rgba(15,23,42,0.10),transparent_60%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-xs text-slate-700 backdrop-blur">
              <SparklesIcon className="h-4 w-4 text-slate-900" />
              Onboarding & Analyse
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Partner werden</h1>
            <p className="text-sm text-slate-600">
              Beschreibe dein Unternehmen oder füge Links ein. Die KI analysiert deine Website,
              erkennt Branche &amp; Kategorie, Leistungen und Kontaktdaten. Du kannst alles prüfen
              und Services priorisieren (Summe = 100%).
            </p>
          </div>
        </div>
      </div>

      <div className="relative">
        <PartnerOnboardingWizard />
      </div>
    </div>
  )
}

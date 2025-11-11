import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import ResponsiveShell from './components/ResponsiveShell'
import StripePaywallModal from './components/billing/StripePaywallModal'
import OnboardingGate from './components/OnboardingGate'


export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer()

  // 1) Session prüfen (eingeloggt?)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  // 2) Rolle sicher aus DB (profiles) lesen – NICHT user_metadata (kann stale sein)
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profErr) {
    // Fallback: wenn Profile nicht lesbar ist, zur Sicherheit zum Login
    redirect('/login')
  }

  // 3) Konsument darf hier NICHT rein
  if (profile?.role === 'konsument') {
    redirect('/konsument')
  }

  // 4) Alles andere (admin/partner/…): App laden
  return (
    <>
      <ResponsiveShell userEmail={session.user.email ?? ''}>
        {children}
      </ResponsiveShell>
      {/* Blockierende Paywall-Modal liegt ganz oben */}
      <StripePaywallModal />
      <OnboardingGate />
    </>
  )
}

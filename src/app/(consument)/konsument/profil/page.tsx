import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function ProfilPage() {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  const role = (user?.user_metadata as any)?.role || '—'

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Profil</h1>
      <div className="rounded-2xl border border-white/60 bg-white/80 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="E-Mail" value={user?.email || '—'} />
          <Field label="Rolle" value={role} />
          <Field label="Bestätigt seit" value={user?.email_confirmed_at ? new Date(user.email_confirmed_at).toLocaleString('de-DE') : '—'} />
          <Field label="User-ID" value={user?.id || '—'} />
        </div>
      </div>
    </section>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  )
}

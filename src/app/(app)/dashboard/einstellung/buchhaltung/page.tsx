// app/(app)/dashboard/einstellung/buchhaltung/page.tsx
import { redirect } from 'next/navigation'
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server'
import SettingsForm from './SettingsForm'
import TemplateSelector from './TemplateSelector'

export default async function BillingSettingsPage() {
  // 1) Hol dir user + settings via anon‑SSG‑Client
  const supa = await supabaseServer()
  const { data: { user }, error: authErr } = await supa.auth.getUser()
  if (authErr || !user) redirect('/login')

  let { data: settings, error } = await supa
    .from('billing_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code === 'PGRST116') {
    const { data: ins } = await supa
      .from('billing_settings')
      .insert([{ user_id: user.id }])
      .select('*')
      .single()
    settings = ins
  }

  // 2) Erzeuge serverseitig die Public URL der aktuellen Vorlage
  const { data: urlData } = supabaseAdmin
    .storage
    .from('rechnungvorlagen')
    .getPublicUrl(settings!.template)

  const previewUrl: string | null = urlData.publicUrl || null

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow my-8 space-y-8">
      <h1 className="text-3xl font-bold">Buchhaltungseinstellungen</h1>

      <SettingsForm initial={settings!} />

      <div>
        <label className="block font-medium mb-2">Gewählte Vorlage</label>
        <p className="mb-4">{settings!.template}</p>

        {/* --- PDF-Vorschau direkt hier --- */}
        {previewUrl ? (
          <div className="border rounded h-[500px] mb-6 overflow-hidden">
            <embed
              src={previewUrl}
              type="application/pdf"
              className="w-full h-full"
            />
          </div>
        ) : (
          <p className="text-gray-500 mb-6">Keine Vorschau verfügbar</p>
        )}

        {/* --- Button zum Öffnen des Modals --- */}
        <TemplateSelector current={settings!.template} />
      </div>
    </div>
  )
}

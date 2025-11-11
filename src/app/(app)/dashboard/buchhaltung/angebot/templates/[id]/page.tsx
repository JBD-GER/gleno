// ✅ PFAD: src/app/(app)/dashboard/buchhaltung/angebot/templates/[id]/page.tsx
import { supabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import TemplateEditor from './template-editor'

export default async function TemplateEditPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const sb = await supabaseServer()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await sb
    .from('offer_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) redirect('/dashboard/buchhaltung/angebot')

  return <TemplateEditor initial={data as any} />
}

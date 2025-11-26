import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import TodoClient from './TodoClient'
import { CheckCircleIcon } from '@heroicons/react/24/outline'

export const dynamic = 'force-dynamic'

export default async function TodoPage() {
  const supabase = await supabaseServer()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const [{ data: employees }, { data: projects }] = await Promise.all([
    supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('user_id', user.id)
      .order('first_name', { ascending: true }),
    supabase
      .from('projects')
      .select('id, title')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header-Card im GLENO-Stil */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Fokus im Alltag behalten
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-slate-50 shadow-sm sm:h-11 sm:w-11">
                <CheckCircleIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-2xl">
                  To-dos & Aufgaben
                </h1>
                <p className="mt-1 max-w-2xl text-xs text-slate-500 sm:text-sm">
                  Erstelle Aufgaben, weise sie Projekten und Mitarbeitenden zu
                  und arbeite sie nach Dringlichkeit ab – überfällige, heutige
                  und kommende To-dos immer im Blick.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TodoClient
        employees={
          employees?.map((e) => ({
            id: e.id as string,
            name: [e.first_name, e.last_name].filter(Boolean).join(' '),
          })) ?? []
        }
        projects={
          projects?.map((p) => ({
            id: p.id as string,
            title: (p.title as string) || 'Ohne Titel',
          })) ?? []
        }
      />
    </div>
  )
}

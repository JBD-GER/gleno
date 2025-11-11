// app/api/lookups/employees/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server'

async function resolveCompanyId(userId: string): Promise<string> {
  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('user_id')
    .eq('auth_user_id', userId)
    .maybeSingle()
  return emp?.user_id ?? userId
}

/** GET /api/lookups/employees */
export async function GET(_req: NextRequest) {
  const supabase = await supabaseServer()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 401 })

  try {
    const companyId = await resolveCompanyId(user.id)

    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('id, first_name, last_name, email')
      .eq('user_id', companyId)
      .order('first_name', { ascending: true })

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (err: any) {
    return NextResponse.json({ message: err.message ?? 'Fehler' }, { status: 500 })
  }
}

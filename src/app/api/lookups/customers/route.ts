// app/api/lookups/customers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server'

/** companyId für den eingeloggten User ermitteln (Owner-ID für Mitarbeiter) */
async function resolveCompanyId(userId: string): Promise<string> {
  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('user_id')
    .eq('auth_user_id', userId)
    .maybeSingle()
  return emp?.user_id ?? userId
}

/** GET /api/lookups/customers?query=...&limit=20 */
export async function GET(req: NextRequest) {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json(
      { message: 'Nicht autorisiert' },
      { status: 401 },
    )
  }

  const search = req.nextUrl.searchParams.get('query')?.trim() ?? ''
  const limit = Math.min(
    parseInt(req.nextUrl.searchParams.get('limit') || '50', 10) || 50,
    200,
  )

  try {
    const companyId = await resolveCompanyId(user.id)

    const baseSelect =
      'id, first_name, last_name, email, street, house_number, postal_code, city, address'

    // Basis-Query (ohne Suche)
    let query = supabaseAdmin
      .from('customers')
      .select(baseSelect)
      .eq('user_id', companyId)
      .order('first_name', { ascending: true })
      .limit(limit)

    // Suchvariante: first_name, last_name, email
    if (search) {
      query = supabaseAdmin
        .from('customers')
        .select(baseSelect)
        .eq('user_id', companyId)
        .or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`,
        )
        .order('first_name', { ascending: true })
        .limit(limit)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data ?? [])
  } catch (err: any) {
    return NextResponse.json(
      { message: err.message ?? 'Fehler' },
      { status: 500 },
    )
  }
}

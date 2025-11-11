// app/api/employees/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'

/** companyId = Owner-ID der Firma des eingeloggten Users (Owner → er selbst; Mitarbeiter → dessen Owner) */
async function resolveCompanyId(client: SupabaseClient, userId: string) {
  // Ist der eingeloggte User ein Mitarbeiter? Dann dessen Owner (employees.user_id) nehmen.
  const { data: empRow } = await client
    .from('employees')
    .select('user_id')
    .eq('auth_user_id', userId)
    .maybeSingle()

  return empRow?.user_id ?? userId
}

/** Mitarbeiter-Liste für Filter (id, first_name, last_name) */
export async function GET() {
  const supabase = await supabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const companyId = await resolveCompanyId(supabase, user.id)

    const { data, error } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('user_id', companyId)
      .order('first_name', { ascending: true })

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? 'Fehler' }, { status: 400 })
  }
}

/** Dein vorhandener POST bleibt bestehen */
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const required = ['first_name', 'last_name', 'email', 'employment_type', 'start_date'] as const
  for (const f of required) {
    if (!body[f]) {
      return NextResponse.json({ message: `Feld "${f}" ist erforderlich.` }, { status: 400 })
    }
  }

  const pick = <T extends object, K extends keyof T>(o: T, keys: K[]) =>
    keys.reduce((acc, k) => {
      const v = o[k]
      if (v !== undefined && v !== null && v !== '') (acc as any)[k] = typeof v === 'string' ? v.trim() : v
      return acc
    }, {} as Partial<T>)

  const base = pick(body, [
    'first_name','last_name','email','phone',
    'role','specialization','employment_type','start_date',
    'city','street','house_number','postal_code','country',
    'date_of_birth','hourly_rate','monthly_salary','vacation_days','overtime_balance',
    'driving_license','vehicle_assigned','health_certificate','first_aid_valid_until',
    'emergency_contact_name','emergency_contact_phone','notes',
  ] as any)

  const toJsonArray = (v: any) => {
    try {
      if (Array.isArray(v)) return v
      if (typeof v === 'string' && v.trim().length) return JSON.parse(v)
    } catch {}
    return undefined
  }
  const certifications = toJsonArray(body.certifications)
  const tools = toJsonArray(body.tools)
  if (certifications) (base as any).certifications = certifications
  if (tools) (base as any).tools = tools

  const s  = (base as any).street
  const hn = (base as any).house_number
  const pc = (base as any).postal_code
  const ct = (base as any).city
  const co = (base as any).country
  if (s && hn && pc && ct) {
    ;(base as any).address = `${s} ${hn}, ${pc} ${ct}` + (co ? `, ${co}` : '')
  }

  const payload = { user_id: user.id, status: 'Aktiv', ...base }

  const { data, error } = await supabase
    .from('employees')
    .insert([payload])
    .select('id')

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }

  return NextResponse.json({ id: data?.[0]?.id }, { status: 201 })
}

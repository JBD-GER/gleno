import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

type DbLicense = {
  id: string
  user_id: string
  customer_id: string | null
  project_id: string | null
  assigned_employee_id: string | null
  label: string
  product_name: string
  vendor: string | null
  url: string | null
  license_key_encrypted: string | null
  seats: number | null
  usage_notes: string | null
  valid_from: string | null
  valid_until: string | null
  auto_renew: boolean
  renewal_info: string | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string
  contract_term_months: number | null
  contract_duration_months: number | null
  monthly_cost: number | null
}

type ApiLicense = {
  id: string
  name: string
  product: string
  vendor: string | null
  license_key: string
  seats: number | null
  valid_from: string | null
  valid_until: string | null
  status: 'active' | 'expired' | 'pending' | 'unknown'
  notes: string | null
  auto_renew: boolean
  contract_duration_months: number | null
  monthly_cost: number | null
}

function statusDbToApi(dbStatus: string | null): ApiLicense['status'] {
  const s = (dbStatus || '').toLowerCase()
  if (s === 'aktiv') return 'active'
  if (s === 'abgelaufen') return 'expired'
  if (s === 'gekündigt' || s === 'gekuendigt' || s === 'pausiert')
    return 'pending'
  return 'unknown'
}

function statusApiToDb(status: string | null): string {
  const s = (status || '').toLowerCase()
  if (s === 'active') return 'aktiv'
  if (s === 'expired') return 'abgelaufen'
  if (s === 'pending') return 'pausiert'
  return 'aktiv'
}

export async function GET(_req: NextRequest) {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('vault_licenses')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('GET /vault/licenses error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const payload: ApiLicense[] =
    (data as DbLicense[] | null)?.map((row) => ({
      id: row.id,
      name: row.label,
      product: row.product_name,
      vendor: row.vendor,
      license_key: row.license_key_encrypted ?? '',
      seats: row.seats,
      valid_from: row.valid_from,
      valid_until: row.valid_until,
      status: statusDbToApi(row.status),
      notes: row.notes,
      auto_renew: row.auto_renew,
      contract_duration_months:
        row.contract_duration_months ?? row.contract_term_months ?? null,
      monthly_cost: row.monthly_cost ?? null,
    })) ?? []

  return NextResponse.json(payload)
}

export async function POST(req: NextRequest) {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
  }

  const body = await req.json()

  const payload = {
    user_id: user.id,
    label: body.name as string,
    product_name: (body.product as string) ?? '',
    vendor: (body.vendor as string) ?? null,
    license_key_encrypted: (body.license_key as string) ?? null,
    seats: body.seats ? Number(body.seats) : null,
    valid_from: body.valid_from || null,
    valid_until: body.valid_until || null,
    status: statusApiToDb(body.status),
    notes: (body.notes as string) ?? null,
    auto_renew: !!body.auto_renew,
    contract_duration_months: body.contract_duration_months
      ? Number(body.contract_duration_months)
      : null,
    monthly_cost:
      body.monthly_cost !== undefined && body.monthly_cost !== null
        ? Number(body.monthly_cost)
        : null,
  }

  const { data, error } = await supabase
    .from('vault_licenses')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    console.error('POST /vault/licenses error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

function statusApiToDb(status: string | null): string {
  const s = (status || '').toLowerCase()
  if (s === 'active') return 'aktiv'
  if (s === 'expired') return 'abgelaufen'
  if (s === 'pending') return 'pausiert'
  return 'aktiv'
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

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
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (error) {
    console.error('PUT /vault/licenses error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  const supabase = await supabaseServer()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
  }

  const { error } = await supabase
    .from('vault_licenses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('DELETE /vault/licenses error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

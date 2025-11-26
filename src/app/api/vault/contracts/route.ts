// src/app/api/vault/contracts/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('vault_contracts')
    .select('*')
    .eq('user_id', user.id)
    .order('end_date', { ascending: true }) // <-- hier geändert
    .order('created_at', { ascending: false })

  if (error) {
    console.error('GET /vault/contracts error', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Verträge' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  const body = await req.json()

  const payload = {
    user_id: user.id,
    title: body.title,
    contract_type: body.contract_type ?? null,
    partner_name: body.partner_name ?? null,
    partner_contact: body.partner_contact ?? null,
    reference: body.reference ?? null,
    customer_id: body.customer_id ?? null,
    project_id: body.project_id ?? null,
    start_date: body.start_date ?? null,
    end_date: body.end_date ?? null,
    auto_renew: !!body.auto_renew,
    cancellation_period_months: body.cancellation_period_months ?? null,
    contract_duration_months: body.contract_duration_months ?? null,
    monthly_cost: body.monthly_cost ?? null,
    status: body.status ?? 'aktiv',
    notes: body.notes ?? null,
  }

  const { data, error } = await supabase
    .from('vault_contracts')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    console.error('POST /vault/contracts error', error)
    return NextResponse.json({ error: 'Fehler beim Speichern des Vertrags' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

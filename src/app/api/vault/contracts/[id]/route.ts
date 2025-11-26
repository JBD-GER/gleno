// src/app/api/vault/contracts/[id]/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

type RouteContext = {
  params: { id: string }
}

export async function PUT(req: Request, ctx: RouteContext) {
  const { id } = ctx.params
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
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (error) {
    console.error('PUT /vault/contracts error', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Vertrags' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  const { id } = ctx.params
  const supabase = await supabaseServer()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  const { error } = await supabase
    .from('vault_contracts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('DELETE /vault/contracts error', error)
    return NextResponse.json({ error: 'Fehler beim Löschen des Vertrags' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

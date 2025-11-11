// ✅ PFAD: src/app/api/tools/[id]/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

const isUuid = (v: any) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await supabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const body = await req.json()
  const update = {
    name: body?.name?.toString().trim(),
    category: body?.category ?? null,
    manufacturer: body?.manufacturer ?? null,
    model: body?.model ?? null,
    serial_number: body?.serial_number ?? null,
    condition: body?.condition ?? null,
    status: body?.status ?? null,
    storage_location: body?.storage_location ?? null,
    assigned_employee_id: isUuid(body?.assigned_employee_id) ? body.assigned_employee_id : null,
    assigned_employee_label: body?.assigned_employee_label ?? null,
    purchase_date: body?.purchase_date ?? null,
    purchase_price: body?.purchase_price ?? null,
    warranty_expiry: body?.warranty_expiry ?? null,
    next_inspection_due: body?.next_inspection_due ?? null,
    last_service_date: body?.last_service_date ?? null,
    notes: body?.notes ?? null,
  }
  if (!update.name) return NextResponse.json({ error: 'Name ist erforderlich.' }, { status: 400 })

  const { data, error } = await supabase
    .from('tools')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await supabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase
    .from('tools')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

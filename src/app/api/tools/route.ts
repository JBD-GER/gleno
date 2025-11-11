import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

const isUuid = (v: any) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)

export async function GET() {
  const supabase = await supabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('tools')
    .select(`
      id, name, category, manufacturer, model, serial_number,
      condition, status, storage_location,
      assigned_employee_id, assigned_employee_label,
      purchase_date, purchase_price, warranty_expiry,
      next_inspection_due, last_service_date, notes,
      created_at, updated_at
    `)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = await supabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const payload = {
    user_id: user.id,
    name: (body?.name ?? '').toString().trim(),
    category: body?.category ?? 'Allgemein',
    manufacturer: body?.manufacturer ?? null,
    model: body?.model ?? null,
    serial_number: body?.serial_number ?? null,
    condition: body?.condition ?? 'Gut',
    status: body?.status ?? 'Verfügbar',
    storage_location: body?.storage_location ?? null,
    // ✅ Sichere UUID
    assigned_employee_id: isUuid(body?.assigned_employee_id) ? body.assigned_employee_id : null,
    // ✅ Freitext parallel erlauben
    assigned_employee_label: body?.assigned_employee_label ?? null,
    purchase_date: body?.purchase_date ?? null,
    purchase_price: body?.purchase_price ?? null,
    warranty_expiry: body?.warranty_expiry ?? null,
    next_inspection_due: body?.next_inspection_due ?? null,
    last_service_date: body?.last_service_date ?? null,
    notes: body?.notes ?? null,
  }
  if (!payload.name) return NextResponse.json({ error: 'Name ist erforderlich.' }, { status: 400 })

  const { data, error } = await supabase.from('tools').insert(payload).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

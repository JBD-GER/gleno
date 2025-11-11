// ✅ PFAD: src/app/api/fleet/[id]/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

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
    license_plate: body?.license_plate?.toString().trim(),
    vehicle_type: body?.vehicle_type ?? null,
    brand: body?.brand ?? null,
    model: body?.model ?? null,
    build_year: body?.build_year ?? null,
    color: body?.color ?? null,
    mileage_km: body?.mileage_km ?? null,
    fuel_type: body?.fuel_type ?? null,
    status: body?.status ?? null,
    key_location: body?.key_location ?? null,
    parking_location: body?.parking_location ?? null,
    insurance_provider: body?.insurance_provider ?? null,
    inspection_due_date: body?.inspection_due_date ?? null,
    notes: body?.notes ?? null,
  }

  if (!update.license_plate) {
    return NextResponse.json({ error: 'Kennzeichen ist erforderlich.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('fleet')
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
    .from('fleet')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

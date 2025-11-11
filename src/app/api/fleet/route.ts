import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await supabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('fleet')
    .select(`
      id, license_plate, vehicle_type, brand, model, build_year, color,
      mileage_km, fuel_type, status, key_location, parking_location,
      insurance_provider, inspection_due_date, notes, created_at, updated_at
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

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
    license_plate: (body?.license_plate ?? '').toString().trim(),
    vehicle_type: body?.vehicle_type ?? 'PKW',
    brand: body?.brand ?? null,
    model: body?.model ?? null,
    build_year: body?.build_year ?? null,
    color: body?.color ?? null,
    mileage_km: body?.mileage_km ?? 0,
    fuel_type: body?.fuel_type ?? 'Benzin',
    status: body?.status ?? 'Verfügbar',
    key_location: body?.key_location ?? null,
    parking_location: body?.parking_location ?? null,
    insurance_provider: body?.insurance_provider ?? null,
    inspection_due_date: body?.inspection_due_date ?? null,
    notes: body?.notes ?? null,
  }

  if (!payload.license_plate) {
    return NextResponse.json({ error: 'Kennzeichen ist erforderlich.' }, { status: 400 })
  }

  const { data, error } = await supabase.from('fleet').insert(payload).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

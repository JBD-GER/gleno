// ✅ PFAD: src/app/api/employees/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await supabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ message: error?.message ?? 'Not found' }, { status: 404 })
  return NextResponse.json(data, { status: 200 })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await supabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const updates: Record<string, any> = {}

  for (const f of [
    'first_name','last_name','email','phone','role','specialization','start_date','status',
    'street','house_number','postal_code','city','country',
    'birth_date','employment_type','hourly_rate','working_hours_per_week',
    'vacation_days','driving_license','certifications',
    'bank_iban','bank_bic','emergency_contact_name','emergency_contact_phone',
    'notes',
  ] as const) {
    if (body[f] !== undefined) {
      updates[f] = typeof body[f] === 'string' ? body[f].trim() : body[f]
    }
  }

  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')

  if (error) return NextResponse.json({ message: error.message }, { status: 400 })
  if (!data || data.length === 0) return NextResponse.json({ message: 'Not updated' }, { status: 404 })
  return NextResponse.json(data[0], { status: 200 })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await supabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('employees')
    .update({ status: 'Gelöscht' })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ message: error.message }, { status: 400 })
  return NextResponse.json({ message: 'Deleted' }, { status: 200 })
}

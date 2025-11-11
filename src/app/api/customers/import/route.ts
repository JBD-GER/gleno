// app/api/customers/import/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const supabase = await supabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const rows = await request.json() as Array<Record<string,string>>
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ message: 'Keine Daten zum Importieren' }, { status: 400 })
  }

  // Bereite Payloads vor, minimal: user_id und trim
  const payloads = rows.map(r => ({
    user_id:      user.id,
    first_name:   (r.first_name ?? '').trim(),
    last_name:    (r.last_name  ?? '').trim(),
    email:        (r.email      ?? '').trim() || null,
    phone:        (r.phone      ?? '').trim() || null,
    street:       (r.street     ?? '').trim() || null,
    house_number:(r.house_number?? '').trim() || null,
    postal_code: (r.postal_code ?? '').trim() || null,
    city:         (r.city       ?? '').trim() || null,
    country:      (r.country    ?? '').trim() || null,
  }))

  // Bulk insert
  const { error } = await supabase
    .from('customers')
    .insert(payloads)

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }

  return NextResponse.json({ message: `${payloads.length} Kunden importiert.` })
}

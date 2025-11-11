// app/api/customers/bulk/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const supabase = await supabaseServer()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { customers } = (await request.json()) as { customers: Record<string, any>[] }
  if (!Array.isArray(customers) || customers.length === 0) {
    return NextResponse.json({ message: 'Keine Daten zum Importieren gefunden.' }, { status: 400 })
  }

  const invalid = customers
    .map((row, i) => (!row.email && !row.phone) ? i + 1 : null)
    .filter((i) => i !== null)
  if (invalid.length) {
    return NextResponse.json(
      { message: `Fehler in Zeile(n): ${invalid.join(', ')} – bitte E-Mail oder Telefon angeben.` },
      { status: 400 }
    )
  }

  const payload = customers.map((row) => {
    const p: Record<string, any> = {
      user_id:    user.id,
      company:    (row.company    ?? '').trim(), // <— NEU
      first_name: (row.first_name ?? '').trim(),
      last_name:  (row.last_name  ?? '').trim(),
      email:      row.email ? String(row.email).trim() : null,
      phone:      row.phone ? String(row.phone).trim() : null,
    }
    for (const f of ['street','house_number','postal_code','city','country'] as const) {
      if (row[f]) p[f] = String(row[f]).trim()
    }
    if (p.street && p.house_number && p.postal_code && p.city) {
      p.address = `${p.street} ${p.house_number}, ${p.postal_code} ${p.city}` + (p.country ? `, ${p.country}` : '')
    }
    return p
  })

  const { data, error } = await supabase
    .from('customers')
    .insert(payload)
    .select('*')

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ message: 'Import fehlgeschlagen.' }, { status: 500 })
  }

  return NextResponse.json({ imported: data.length, customers: data }, { status: 200 })
}

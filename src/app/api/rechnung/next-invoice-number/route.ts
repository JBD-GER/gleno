// src/app/api/next-offer-number/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
  }

  // 1) Billing Settings
  const { data: bs, error: bsErr } = await supabase
    .from('billing_settings')
    .select('invoice_prefix,invoice_start,invoice_suffix')
    .eq('user_id', user.id)
    .single()
  if (bsErr && bsErr.code !== 'PGRST116') {
    console.error(bsErr)
    return NextResponse.json({ error: 'Settings error' }, { status: 500 })
  }
  const prefix = bs?.invoice_prefix  ?? ''
  const suffix = bs?.invoice_suffix  ?? ''
  const start  = bs?.invoice_start   ?? 1

  // 2) Letztes Angebot holen
  const { data: last, error: lastErr } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (lastErr && lastErr.code !== 'PGRST116') {
    console.error(lastErr)
    return NextResponse.json({ error: 'Last-invoice error' }, { status: 500 })
  }

  // 3) Neue Roh-Nummer
  let nextRaw = last?.invoice_number
    ? parseInt(
        last.invoice_number.replace(prefix, '').replace(suffix, ''),
        10
      ) + 1
    : start

  // 4) Formatiert zurückgeben
  const nextNumber = `${prefix}${String(nextRaw).padStart(3, '0')}${suffix}`
  return NextResponse.json({ nextNumber })
}

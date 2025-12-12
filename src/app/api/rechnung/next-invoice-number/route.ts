// src/app/api/next-offer-number/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

function extractRawNumber(
  invoiceNumber: string,
  prefix: string,
  suffix: string
): number | null {
  const v = String(invoiceNumber || '').trim()
  if (!v) return null

  // Prefix/Suffix nur am Rand entfernen (nicht irgendwo mitten drin)
  let core = v
  if (prefix && core.startsWith(prefix)) core = core.slice(prefix.length)
  if (suffix && core.endsWith(suffix)) core = core.slice(0, core.length - suffix.length)

  // Nur Ziffern akzeptieren
  const digits = core.replace(/[^\d]/g, '')
  if (!digits) return null

  const n = parseInt(digits, 10)
  return Number.isFinite(n) ? n : null
}

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

  const prefix = bs?.invoice_prefix ?? ''
  const suffix = bs?.invoice_suffix ?? ''
  const start = bs?.invoice_start ?? 1

  // 2) Letzte Rechnungen holen (mehrere, um max zu finden)
  const { data: rows, error: lastErr } = await supabase
    .from('invoices')
    .select('invoice_number, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (lastErr && lastErr.code !== 'PGRST116') {
    console.error(lastErr)
    return NextResponse.json({ error: 'Last-invoice error' }, { status: 500 })
  }

  // 3) Max Raw bestimmen
  let maxRaw: number | null = null
  for (const r of rows ?? []) {
    const raw = extractRawNumber((r as any).invoice_number, prefix, suffix)
    if (raw == null) continue
    if (maxRaw == null || raw > maxRaw) maxRaw = raw
  }

  const nextRaw = (maxRaw != null ? maxRaw + 1 : start)

  // 4) Formatiert zurückgeben
  const nextNumber = `${prefix}${String(nextRaw).padStart(3, '0')}${suffix}`
  return NextResponse.json({ nextNumber })
}

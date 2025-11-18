// src/app/api/rechnung/automation/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function toDbDate(input?: string | null): string | null {
  const v = (input ?? '').trim()
  if (!v) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const m = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (m) {
    const dd = m[1].padStart(2, '0')
    const mm = m[2].padStart(2, '0')
    const yyyy = m[3]
    return `${yyyy}-${mm}-${dd}`
  }
  const d = new Date(v)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

const ALLOWED_INTERVALS = new Set([
  'weekly',
  'every_2_weeks',
  'monthly',
  'every_2_months',
  'quarterly',
  'every_6_months',
  'yearly',
])

/**
 * GET /api/rechnung/automation?invoiceNumber=INV-123
 * Liefert Invoice-Infos + existierende Automation (falls vorhanden)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await supabaseServer()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ message: 'Nicht eingeloggt' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const invoiceNumber = searchParams.get('invoiceNumber')
    if (!invoiceNumber) {
      return NextResponse.json(
        { message: 'invoiceNumber erforderlich' },
        { status: 400 }
      )
    }

    // Rechnung des Users holen
    const { data: invoice, error: invErr } = await supabaseAdmin
      .from('invoices')
      .select('id, invoice_number, date, title, gross_total, customer_id')
      .eq('user_id', user.id)
      .eq('invoice_number', invoiceNumber)
      .maybeSingle()

    if (invErr || !invoice) {
      return NextResponse.json(
        { message: 'Rechnung nicht gefunden' },
        { status: 404 }
      )
    }

    // Eventuelle Automatisierung holen
    const { data: automation } = await supabaseAdmin
      .from('invoice_automations')
      .select('*')
      .eq('user_id', user.id)
      .eq('source_invoice_id', invoice.id)
      .maybeSingle()

    return NextResponse.json({ invoice, automation: automation ?? null })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json(
      { message: err?.message || 'Fehler beim Laden der Automatisierung' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/rechnung/automation
 * Body: { invoiceNumber, startDate, endDate, interval, unlimited }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ message: 'Nicht eingeloggt' }, { status: 401 })
    }

    const body = await req.json()
    const {
      invoiceNumber,
      startDate,
      endDate,
      interval,
      unlimited,
      label,
    } = body as {
      invoiceNumber?: string
      startDate?: string
      endDate?: string | null
      interval?: string
      unlimited?: boolean
      label?: string
    }

    if (!invoiceNumber) {
      return NextResponse.json(
        { message: 'invoiceNumber fehlt' },
        { status: 400 }
      )
    }

    let intervalKey = (interval || 'monthly').toString()
    if (!ALLOWED_INTERVALS.has(intervalKey)) {
      intervalKey = 'monthly'
    }

    // Rechnung holen
    const { data: invoice, error: invErr } = await supabaseAdmin
      .from('invoices')
      .select('id, invoice_number, date')
      .eq('user_id', user.id)
      .eq('invoice_number', invoiceNumber)
      .maybeSingle()

    if (invErr || !invoice) {
      return NextResponse.json(
        { message: 'Rechnung nicht gefunden' },
        { status: 404 }
      )
    }

    const startDb = toDbDate(startDate) ?? (invoice.date as string)
    if (!startDb) {
      return NextResponse.json(
        { message: 'Ungültiges Startdatum' },
        { status: 400 }
      )
    }

    const endDb =
      unlimited || endDate === null || endDate === ''
        ? null
        : toDbDate(endDate)
    if (!unlimited && endDate && !endDb) {
      return NextResponse.json(
        { message: 'Ungültiges Enddatum' },
        { status: 400 }
      )
    }

    // Prüfen, ob schon eine Automation existiert
    const { data: existing } = await supabaseAdmin
      .from('invoice_automations')
      .select('*')
      .eq('user_id', user.id)
      .eq('source_invoice_id', invoice.id)
      .maybeSingle()

    const now = new Date().toISOString()

    if (existing) {
      const { error: updErr, data: updated } = await supabaseAdmin
        .from('invoice_automations')
        .update({
          start_date: startDb,
          end_date: endDb,
          interval: intervalKey,
          active: true,
          next_run_date: startDb, // einfach: immer ab Startdatum neu planen
          label: label ?? existing.label ?? null,
          updated_at: now,
        })
        .eq('id', existing.id)
        .select()
        .maybeSingle()

      if (updErr || !updated) {
        throw updErr || new Error('Update fehlgeschlagen')
      }

      return NextResponse.json({ automation: updated })
    }

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('invoice_automations')
      .insert([
        {
          user_id: user.id,
          source_invoice_id: invoice.id,
          source_invoice_number: invoice.invoice_number,
          start_date: startDb,
          end_date: endDb,
          interval: intervalKey,
          next_run_date: startDb,
          active: true,
          label: label ?? null,
        },
      ])
      .select()
      .maybeSingle()

    if (insErr || !inserted) {
      throw insErr || new Error('Insert fehlgeschlagen')
    }

    return NextResponse.json({ automation: inserted })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json(
      { message: err?.message || 'Fehler beim Speichern der Automatisierung' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/rechnung/automation
 * Body: { invoiceNumber }
 * Deaktiviert die Automatisierung (active = false)
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await supabaseServer()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ message: 'Nicht eingeloggt' }, { status: 401 })
    }

    const body = await req.json()
    const { invoiceNumber } = body as { invoiceNumber?: string }

    if (!invoiceNumber) {
      return NextResponse.json(
        { message: 'invoiceNumber fehlt' },
        { status: 400 }
      )
    }

    const { data: invoice, error: invErr } = await supabaseAdmin
      .from('invoices')
      .select('id')
      .eq('user_id', user.id)
      .eq('invoice_number', invoiceNumber)
      .maybeSingle()

    if (invErr || !invoice) {
      return NextResponse.json(
        { message: 'Rechnung nicht gefunden' },
        { status: 404 }
      )
    }

    const { error: updErr } = await supabaseAdmin
      .from('invoice_automations')
      .update({
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('source_invoice_id', invoice.id)
      .eq('active', true)

    if (updErr) throw updErr

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json(
      { message: err?.message || 'Fehler beim Deaktivieren der Automatisierung' },
      { status: 500 }
    )
  }
}

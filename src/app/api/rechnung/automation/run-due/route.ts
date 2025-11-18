import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function todayYYYYMMDD() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type IntervalKey =
  | 'weekly'
  | 'every_2_weeks'
  | 'monthly'
  | 'every_2_months'
  | 'quarterly'
  | 'every_6_months'
  | 'yearly'

function addInterval(
  date: string,
  unit: 'day' | 'week' | 'month' | 'year',
  value: number
) {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (unit === 'day') dt.setUTCDate(dt.getUTCDate() + value)
  if (unit === 'week') dt.setUTCDate(dt.getUTCDate() + value * 7)
  if (unit === 'month') dt.setUTCMonth(dt.getUTCMonth() + value)
  if (unit === 'year') dt.setUTCFullYear(dt.getUTCFullYear() + value)
  const y2 = dt.getUTCFullYear()
  const m2 = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d2 = String(dt.getUTCDate()).padStart(2, '0')
  return `${y2}-${m2}-${d2}`
}

function intervalToUnit(interval: string | null | undefined): {
  unit: 'day' | 'week' | 'month' | 'year'
  value: number
} {
  const key = (interval || 'monthly') as IntervalKey
  switch (key) {
    case 'weekly':
      return { unit: 'day', value: 7 }
    case 'every_2_weeks':
      return { unit: 'day', value: 14 }
    case 'every_2_months':
      return { unit: 'month', value: 2 }
    case 'quarterly':
      return { unit: 'month', value: 3 }
    case 'every_6_months':
      return { unit: 'month', value: 6 }
    case 'yearly':
      return { unit: 'year', value: 1 }
    case 'monthly':
    default:
      return { unit: 'month', value: 1 }
  }
}

export async function GET(req: NextRequest) {
  try {
    // Secret-Check, damit niemand Fremdes den Job antriggert
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token || token !== process.env.INVOICE_AUTOMATION_SECRET) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const today = todayYYYYMMDD()

    // Alle fälligen Automationen holen
    const { data: automations, error } = await supabaseAdmin
      .from('invoice_automations')
      .select(
        'id, user_id, source_invoice_id, next_run_date, end_date, active, interval'
      )
      .eq('active', true)
      .lte('next_run_date', today)

    if (error) throw error
    if (!automations || automations.length === 0) {
      return NextResponse.json({ message: 'nothing to do' })
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
      'http://localhost:3000'

    // Cookie weiterreichen, falls Request aus dem Browser kommt (zum Testen)
    const cookieHeader = req.headers.get('cookie') || ''

    let successCount = 0
    let errorCount = 0

    for (const a of automations) {
      try {
        // Invoice & Kunde holen
        const { data: invoice, error: invErr } = await supabaseAdmin
          .from('invoices')
          .select(
            'id, user_id, customer_id, title, intro, tax_rate, positions, discount, invoice_number, net_subtotal, gross_total'
          )
          .eq('id', a.source_invoice_id)
          .single()

        if (invErr || !invoice) throw invErr || new Error('invoice not found')

        const { data: customer, error: custErr } = await supabaseAdmin
          .from('customers')
          .select('*')
          .eq('id', invoice.customer_id)
          .single()

        if (custErr || !customer) throw custErr || new Error('customer not found')

        const { data: billingSettings, error: bsErr } = await supabaseAdmin
          .from('billing_settings')
          .select('template')
          .eq('user_id', invoice.user_id)
          .single()

        if (bsErr || !billingSettings)
          throw bsErr || new Error('billing settings not found')

        const runDate = (a.next_run_date as string) || today
        const idempotencyKey = `${a.id}_${runDate}`

        // generate-invoice Route aufrufen (deine bestehende Logik)
        const res = await fetch(`${baseUrl}/api/rechnung/generate-invoice`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Cookie nur weitergeben, wenn vorhanden (z.B. manueller Test aus Browser)
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          },
          body: JSON.stringify({
            customer,
            meta: {
              date: runDate,
              title: invoice.title,
              intro: invoice.intro,
              taxRate: invoice.tax_rate,
              billingSettings: { template: billingSettings.template },
              discount: invoice.discount,
              commit: true,
              idempotencyKey,
            },
            positions: invoice.positions ?? [],
          }),
        })

        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(`generate-invoice failed: ${res.status} ${text}`)
        }

        // Nächste Ausführung berechnen
        let newActive = a.active as boolean
        let nextRun: string | null = null

        const { unit, value } = intervalToUnit(a.interval as string | null)

        if (a.end_date && runDate >= a.end_date) {
          // Enddatum erreicht → Automatisierung beenden
          newActive = false
        } else {
          nextRun = addInterval(runDate, unit, value)
        }

        await supabaseAdmin
          .from('invoice_automations')
          .update({
            last_run_date: runDate,
            next_run_date: nextRun,
            active: newActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', a.id)

        successCount++
      } catch (err) {
        console.error('automation error', a.id, err)
        errorCount++
      }
    }

    return NextResponse.json({ ok: true, successCount, errorCount })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json(
      { message: err?.message || 'automation failed' },
      { status: 500 }
    )
  }
}

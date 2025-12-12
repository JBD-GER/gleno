import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** Robust Zahl parsen (unterstützt "12,5") */
function parseNumber(n: unknown, fallback = 0): number {
  if (typeof n === 'number' && isFinite(n)) return n
  if (typeof n === 'string') {
    const s = n.trim().replace(',', '.')
    const v = Number(s)
    return isNaN(v) ? fallback : v
  }
  return fallback
}

/** YYYY-MM-DD (lokal) */
function todayYYYYMMDD(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()

    if (authErr || !user) throw new Error('Nicht eingeloggt')

    const { invoiceNumber, reason } = (await req.json()) as {
      invoiceNumber: string
      reason?: string | null
    }

    if (!invoiceNumber || typeof invoiceNumber !== 'string') {
      throw new Error('invoiceNumber fehlt')
    }

    // 1) Original laden
    const { data: inv, error: invErr } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('user_id', user.id)
      .eq('invoice_number', invoiceNumber)
      .single()

    if (invErr || !inv) throw new Error('Rechnung nicht gefunden')

    // ✅ Stornorechnung selbst darf nicht storniert werden
    const isAlreadyCancellation = !!(inv as any).is_cancellation
    if (isAlreadyCancellation) {
      throw new Error('Eine Stornorechnung kann nicht erneut storniert werden.')
    }

    // Schon storniert?
    const currentStatus = (inv as any).status
    if (
      typeof currentStatus === 'string' &&
      currentStatus.toLowerCase() === 'storniert'
    ) {
      throw new Error('Diese Rechnung ist bereits storniert.')
    }

    // Schon eine Stornorechnung vorhanden?
    const { data: existingCancel, error: existingCancelErr } =
      await supabaseAdmin
        .from('invoices')
        .select('invoice_number')
        .eq('user_id', user.id)
        .eq('is_cancellation', true)
        .eq('cancels_invoice_number', invoiceNumber)
        .maybeSingle()

    if (existingCancelErr) {
      throw new Error('Prüfung auf vorhandene Stornorechnung fehlgeschlagen.')
    }

    if (existingCancel?.invoice_number) {
      return NextResponse.json({
        ok: true,
        cancellationInvoiceNumber: existingCancel.invoice_number,
        message: 'Stornorechnung existiert bereits.',
      })
    }

    // ✅ billing_settings.template holen
    const { data: bs, error: bsErr } = await supabaseAdmin
      .from('billing_settings')
      .select('template')
      .eq('user_id', user.id)
      .maybeSingle()

    if (bsErr) throw new Error('Billing-Settings konnten nicht geladen werden.')
    const template = (bs as any)?.template
    if (!template) {
      throw new Error(
        'Kein Rechnungstemplate gesetzt (billing_settings.template).'
      )
    }

    // ✅ Customer vollständig laden (damit PDF Header/Adresse stimmt)
    let customerPayload: any = { id: (inv as any).customer_id }

    if ((inv as any).customer_id) {
      const { data: cust, error: custErr } = await supabaseAdmin
        .from('customers')
        .select(
          'id,email,first_name,last_name,company,street,house_number,postal_code,city,address,customer_number'
        )
        .eq('user_id', user.id)
        .eq('id', (inv as any).customer_id)
        .maybeSingle()

      if (custErr) throw new Error('Kundendaten konnten nicht geladen werden.')
      if (cust) customerPayload = cust
    }

    // 2) Original-Positions holen
    const originalPositions = ((inv as any).positions ?? []) as any[]

    // 3) Rabatt aus Original übernehmen (aber NICHT als Rabatt im generate-invoice rechnen!)
    const originalDiscount = ((inv as any).discount ?? null) as
      | {
          enabled?: boolean
          label?: string
          type?: 'percent' | 'amount'
          base?: 'net' | 'gross'
          value?: number | string
        }
      | null

    const discountEnabled =
      !!originalDiscount?.enabled && parseNumber(originalDiscount?.value, 0) > 0

    const discountType = (originalDiscount?.type ?? 'percent') as
      | 'percent'
      | 'amount'
    const discountBase = (originalDiscount?.base ?? 'net') as 'net' | 'gross'
    const discountValue = parseNumber(originalDiscount?.value, 0)

    // Steuerfaktor für gross->net Umrechnung (falls nötig)
    const taxRate = parseNumber((inv as any).tax_rate, 0)
    const taxFactor = 1 + taxRate / 100

    // 4) Positions für Storno vorbereiten:
    //    ✅ Ziel: Endbetrag (nach Rabatt) negieren
    //    => Rabatt in Positionen "einbacken", dann unitPrice negativ machen
    let positions = originalPositions.map((p: any) => ({ ...p }))

    const itemIdxs: number[] = []
    let itemsNetSum = 0

    for (let i = 0; i < positions.length; i++) {
      const p = positions[i]
      if (p?.type !== 'item') continue
      const qty = parseNumber(p.quantity, 0)
      const up = parseNumber(p.unitPrice, 0)
      const line = qty * up
      itemIdxs.push(i)
      itemsNetSum += Math.max(0, line)
    }

    if (discountEnabled && itemIdxs.length > 0 && itemsNetSum > 0) {
      if (discountType === 'percent') {
        const factor = Math.max(0, 1 - discountValue / 100)
        for (const idx of itemIdxs) {
          const p = positions[idx]
          const up = parseNumber(p.unitPrice, 0)
          positions[idx] = { ...p, unitPrice: up * factor }
        }
      } else {
        // amount
        const netDiscount =
          discountBase === 'gross' ? discountValue / taxFactor : discountValue

        const effectiveNetDiscount = Math.min(
          Math.max(0, netDiscount),
          itemsNetSum
        )

        let remaining = effectiveNetDiscount

        for (let k = 0; k < itemIdxs.length; k++) {
          const idx = itemIdxs[k]
          const p = positions[idx]
          const qty = parseNumber(p.quantity, 0)
          const up = parseNumber(p.unitPrice, 0)
          const line = Math.max(0, qty * up)

          if (qty <= 0 || line <= 0) continue

          let share = 0
          if (k === itemIdxs.length - 1) {
            share = remaining
          } else {
            share = effectiveNetDiscount * (line / itemsNetSum)
            share = Math.min(share, remaining)
          }

          const newLine = Math.max(0, line - share)
          const newUp = newLine / qty
          positions[idx] = { ...p, unitPrice: newUp }

          remaining -= share
          if (remaining < 0) remaining = 0
        }
      }
    }

    // 5) Jetzt Storno: Item-Preise negativ machen
    positions = positions.map((p: any) => {
      if (p?.type !== 'item') return p
      return { ...p, unitPrice: parseNumber(p.unitPrice, 0) * -1 }
    })

    // 6) Intro mit Verweis + optional Grund
    const introBase = ((inv as any).intro ?? '').toString()
    const introStorno =
      `STORNO zu Rechnung ${invoiceNumber}. ` +
      (reason ? `Grund: ${String(reason)}. ` : '') +
      (introBase ? `\n\n${introBase}` : '')

    // 7) Heutiges Datum für Storno
    const cancellationDate = todayYYYYMMDD()

    // 8) PDF erzeugen + committen über generate-invoice (mit Session/Cookie!)
    const origin = new URL(req.url).origin
    const cookie = req.headers.get('cookie') || ''

    const genRes = await fetch(`${origin}/api/rechnung/generate-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        cookie,
      },
      body: JSON.stringify({
        customer: customerPayload,
        meta: {
          date: cancellationDate,
          title: `Stornorechnung zu ${invoiceNumber}`,
          intro: introStorno,
          taxRate: Number((inv as any).tax_rate ?? 0),
          billingSettings: { template },

          // Rabatt NICHT nochmal rechnen lassen
          discount: {
            enabled: false,
            label: (originalDiscount?.label ?? 'Rabatt').toString(),
            type: (discountType ?? 'percent') as 'percent' | 'amount',
            base: (discountBase ?? 'net') as 'net' | 'gross',
            value: Number(discountValue ?? 0),
          },

          commit: true,
          idempotencyKey: `cancel:${invoiceNumber}`,
          isCancellation: true,
          cancelsInvoiceNumber: invoiceNumber,
          cancellationReason: reason ?? null,

          // ✅ OPTIONAL: wenn generate-invoice das unterstützt, dann direkt hier setzen:
          // status: 'Erstellt',
        },
        positions,
      }),
    })

    if (!genRes.ok) {
      const p = await genRes.json().catch(() => ({} as any))
      throw new Error(p?.message || 'PDF-Erzeugung fehlgeschlagen')
    }

    // ✅ Robust: Header raw + decoded
    const headerRaw = genRes.headers.get('x-invoice-number') || ''
    const headerDecoded = headerRaw ? decodeURIComponent(headerRaw) : ''
    const effectiveCancelNo = headerDecoded || headerRaw

    if (!effectiveCancelNo) {
      throw new Error(
        'Keine Storno-Rechnungsnummer aus generate-invoice erhalten'
      )
    }

    // ✅ Die neu erzeugte Rechnung sicher finden (raw + decoded)
    const { data: cancelRow, error: cancelRowErr } = await supabaseAdmin
      .from('invoices')
      .select('id, invoice_number, status')
      .eq('user_id', user.id)
      .in('invoice_number', [headerRaw, headerDecoded].filter(Boolean))
      .maybeSingle()

    if (cancelRowErr) {
      throw new Error('Storno-Rechnung konnte nicht geladen werden.')
    }

    // Fallback: wenn aus irgendeinem Grund .in() nicht getroffen hat, versuch nochmal mit effectiveCancelNo
    let cancelId = cancelRow?.id as string | undefined
    if (!cancelId) {
      const { data: cancelRow2, error: cancelRowErr2 } = await supabaseAdmin
        .from('invoices')
        .select('id, invoice_number, status')
        .eq('user_id', user.id)
        .eq('invoice_number', effectiveCancelNo)
        .maybeSingle()

      if (cancelRowErr2) {
        throw new Error('Storno-Rechnung konnte nicht geladen werden (Fallback).')
      }
      cancelId = cancelRow2?.id as string | undefined
    }

    if (!cancelId) {
      throw new Error(
        `Storno-Rechnung wurde nicht gefunden (invoice_number: ${effectiveCancelNo}).`
      )
    }

    // 9) Original -> storniert + Link
    const { error: updOrigErr } = await supabaseAdmin
      .from('invoices')
      .update({
        status: 'Storniert',
        status_changed_at: new Date().toISOString(),
        cancelled_by_invoice_number: effectiveCancelNo,
        cancelled_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('invoice_number', invoiceNumber)

    if (updOrigErr) {
      throw new Error(
        `Original-Rechnung konnte nicht als storniert markiert werden: ${updOrigErr.message}`
      )
    }

    // 10) Stornorechnung markieren + Link + Grund + Status
    // ✅ FIX: Stornorechnung ist NICHT "Storniert", sondern "Erstellt"
    const { data: updCancelData, error: updCancelErr } = await supabaseAdmin
      .from('invoices')
      .update({
        is_cancellation: true,
        cancels_invoice_number: invoiceNumber,
        cancellation_reason: reason ?? null,
        status: 'Erstellt',
        status_changed_at: new Date().toISOString(),
      })
      .eq('id', cancelId)
      .select('invoice_number, status')
      .maybeSingle()

    if (updCancelErr) {
      throw new Error(
        `Stornorechnung konnte nicht korrekt markiert werden: ${updCancelErr.message}`
      )
    }

    // ✅ Sicherheitscheck: wenn es immer noch nicht "Erstellt" ist, dann hart abbrechen
    if ((updCancelData as any)?.status?.toString() !== 'Erstellt') {
      throw new Error(
        `Stornorechnung Status konnte nicht gesetzt werden (aktuell: ${(updCancelData as any)?.status}).`
      )
    }

    return NextResponse.json({
      ok: true,
      cancellationInvoiceNumber: effectiveCancelNo,
    })
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || 'Storno fehlgeschlagen' },
      { status: 500 }
    )
  }
}

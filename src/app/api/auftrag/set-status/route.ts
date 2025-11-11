import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { orderConfirmationNumber, status } = await req.json() as {
      orderConfirmationNumber: string
      status: 'Erstellt' | 'Verschickt' | 'Abgerechnet'
    }

    if (!orderConfirmationNumber) {
      return NextResponse.json({ message: 'orderConfirmationNumber fehlt' }, { status: 400 })
    }
    if (!status) {
      return NextResponse.json({ message: 'status fehlt' }, { status: 400 })
    }

    // Nur manuell erlaubt: Erstellt <-> Verschickt
    if (status === 'Abgerechnet') {
      return NextResponse.json({
        message: '"Abgerechnet" setzt sich automatisch, wenn eine Rechnung erzeugt wird.'
      }, { status: 400 })
    }

    const { data: existing, error: selErr } = await supabaseAdmin
      .from('order_confirmations')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('order_confirmation_number', orderConfirmationNumber)
      .single()

    if (selErr || !existing) {
      return NextResponse.json({ message: 'Auftrag nicht gefunden' }, { status: 404 })
    }

    // Wenn schon abgerechnet, keine manuelle Änderung
    if (existing.status === 'Abgerechnet') {
      return NextResponse.json({
        message: 'Dieser Auftrag ist bereits abgerechnet und kann nicht mehr manuell geändert werden.'
      }, { status: 409 })
    }

    const { error: updErr } = await supabaseAdmin
      .from('order_confirmations')
      .update({
        status,
        status_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('order_confirmation_number', orderConfirmationNumber)

    if (updErr) {
      return NextResponse.json({ message: updErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ message: e?.message || 'Fehler' }, { status: 500 })
  }
}

// src/app/api/angebot/set-status/route.ts
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
    if (authErr || !user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { offerNumber, status } = await req.json() as { offerNumber: string; status: 'Erstellt' | 'Verschickt' | 'Bestätigt' }
    if (!offerNumber) return NextResponse.json({ message: 'offerNumber fehlt' }, { status: 400 })
    if (!status) return NextResponse.json({ message: 'status fehlt' }, { status: 400 })

    // Manuell erlauben wir NUR "Erstellt" oder "Verschickt".
    if (status === 'Bestätigt') {
      return NextResponse.json({ message: '"Bestätigt" wird automatisch gesetzt, wenn eine Auftragsbestätigung erzeugt wird.' }, { status: 400 })
    }
    if (!['Erstellt','Verschickt'].includes(status)) {
      return NextResponse.json({ message: 'Ungültiger Status' }, { status: 400 })
    }

    const { data: existing, error: selErr } = await supabaseAdmin
      .from('offers')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('offer_number', offerNumber)
      .single()
    if (selErr || !existing) return NextResponse.json({ message: 'Angebot nicht gefunden' }, { status: 404 })

    // Wenn bereits "Bestätigt", keine manuelle Änderung mehr zulassen
    if (existing.status === 'Bestätigt') {
      return NextResponse.json({ message: 'Dieses Angebot ist bereits bestätigt und kann nicht manuell geändert werden.' }, { status: 409 })
    }

    const { error: updErr } = await supabaseAdmin
      .from('offers')
      .update({ status, status_changed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('offer_number', offerNumber)

    if (updErr) return NextResponse.json({ message: updErr.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ message: e?.message || 'Fehler' }, { status: 500 })
  }
}

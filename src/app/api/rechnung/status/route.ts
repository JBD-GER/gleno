// src/app/api/rechnung/status/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type ManualStatus = 'Erstellt' | 'Verschickt' | 'Bezahlt'

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { invoiceNumber, status } = await req.json() as { invoiceNumber: string; status: ManualStatus }
    if (!invoiceNumber) return NextResponse.json({ message: 'invoiceNumber fehlt' }, { status: 400 })
    if (!['Erstellt','Verschickt','Bezahlt'].includes(status)) {
      return NextResponse.json({ message: 'Ungültiger Status' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('invoices')
      .update({
        status,
        status_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('invoice_number', invoiceNumber)

    if (error) return NextResponse.json({ message: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ message: e?.message || 'Fehler' }, { status: 500 })
  }
}

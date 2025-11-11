// ✅ PFAD: src/app/api/rechnung/download-invoice/[invoiceNumber]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'

// Admin-Client für privaten Storage
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceNumber: string }> }
) {
  // 1) Auth prüfen
  const supa = await supabaseServer()
  const { data: { user }, error: authErr } = await supa.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  // 2) Routen-Parameter lesen (Promise in Next 15)
  const { invoiceNumber } = await params
  const safeNumber = decodeURIComponent(invoiceNumber ?? '').trim()
  if (!safeNumber) {
    return NextResponse.json({ message: 'invoiceNumber fehlt' }, { status: 400 })
  }

  // 3) pdf_path aus invoices holen
  const { data: invoice, error: errInvoice } = await supabaseAdmin
    .from('invoices')
    .select('pdf_path')
    .eq('user_id', user.id)
    .eq('invoice_number', safeNumber)
    .single()

  if (errInvoice || !invoice?.pdf_path) {
    return NextResponse.json({ message: 'Rechnung nicht gefunden' }, { status: 404 })
  }

  // 4) Datei aus Storage laden
  const { data: fileBlob, error: errDownload } = await supabaseAdmin
    .storage
    .from('dokumente')
    .download(invoice.pdf_path)

  if (errDownload || !fileBlob) {
    return NextResponse.json({ message: 'Datei nicht im Bucket gefunden' }, { status: 404 })
  }

  // 5) PDF als Attachment zurückliefern
  const arrayBuffer = await fileBlob.arrayBuffer()
  return new NextResponse(arrayBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeNumber}.pdf"`,
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  })
}

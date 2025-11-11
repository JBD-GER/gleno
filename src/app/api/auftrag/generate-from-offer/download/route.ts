// src/app/api/auftrag/generate-from-offer/download/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/auftrag/generate-from-offer/download?path=auftrag/Datei.pdf&disposition=attachment|inline
 * Lädt eine Datei aus dem (nicht öffentlichen) Bucket "dokumente" und streamt sie zum Client.
 * Auth erforderlich (wir checken via supabaseServer()).
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await supabaseServer()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ message: 'Nicht eingeloggt' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const path = searchParams.get('path') // z.B. "auftrag/Auftragsbestaetigung_AC_1004T_K_00002.pdf"
    if (!path) {
      return NextResponse.json({ message: 'Parameter "path" fehlt' }, { status: 400 })
    }

    // Download über Service-Role (um Policies/RLS im Storage zu umgehen)
    const { data, error: dlErr } = await supabaseAdmin.storage
      .from('dokumente')
      .download(path)

    if (dlErr || !data) {
      return NextResponse.json({ message: 'Object not found' }, { status: 404 })
    }

    // Blob -> ArrayBuffer
    const ab = await (data as Blob).arrayBuffer()
    const filename = path.split('/').pop() || 'download.pdf'
    const disposition = (searchParams.get('disposition') === 'inline') ? 'inline' : 'attachment'

    return new NextResponse(ab, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ message: e?.message || 'Fehler' }, { status: 500 })
  }
}

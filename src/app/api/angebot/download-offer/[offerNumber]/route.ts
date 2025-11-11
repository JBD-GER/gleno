// ✅ PFAD: src/app/api/angebot/download-offer/[offerNumber]/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function encodeRFC5987ValueChars(str: string) {
  return encodeURIComponent(str).replace(/['()]/g, escape).replace(/\*/g, '%2A')
}

// entfernt führende "/" und optionales "dokumente/"
function normalizePath(p: string) {
  return p.replace(/^\/+/, '').replace(/^dokumente\//, '')
}

type OfferRow = { pdf_path: string; offer_number: string; created_at: string }

/**
 * GET /api/angebot/download-offer/[offerNumber]
 * Optional:
 *   ?path=angebote/Datei.pdf   (direkter Storage-Pfad, bevorzugt)
 *   ?offerNumber=Q-1234A       (Fallback per Query)
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ offerNumber: string }> }
) {
  try {
    // --- Auth erzwingen ---
    const supa = await supabaseServer()
    const { data: { user }, error: authErr } = await supa.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { offerNumber } = await params

    const url = new URL(req.url)
    const pathParamRaw = url.searchParams.get('path') || ''
    const offerNumberRaw = url.searchParams.get('offerNumber') || ''
    const offerNumberFromPath = (offerNumber || '').trim()

    const pathParam = decodeURIComponent(pathParamRaw).trim()
    const offerNumberParam = decodeURIComponent(
      offerNumberFromPath || offerNumberRaw
    ).trim()

    // --- 1) Direkter Storage-Pfad vorhanden? -> sofort laden ---
    if (pathParam) {
      const storagePath = normalizePath(pathParam)
      const { data: fileBlob, error } = await supabaseAdmin
        .storage
        .from('dokumente')
        .download(storagePath)

      if (error || !fileBlob) {
        return NextResponse.json({ message: `Datei nicht gefunden: ${storagePath}` }, { status: 404 })
      }

      const baseName = storagePath.split('/').pop() || 'angebot.pdf'
      const arrayBuffer = await fileBlob.arrayBuffer()
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${encodeRFC5987ValueChars(baseName)}"; filename*=UTF-8''${encodeRFC5987ValueChars(baseName)}`,
          'Cache-Control': 'private, max-age=0, must-revalidate'
        }
      })
    }

    // --- 2) Sonst über Angebotsnummer aus DB / Bucket ermitteln ---
    if (!offerNumberParam) {
      return NextResponse.json({ message: 'Parameter fehlt: path ODER offerNumber' }, { status: 400 })
    }

    // A) exakte Suche
    let { data: rowsA } = await supabaseAdmin
      .from('offers')
      .select('pdf_path, offer_number, created_at')
      .eq('user_id', user.id)
      .eq('offer_number', offerNumberParam)
      .order('created_at', { ascending: false })
      .limit(1)

    let offer: OfferRow | null = rowsA?.[0] ?? null

    // B) case-insensitive Fallback
    if (!offer) {
      const { data: rowsB } = await supabaseAdmin
        .from('offers')
        .select('pdf_path, offer_number, created_at')
        .eq('user_id', user.id)
        .ilike('offer_number', offerNumberParam)
        .order('created_at', { ascending: false })
        .limit(1)
      offer = rowsB?.[0] ?? null
    }

    // C) notfalls per Dateiname im Bucket suchen
    let storagePath: string | null = offer?.pdf_path ? normalizePath(offer.pdf_path) : null
    if (!storagePath) {
      const { data: list } = await supabaseAdmin
        .storage
        .from('dokumente')
        .list('angebote', { search: offerNumberParam })

      if (list && list.length > 0) {
        const hit = list.find(f => f.name.includes(`_${offerNumberParam}_`))
              || list.find(f => f.name.endsWith(`_${offerNumberParam}.pdf`))
              || list[0]
        storagePath = `angebote/${hit.name}`
      }
    }

    if (!storagePath) {
      return NextResponse.json({ message: 'Angebot nicht gefunden' }, { status: 404 })
    }

    const { data: fileBlob, error: dlErr } = await supabaseAdmin
      .storage
      .from('dokumente')
      .download(storagePath)

    if (dlErr || !fileBlob) {
      return NextResponse.json({ message: `Datei nicht im Bucket gefunden: ${storagePath}` }, { status: 404 })
    }

    const baseName = storagePath.split('/').pop() || `${offer?.offer_number || offerNumberParam}.pdf`
    const arrayBuffer = await fileBlob.arrayBuffer()
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeRFC5987ValueChars(baseName)}"; filename*=UTF-8''${encodeRFC5987ValueChars(baseName)}`,
        'Cache-Control': 'private, max-age=0, must-revalidate',
        ...(offer?.offer_number ? { 'X-Offer-Number': offer.offer_number } : {})
      }
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Serverfehler'
    return NextResponse.json({ message }, { status: 500 })
  }
}

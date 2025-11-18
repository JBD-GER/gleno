// src/app/api/cloud/export/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PDFDocument } from 'pdf-lib'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    '[cloud/export] SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY nicht gesetzt.'
  )
}

const supabaseAdmin = createClient(SUPABASE_URL!, SERVICE_KEY!, {
  auth: { persistSession: false },
})

type CloudDocumentRow = {
  id: string
  name: string
  path: string
  content_type: string | null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any))

    console.log('[cloud/export] body:', body)

    // 1) Versuche zuerst, die komplette Doku-Liste aus dem Body zu nehmen
    const docsFromBody: CloudDocumentRow[] = Array.isArray(body.documents)
      ? body.documents
      : []

    let docs: CloudDocumentRow[] = []

    if (docsFromBody.length > 0) {
      // ✅ Neuer Weg: wir bekommen alle relevanten Infos direkt vom Frontend
      console.log(
        '[cloud/export] benutze documents aus Body, Anzahl:',
        docsFromBody.length
      )
      docs = docsFromBody
    } else {
      // 🔁 Fallback: altes Verhalten über document_ids + DB
      const documentIds: string[] = Array.isArray(body.document_ids)
        ? body.document_ids
        : []

      console.log('[cloud/export] document_ids:', documentIds)

      if (documentIds.length === 0) {
        return NextResponse.json(
          { error: 'Im gewählten Zeitraum wurden keine Dokumente gefunden.' },
          { status: 400 }
        )
      }

      const { data, error: docsError } = await supabaseAdmin
        .from('cloud_documents')
        .select('id, name, path, content_type')
        .in('id', documentIds)

      if (docsError) {
        console.error('[cloud/export] Fehler beim Laden der Metadaten:', docsError)
        return NextResponse.json(
          { error: 'Fehler beim Laden der Dokumente.' },
          { status: 500 }
        )
      }

      console.log(
        '[cloud/export] gefundene Dokumente in DB (Fallback):',
        data?.length ?? 0
      )

      docs = (data || []) as CloudDocumentRow[]
    }

    if (!docs || docs.length === 0) {
      return NextResponse.json(
        { error: 'Im gewählten Zeitraum wurden keine Dokumente gefunden.' },
        { status: 400 }
      )
    }

    // 2) Nur PDFs berücksichtigen
    const pdfDocs = docs.filter((d) => {
      if (!d) return false
      const ct = d.content_type || ''
      return (
        ct === 'application/pdf' ||
        ct.startsWith('application/pdf') ||
        d.name.toLowerCase().endsWith('.pdf') ||
        d.path.toLowerCase().endsWith('.pdf')
      )
    })

    console.log('[cloud/export] PDFs nach Filter:', pdfDocs.length)

    if (pdfDocs.length === 0) {
      return NextResponse.json(
        { error: 'Im gewählten Zeitraum wurden keine PDF-Dokumente gefunden.' },
        { status: 400 }
      )
    }

    // 3) Alle PDFs aus dem Storage holen und in ein gemeinsames PDF mergen
    const mergedPdf = await PDFDocument.create()

    for (const doc of pdfDocs) {
      console.log('[cloud/export] lade aus Storage:', doc.path)

      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from('cloud')
        .download(doc.path)

      if (downloadError || !fileData) {
        console.error(
          `[cloud/export] Fehler beim Download von ${doc.path}:`,
          downloadError
        )
        continue // kaputte Files einfach überspringen
      }

      const bytes = await fileData.arrayBuffer()
      const pdf = await PDFDocument.load(bytes)
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
      copiedPages.forEach((p) => mergedPdf.addPage(p))
    }

    const pageCount = mergedPdf.getPageCount()
    console.log('[cloud/export] Seiten im Merge-PDF:', pageCount)

    if (pageCount === 0) {
      return NextResponse.json(
        { error: 'Im gewählten Zeitraum wurden keine PDF-Dokumente gefunden.' },
        { status: 400 }
      )
    }

    const mergedBytes = await mergedPdf.save()
    const filename = `Dokumentenexport_${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`

    return new NextResponse(Buffer.from(mergedBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err: any) {
    console.error('[cloud/export] Unerwarteter Fehler:', err)
    return NextResponse.json(
      { error: 'Fehler beim Export.' },
      { status: 500 }
    )
  }
}

// src/app/api/partners/applications/[id]/upload/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg'] as const
const BUCKET = 'markt'                   // <- Bucket-Name
const BASE_DIR = 'auftragsdokumente'     // <- Basis-Ordner im Bucket

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> } // <- params ist async in Next.js 15
) {
  try {
    const supabase = await supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    // <-- WICHTIG: params awaiten
    const { id: applicationId } = await ctx.params

    // Bewerbung holen
    const { data: app, error: appErr } = await supabase
      .from('market_applications')
      .select('id, partner_id, request_id, status')
      .eq('id', applicationId)
      .single()
    if (appErr || !app) return NextResponse.json({ error: 'application_not_found' }, { status: 404 })

    // Owner des Partners prüfen
    const { data: partner, error: pErr } = await supabase
      .from('partners')
      .select('id, owner_user_id')
      .eq('id', app.partner_id)
      .single()
    if (pErr || !partner) return NextResponse.json({ error: 'partner_not_found' }, { status: 404 })
    if (partner.owner_user_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const form = await req.formData()
    const files = form.getAll('files') as File[]
    if (!files?.length) return NextResponse.json({ error: 'files_required' }, { status: 400 })

    const uploaded: {
      id: string
      path: string
      name: string | null
      size: number | null
      content_type: string | null
      uploaded_at: string
    }[] = []

    for (const file of files) {
      if (!ALLOWED.includes(file.type as typeof ALLOWED[number])) {
        return NextResponse.json({ error: `unsupported_type_${file.type}` }, { status: 415 })
      }

      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)

      const ext =
        file.type === 'application/pdf' ? 'pdf' :
        file.type === 'image/png' ? 'png' : 'jpg'

      // markt/auftragsdokumente/<request_id>/<application_id>/<uuid>.<ext>
      const objectPath = `${BASE_DIR}/${app.request_id}/${applicationId}/${crypto.randomUUID()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(objectPath, bytes, {
          contentType: file.type,
          upsert: false,
          cacheControl: '3600',
        })
      if (upErr) {
        return NextResponse.json({ error: upErr.message || 'upload_failed' }, { status: 400 })
      }

      const { data: rec, error: insErr } = await supabase
        .from('market_application_files')
        .insert({
          application_id: applicationId,
          path: objectPath,
          name: file.name,
          size: file.size,
          content_type: file.type,
        })
        .select('id, path, name, size, content_type, uploaded_at')
        .single()

      if (insErr) {
        return NextResponse.json({ error: insErr.message || 'db_failed' }, { status: 400 })
      }

      uploaded.push(rec!)
    }

    return NextResponse.json({ ok: true, files: uploaded })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'upload_failed' }, { status: 400 })
  }
}

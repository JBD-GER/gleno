// src/app/api/partners/applications/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const t0 = Date.now()
  try {
    const supabase = await supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 })

    const applicationId = params.id

    const { data: app, error: appErr } = await supabase
      .from('market_applications')
      .select(`
        id, status, created_at, message_html, partner_id,
        request:market_requests ( id, status, category, city, zip, execution, summary, created_at ),
        files:market_application_files ( id, path, name, size, content_type, uploaded_at )
      `)
      .eq('id', applicationId)
      .single()
    if (appErr || !app) return NextResponse.json({ ok:false, error:'application_not_found' }, { status:404 })

    const { data: partner, error: pErr } = await supabase
      .from('partners')
      .select('id, owner_user_id, display_name, company_name')
      .eq('id', app.partner_id)
      .single()
    if (pErr || !partner) return NextResponse.json({ ok:false, error:'partner_not_found' }, { status:404 })
    if (partner.owner_user_id !== user.id) return NextResponse.json({ ok:false, error:'forbidden' }, { status:403 })

    // WICHTIG: gleicher Bucket wie im Upload!
    const BUCKET = 'markt'
    const EXPIRES = 60 * 60 * 12

    // Service-Client für Signed URLs
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // nur serverseitig
      { auth: { persistSession: false } }
    )

    const files = await Promise.all(
      (app.files ?? []).map(async (f: any) => {
        const { data: signed, error: signErr } = await admin
          .storage.from(BUCKET)
          .createSignedUrl(f.path, EXPIRES)

        if (signErr) {
          console.error('[applications/:id] sign error', f.path, signErr.message)
        }
        return {
          id: f.id,
          path: f.path,
          name: f.name,
          size: f.size,
          content_type: f.content_type,
          uploaded_at: f.uploaded_at,
          signed_url: signed?.signedUrl ?? null,
        }
      })
    )

    const payload = {
      id: app.id,
      status: app.status,
      created_at: app.created_at,
      message_html: app.message_html,
      partner_display: partner.display_name || partner.company_name || 'Partner',
      request: app.request,
      files,
    }

    console.log(`[applications/:id] returned with ${files.length} files in ${Date.now() - t0}ms`)
    return NextResponse.json({ ok:true, application: payload })
  } catch (e: any) {
    console.error('[applications/:id] fatal:', e)
    return NextResponse.json({ ok:false, error: e?.message || 'detail_failed' }, { status:500 })
  }
}

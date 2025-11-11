// src/app/api/partners/logo/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * WICHTIG:
 * - Lass das auf Node laufen. "edge" verursacht bei manchen Setups Trouble mit FormData/Libs.
 * - Stelle sicher, dass diese Datei im richtigen app-Ordner liegt (src/app oder app – nicht beides).
 */
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer()
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr) {
      return NextResponse.json({ ok:false, error:userErr.message || 'auth_failed' }, { status:401 })
    }
    if (!user) {
      return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 })
    }

    // Multipart lesen
    const form = await req.formData()
    const partner_id = String(form.get('partner_id') || '')
    const file = form.get('file') as File | null

    if (!partner_id) return NextResponse.json({ ok:false, error:'partner_id_required' }, { status:400 })
    if (!file)       return NextResponse.json({ ok:false, error:'file_required' }, { status:400 })

    // Ownership prüfen (Partner gehört dem eingeloggten User)
    const { data: partner, error: pErr } = await supabase
      .from('partners')
      .select('id, owner_user_id')
      .eq('id', partner_id)
      .maybeSingle()

    if (pErr)     return NextResponse.json({ ok:false, error:pErr.message || 'partner_lookup_failed' }, { status:403 })
    if (!partner) return NextResponse.json({ ok:false, error:'not_found' }, { status:404 })
    if (partner.owner_user_id !== user.id)
      return NextResponse.json({ ok:false, error:'forbidden' }, { status:403 })

    // Datei prüfen
    const maxBytes = 5 * 1024 * 1024 // 5 MB
    const allowed = ['image/png','image/jpeg','image/webp','image/gif','image/svg+xml']
    if (file.size > maxBytes) {
      return NextResponse.json({ ok:false, error:'file_too_large' }, { status:413 })
    }
    if (file.type && !allowed.includes(file.type)) {
      return NextResponse.json({ ok:false, error:'unsupported_type' }, { status:415 })
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const origExt = (file.name?.split('.').pop() || '').toLowerCase()
    const ext = ['png','jpg','jpeg','gif','webp','svg'].includes(origExt) ? origExt : (file.type?.split('/').pop() || 'png')
    const safeExt = ext === 'svg+xml' ? 'svg' : ext

    // Pfad-Schema:
    //   markt / logo / {partner_id} / {timestamp}.{ext}
    const objectPath = `logo/${partner_id}/${Date.now()}.${safeExt}`

    // Upload (RLS/Policies siehe unten!)
    const { data: up, error: upErr } = await supabase.storage
      .from('markt')
      .upload(objectPath, bytes, {
        contentType: file.type || `image/${safeExt}`,
        upsert: true,            // erlaubt Überschreiben -> benötigt UPDATE-Rechte!
        cacheControl: '3600'
      })

    if (upErr) {
      return NextResponse.json({ ok:false, error: upErr.message || 'upload_failed' }, { status:500 })
    }

    const { data: pub } = supabase.storage.from('markt').getPublicUrl(up.path)

    // In Partner schreiben
    const { error: updErr } = await supabase
      .from('partners')
      .update({ logo_path: up.path })
      .eq('id', partner_id)

    if (updErr) {
      return NextResponse.json({ ok:false, error: updErr.message || 'persist_failed' }, { status:500 })
    }

    return NextResponse.json({ ok:true, path: up.path, url: pub?.publicUrl || null })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'upload_failed' }, { status:500 })
  }
}

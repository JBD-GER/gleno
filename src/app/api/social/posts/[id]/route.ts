// app/api/social/posts/[id]/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

type Provider = 'facebook' | 'instagram' | 'linkedin'
type Status = 'planned' | 'posted' | 'disconnected' | 'failed'

type ParamsP = Promise<{ id: string }>

async function getSupaUser() {
  const supa = await supabaseServer()
  const {
    data: { user },
    error,
  } = await supa.auth.getUser()

  return { supa, user, error }
}

/**
 * Post inkl. Targets laden (für Responses)
 */
async function fetchPostWithTargets(
  supa: any,
  userId: string,
  id: string,
) {
  const { data, error } = await supa
    .from('social_posts')
    .select(
      `
      id,
      user_id,
      caption,
      hashtags,
      media_path,
      created_at,
      updated_at,
      deleted_at,
      social_post_targets (
        id,
        post_id,
        user_id,
        provider,
        status,
        scheduled_at,
        published_at,
        error_message,
        created_at,
        updated_at
      )
    `,
    )
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('[social_posts] fetchPostWithTargets error', error)
    return { error }
  }

  if (!data) {
    return { error: { message: 'Not found' } }
  }

  return { post: data }
}

/** EINZELNEN POST LADEN (optional) */
export async function GET(_req: Request, { params }: { params: ParamsP }) {
  const { id } = await params
  const { supa, user } = await getSupaUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { post, error } = await fetchPostWithTargets(supa, user.id, id)
  if (error || !post) {
    return NextResponse.json(
      { error: error?.message ?? 'Not found' },
      { status: 404 },
    )
  }

  return NextResponse.json({ post })
}

/**
 * POST AKTUALISIEREN
 * Body:
 * { caption, hashtags, scheduledAt, providers, mediaPath }
 */
export async function PUT(req: Request, { params }: { params: ParamsP }) {
  const { id } = await params
  const { supa, user } = await getSupaUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 },
    )
  }

  const {
    caption,
    hashtags,
    scheduledAt,
    providers,
    mediaPath,
  }: {
    caption?: string
    hashtags?: string[]
    scheduledAt?: string | null
    providers?: string[]
    mediaPath?: string | null
  } = body

  if (!Array.isArray(providers) || providers.length === 0) {
    return NextResponse.json(
      { error: 'Mindestens ein Kanal (providers) ist erforderlich.' },
      { status: 400 },
    )
  }

  // 1) Sicherstellen, dass der Post dem User gehört
  const { data: existing, error: existingErr } = await supa
    .from('social_posts')
    .select('id, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingErr) {
    console.error('[social_posts] load existing error', existingErr)
    return NextResponse.json(
      { error: 'Fehler beim Laden des Beitrags', details: existingErr.message },
      { status: 500 },
    )
  }

  if (!existing) {
    return NextResponse.json(
      { error: 'Beitrag nicht gefunden' },
      { status: 404 },
    )
  }

  // 2) Post aktualisieren
  const { data: updatedPost, error: updateErr } = await supa
    .from('social_posts')
    .update({
      caption: caption ?? null,
      hashtags: hashtags ?? null,
      media_path: mediaPath ?? null,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .single()

  if (updateErr || !updatedPost) {
    console.error('[social_posts] update error', updateErr)
    return NextResponse.json(
      {
        error: 'Fehler beim Aktualisieren des Beitrags',
        details: updateErr?.message,
      },
      { status: 500 },
    )
  }

  // 3) Alte Targets löschen
  const { error: delTargetsErr } = await supa
    .from('social_post_targets')
    .delete()
    .eq('post_id', id)
    .eq('user_id', user.id)

  if (delTargetsErr) {
    console.error('[social_post_targets] delete error', delTargetsErr)
    return NextResponse.json(
      {
        error: 'Fehler beim Aktualisieren der Ziel-Kanäle (Delete)',
        details: delTargetsErr.message,
      },
      { status: 500 },
    )
  }

  const scheduledIso = scheduledAt ? new Date(scheduledAt).toISOString() : null

  // 4) Neue Targets pro Provider anlegen (ohne account_id)
  const targetsToInsert =
    providers.map((p: string) => ({
      post_id: id,
      user_id: user.id,
      provider: p as Provider,
      status: 'planned' as Status,
      scheduled_at: scheduledIso,
      published_at: null,
    })) ?? []

  if (targetsToInsert.length) {
    const { error: insErr } = await supa
      .from('social_post_targets')
      .insert(targetsToInsert)

    if (insErr) {
      console.error('[social_post_targets] insert error', insErr)
      return NextResponse.json(
        {
          error: 'Fehler beim Speichern der Ziel-Kanäle',
          details: insErr.message,
        },
        { status: 500 },
      )
    }
  }

  // 5) Kompletten Post für Frontend zurückgeben
  const { post, error } = await fetchPostWithTargets(supa, user.id, id)
  if (error || !post) {
    console.error('[social_posts] fetch after update error', error)
    return NextResponse.json(
      {
        error:
          'Beitrag wurde aktualisiert, aber konnte danach nicht geladen werden.',
        details: error?.message,
      },
      { status: 500 },
    )
  }

  return NextResponse.json({ post })
}

/**
 * POST LÖSCHEN
 */
export async function DELETE(
  _req: Request,
  { params }: { params: ParamsP },
) {
  const { id } = await params
  const { supa, user } = await getSupaUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Targets löschen
  const { error: delTargetsErr } = await supa
    .from('social_post_targets')
    .delete()
    .eq('post_id', id)
    .eq('user_id', user.id)

  if (delTargetsErr) {
    console.error('[social_post_targets] delete error', delTargetsErr)
    return NextResponse.json(
      {
        error: 'Fehler beim Löschen der Ziel-Kanäle',
        details: delTargetsErr.message,
      },
      { status: 500 },
    )
  }

  // Post löschen
  const { error: delPostErr } = await supa
    .from('social_posts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (delPostErr) {
    console.error('[social_posts] delete error', delPostErr)
    return NextResponse.json(
      {
        error: 'Fehler beim Löschen des Beitrags',
        details: delPostErr.message,
      },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true })
}

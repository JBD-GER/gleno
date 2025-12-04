// app/api/social/posts/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

type Provider = 'facebook' | 'instagram' | 'linkedin'
type Status = 'planned' | 'posted' | 'disconnected' | 'failed'

type SocialPostTargetRow = {
  id: string
  post_id: string
  user_id: string
  provider: Provider
  status: Status
  scheduled_at: string | null
  published_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

type SocialPostRow = {
  id: string
  user_id: string
  caption: string | null
  hashtags: string[] | null
  media_path: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  social_post_targets: SocialPostTargetRow[]
}

type CreatePayload = {
  caption: string
  hashtags: string[]
  providers: Provider[]
  scheduledAt: string | null
  mediaPath?: string | null
}

/* ------------------------- GET: Posts lesen ------------------------- */

export async function GET() {
  const supa = await supabaseServer()
  const {
    data: { user },
    error: userError,
  } = await supa.auth.getUser()

  if (userError || !user) {
    // Kein User → leere Liste zurück
    return NextResponse.json({ posts: [] }, { status: 200 })
  }

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
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('social_posts GET error', error)
    return NextResponse.json(
      { error: 'Failed to load posts', posts: [] },
      { status: 500 },
    )
  }

  return NextResponse.json({ posts: (data ?? []) as SocialPostRow[] })
}

/* ------------------------- POST: Post anlegen ---------------------- */

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<CreatePayload>

  const caption =
    typeof body.caption === 'string' ? body.caption.slice(0, 2200) : ''
  const hashtags = Array.isArray(body.hashtags)
    ? body.hashtags.slice(0, 30)
    : []

  const providers = Array.isArray(body.providers)
    ? (body.providers.filter((p) =>
        ['facebook', 'instagram', 'linkedin'].includes(p as string),
      ) as Provider[])
    : []

  const scheduledIso =
    body.scheduledAt && typeof body.scheduledAt === 'string'
      ? new Date(body.scheduledAt).toISOString()
      : null

  const mediaPath =
    typeof body.mediaPath === 'string' && body.mediaPath.length > 0
      ? body.mediaPath
      : null

  if (providers.length === 0) {
    return NextResponse.json(
      { error: 'Mindestens ein Kanal muss gewählt werden.' },
      { status: 400 },
    )
  }

  const supa = await supabaseServer()
  const {
    data: { user },
    error: userError,
  } = await supa.auth.getUser()

  if (userError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    )
  }

  // 1) social_posts anlegen
  const { data: post, error: postError } = await supa
    .from('social_posts')
    .insert({
      user_id: user.id,
      caption,
      hashtags,
      media_path: mediaPath,
    })
    .select(
      `
      id,
      user_id,
      caption,
      hashtags,
      media_path,
      created_at,
      updated_at,
      deleted_at
    `,
    )
    .single()

  if (postError || !post) {
    console.error('social_posts POST error', postError)
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 },
    )
  }

  // 2) Targets pro Provider anlegen (ohne account_id, nur user_id + provider)
  const targetsInsert =
    providers.map((p) => ({
      post_id: post.id,
      user_id: user.id,
      provider: p,
      status: 'planned' as Status,
      scheduled_at: scheduledIso,
      published_at: null,
    })) ?? []

  if (targetsInsert.length > 0) {
    const { error: targetsError } = await supa
      .from('social_post_targets')
      .insert(targetsInsert)

    if (targetsError) {
      console.error('social_post_targets insert error', targetsError)
      // Post existiert, aber keine Targets → 500 mit Info
      return NextResponse.json(
        {
          error:
            'Post wurde angelegt, aber Ziel-Kanäle konnten nicht gespeichert werden.',
          details: targetsError.message,
          postId: post.id,
        },
        { status: 500 },
      )
    }
  }

  // 3) Post inkl. Targets zurückgeben
  const { data: fullPost, error: fullError } = await supa
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
    .eq('id', post.id)
    .single()

  if (fullError || !fullPost) {
    console.error('re-fetch fullPost error', fullError)
    // Fallback: Post ohne Targets
    return NextResponse.json(post as SocialPostRow, { status: 201 })
  }

  return NextResponse.json(fullPost as SocialPostRow, { status: 201 })
}

// app/api/social/callback/facebook/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseServer } from '@/lib/supabase-server'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gleno.de'

const META_APP_ID = process.env.META_APP_ID!
const META_APP_SECRET = process.env.META_APP_SECRET!

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) {
    console.error('FB OAuth error', error)
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellungen/social?error=facebook_oauth`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellungen/social?error=facebook_invalid`
    )
  }

  // 👇 FIX: cookies() awaiten
  const cookieStore = await cookies()
  const cookieState = cookieStore.get('fb_oauth_state')?.value
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellungen/social?error=facebook_state`
    )
  }

  const supa = await supabaseServer()
  const {
    data: { user },
  } = await supa.auth.getUser()

  if (!user) {
    return NextResponse.redirect(
      `${SITE_URL}/login?returnTo=/dashboard/einstellungen/social`
    )
  }

  const redirectUri = `${SITE_URL}/api/social/callback/facebook`

  // 1) Code -> Access Token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?` +
      new URLSearchParams({
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        redirect_uri: redirectUri,
        code,
      })
  )

  const tokenData = await tokenRes.json()
  if (!tokenRes.ok || !tokenData.access_token) {
    console.error('FB token error', tokenData)
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellungen/social?error=facebook_token`
    )
  }

  const userAccessToken = tokenData.access_token as string
  const effectiveToken = userAccessToken

  // 2) Pages holen
  const pagesRes = await fetch(
    'https://graph.facebook.com/v21.0/me/accounts?' +
      new URLSearchParams({
        fields: 'name,id,access_token,picture{url}',
      }),
    {
      headers: {
        Authorization: `Bearer ${effectiveToken}`,
      },
    }
  )

  const pagesData = await pagesRes.json()
  if (!pagesRes.ok) {
    console.error('FB pages error', pagesData)
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellungen/social?error=facebook_pages`
    )
  }

  const pages: any[] = pagesData.data ?? []
  const rows: any[] = []

  for (const page of pages) {
    rows.push({
      user_id: user.id,
      provider: 'facebook',
      account_type: 'page',
      external_id: page.id,
      display_name: page.name,
      avatar_url: page.picture?.data?.url ?? null,
      access_token: page.access_token,
      scopes: ['pages_manage_posts', 'pages_show_list'],
    })
  }

  if (rows.length > 0) {
    const { error: upsertError } = await supa.from('social_accounts').upsert(
      rows,
      { onConflict: 'user_id,provider,external_id' }
    )
    if (upsertError) {
      console.error('upsert social_accounts error', upsertError)
      return NextResponse.redirect(
        `${SITE_URL}/dashboard/einstellungen/social?error=facebook_upsert`
      )
    }
  }

  return NextResponse.redirect(
    `${SITE_URL}/dashboard/einstellungen/social?connected=facebook`
  )
}

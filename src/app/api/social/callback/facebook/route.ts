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
      `${SITE_URL}/dashboard/einstellung/social?error=facebook_oauth`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=facebook_invalid`
    )
  }

  const cookieStore = await cookies()
  const cookieState = cookieStore.get('fb_oauth_state')?.value
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=facebook_state`
    )
  }

  const supa = await supabaseServer()
  const {
    data: { user },
  } = await supa.auth.getUser()

  if (!user) {
    return NextResponse.redirect(
      `${SITE_URL}/login?returnTo=/dashboard/einstellung/social`
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
      `${SITE_URL}/dashboard/einstellung/social?error=facebook_token`
    )
  }

  const accessToken = tokenData.access_token as string

  // 2) Userprofil holen
  const meRes = await fetch(
    'https://graph.facebook.com/v21.0/me?fields=id,name,picture{url}',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )
  const me = await meRes.json()

  if (!meRes.ok || !me.id) {
    console.error('FB me error', me)
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=facebook_me`
    )
  }

  const rows = [
    {
      user_id: user.id,
      provider: 'facebook',
      account_type: 'profile',
      external_id: String(me.id),
      display_name: me.name || 'Facebook Profil',
      avatar_url: me.picture?.data?.url ?? null,
      access_token: accessToken,
      scopes: ['public_profile', 'email'],
    },
  ]

  const { error: upsertError } = await supa
    .from('social_accounts')
    .upsert(rows, { onConflict: 'user_id,provider,external_id' })

  if (upsertError) {
    console.error('upsert facebook social_accounts error', upsertError)
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=facebook_upsert`
    )
  }

  return NextResponse.redirect(
    `${SITE_URL}/dashboard/einstellung/social?connected=facebook`
  )
}

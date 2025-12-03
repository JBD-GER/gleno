// app/api/social/callback/instagram/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseServer } from '@/lib/supabase-server'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gleno.de'

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID!
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET!

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) {
    console.error('IG OAuth error', error)
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=instagram_oauth`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=instagram_invalid`
    )
  }

  const cookieStore = await cookies()
  const cookieState = cookieStore.get('ig_oauth_state')?.value
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=instagram_state`
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

  const redirectUri = `${SITE_URL}/api/social/callback/instagram`

  // 1) Code -> Access Token
  const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: INSTAGRAM_APP_ID,
      client_secret: INSTAGRAM_APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    }),
  })

  const tokenData = await tokenRes.json()
  if (!tokenRes.ok || !tokenData.access_token) {
    console.error('IG token error', tokenData)
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=instagram_token`
    )
  }

  const accessToken = tokenData.access_token as string
  const userId = tokenData.user_id as string

  // 2) Profil holen (Basic Display / Graph)
  const meRes = await fetch(
    `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${accessToken}`
  )
  const me = await meRes.json()

  if (!meRes.ok || !me.id) {
    console.error('IG me error', me)
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=instagram_me`
    )
  }

  const rows = [
    {
      user_id: user.id,
      provider: 'instagram',
      account_type: 'profile',
      external_id: String(me.id || userId),
      display_name: me.username || 'Instagram Account',
      avatar_url: null,
      access_token: accessToken,
      scopes: ['user_profile'],
    },
  ]

  const { error: upsertError } = await supa
    .from('social_accounts')
    .upsert(rows, { onConflict: 'user_id,provider,external_id' })

  if (upsertError) {
    console.error('upsert instagram social_accounts error', upsertError)
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=instagram_upsert`
    )
  }

  return NextResponse.redirect(
    `${SITE_URL}/dashboard/einstellung/social?connected=instagram`
  )
}

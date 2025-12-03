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
      `${SITE_URL}/dashboard/einstellung/social?error=facebook_oauth_${encodeURIComponent(
        error
      )}`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=facebook_invalid`
    )
  }

  // bei deiner Next-Version: cookies() ist async → await
  const cookieStore = await cookies()
  const cookieState = cookieStore.get('fb_oauth_state')?.value

  const supa = await supabaseServer()
  const {
    data: { user },
    error: userError,
  } = await supa.auth.getUser()

  if (!cookieState || cookieState !== state) {
    console.error('FB state mismatch', { cookieState, state, user, userError })
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=facebook_state`
    )
  }

  if (!user) {
    console.error('No Supabase user in callback', { userError })
    return NextResponse.redirect(
      `${SITE_URL}/login?returnTo=/dashboard/einstellung/social`
    )
  }

  const redirectUri = `${SITE_URL}/api/social/callback/facebook`

  // 1) Code → Access Token
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
    console.error('FB token error', tokenRes.status, tokenData)
    const fbErr =
      tokenData.error?.message ||
      tokenData.error_description ||
      JSON.stringify(tokenData)
    const errShort = encodeURIComponent(String(fbErr).substring(0, 180))

    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=facebook_token_${errShort}`
    )
  }

  const accessToken = tokenData.access_token as string

  // 2) Profil holen
  const meRes = await fetch(
    'https://graph.facebook.com/v21.0/me?fields=id,name,picture{url}',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
  const me = await meRes.json()

  if (!meRes.ok || !me.id) {
    console.error('FB me error', meRes.status, me)
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=facebook_me`
    )
  }

  // 3) Upsert in social_accounts
  const row = {
    user_id: user.id,
    provider: 'facebook' as const,
    account_type: 'profile' as const,
    external_id: String(me.id),
    display_name: me.name || 'Facebook Profil',
    avatar_url: me.picture?.data?.url ?? null,
    access_token: accessToken,
  }

  const { error: upsertError } = await supa
    .from('social_accounts')
    .upsert(row, {
      onConflict: 'user_id,provider,external_id',
    })

  if (upsertError) {
    console.error('upsert facebook social_accounts error', upsertError)
    const errShort = encodeURIComponent(
      String(
        upsertError.message ??
          upsertError.details ??
          JSON.stringify(upsertError)
      ).substring(0, 180)
    )

    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=facebook_upsert_${errShort}`
    )
  }

  return NextResponse.redirect(
    `${SITE_URL}/dashboard/einstellung/social?connected=facebook`
  )
}

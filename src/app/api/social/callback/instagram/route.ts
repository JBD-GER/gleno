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
      `${SITE_URL}/dashboard/einstellung/social?error=instagram_oauth_${encodeURIComponent(
        error
      )}`
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
    console.error('IG state mismatch', { cookieState, state })
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

  // 1) Code → Access Token
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
    console.error('IG token error', tokenRes.status, tokenData)

    const igErr =
      tokenData.error_message ||
      tokenData.error_description ||
      tokenData.error?.message ||
      JSON.stringify(tokenData)

    const errShort = encodeURIComponent(String(igErr).substring(0, 180))

    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=instagram_token_${errShort}`
    )
  }

  const accessToken = tokenData.access_token as string

  // 2) Profil holen
  const meRes = await fetch(
    `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${accessToken}`
  )
  const me = await meRes.json()

  if (!meRes.ok || !me.id) {
    console.error('IG me error', meRes.status, me)
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=instagram_me`
    )
  }

  const scopes = [
    'instagram_business_basic',
    'instagram_manage_comments',
    'instagram_business_manage_messages',
    'instagram_business_content_publish',
  ]

  // 3) Upsert in social_accounts – HIER der wichtige Teil
  const { error: upsertError } = await supa.from('social_accounts').upsert(
    [
      {
        user_id: user.id,
        provider: 'instagram',
        // Fix: Immer einen Wert verwenden, der vom CHECK-Constraint erlaubt ist
        account_type: 'profile', // <-- statt me.account_type
        external_id: String(me.id),
        display_name: me.username || 'Instagram Account',
        avatar_url: null,
        access_token: accessToken,
        scopes,
      },
    ],
    {
      onConflict: 'user_id,provider,external_id',
    }
  )

  if (upsertError) {
    console.error('upsert instagram social_accounts error', upsertError)
    const errShort = encodeURIComponent(
      String(
        upsertError.message ??
          upsertError.details ??
          JSON.stringify(upsertError)
      ).substring(0, 180)
    )

    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=instagram_upsert_${errShort}`
    )
  }

  return NextResponse.redirect(
    `${SITE_URL}/dashboard/einstellung/social?connected=instagram`
  )
}

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseServer } from '@/lib/supabase-server'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gleno.de'

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID!
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET!
// gleiche Version wie oben
const FB_API_VERSION = 'v21.0'

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

  // 1) Code → Access Token (Facebook / Graph OAuth)
  const tokenUrl = new URL(
    `https://graph.facebook.com/${FB_API_VERSION}/oauth/access_token`
  )
  tokenUrl.searchParams.set('client_id', INSTAGRAM_APP_ID)
  tokenUrl.searchParams.set('client_secret', INSTAGRAM_APP_SECRET)
  tokenUrl.searchParams.set('redirect_uri', redirectUri)
  tokenUrl.searchParams.set('code', code)

  const tokenRes = await fetch(tokenUrl.toString(), { method: 'GET' })
  const tokenData = await tokenRes.json()

  if (!tokenRes.ok || !tokenData.access_token) {
    console.error('IG token error', tokenRes.status, tokenData)

    const igErr =
      tokenData.error?.message ||
      tokenData.error_description ||
      tokenData.error_message ||
      JSON.stringify(tokenData)

    const errShort = encodeURIComponent(String(igErr).substring(0, 180))

    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=instagram_token_${errShort}`
    )
  }

  const accessToken = tokenData.access_token as string

  // 2) Grunddaten zum (Facebook-)User holen
  // (später kannst du über diesen Token die Instagram Business Accounts auslesen)
  const meRes = await fetch(
    `https://graph.facebook.com/${FB_API_VERSION}/me?fields=id,name&access_token=${accessToken}`
  )
  const me = await meRes.json()

  if (!meRes.ok || !me.id) {
    console.error('IG me error', meRes.status, me)
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=instagram_me`
    )
  }

  const scopes = [
    'email',
    'instagram_basic',
    'instagram_business_basic',
    'instagram_manage_comments',
    'instagram_business_manage_messages',
  ]

  // 3) Upsert in social_accounts
  const { error: upsertError } = await supa.from('social_accounts').upsert(
    [
      {
        user_id: user.id,
        provider: 'instagram',
        account_type: 'profile', // kannst du später auf 'business' o. ä. anpassen
        external_id: String(me.id), // aktuell: FB-User-ID, für den die IG-Rechte gelten
        display_name: me.name || 'Instagram Account',
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

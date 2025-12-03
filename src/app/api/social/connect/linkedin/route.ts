// app/api/social/callback/linkedin/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseServer } from '@/lib/supabase-server'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gleno.de'
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID!
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET!

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) {
    console.error('LinkedIn OAuth error', error)
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=linkedin_oauth`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=linkedin_invalid`
    )
  }

  const cookieStore = await cookies()
  const cookieState = cookieStore.get('li_oauth_state')?.value
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=linkedin_state`
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

  const redirectUri = `${SITE_URL}/api/social/callback/linkedin`

  // 1) Code -> Access Token
  const tokenRes = await fetch(
    'https://www.linkedin.com/oauth/v2/accessToken',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }),
    }
  )

  const tokenData = await tokenRes.json()
  if (!tokenRes.ok || !tokenData.access_token) {
    console.error('LinkedIn token error', tokenData)
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=linkedin_token`
    )
  }

  const accessToken = tokenData.access_token as string

  // 2) Userinfo holen (OpenID/Userinfo Endpoint)
  const meRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const me = await meRes.json()
  if (!meRes.ok || !me.sub) {
    console.error('LinkedIn me error', me)
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=linkedin_me`
    )
  }

  const fullName =
    [me.given_name, me.family_name].filter(Boolean).join(' ') ||
    me.name ||
    'LinkedIn Profil'

  const rows = [
    {
      user_id: user.id,
      provider: 'linkedin',
      account_type: 'profile',
      external_id: String(me.sub),
      display_name: fullName,
      avatar_url: me.picture ?? null,
      access_token: accessToken,
      scopes: ['r_liteprofile', 'r_emailaddress', 'w_member_social'],
    },
  ]

  const { error: upsertError } = await supa
    .from('social_accounts')
    .upsert(rows, { onConflict: 'user_id,provider,external_id' })

  if (upsertError) {
    console.error('upsert linkedin social_accounts error', upsertError)
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellung/social?error=linkedin_upsert`
    )
  }

  return NextResponse.redirect(
    `${SITE_URL}/dashboard/einstellung/social?connected=linkedin`
  )
}

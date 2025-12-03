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
      `${SITE_URL}/dashboard/einstellungen/social?error=instagram_oauth`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellungen/social?error=instagram_invalid`
    )
  }

  // 👇 FIX
  const cookieStore = await cookies()
  const cookieState = cookieStore.get('ig_oauth_state')?.value
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellungen/social?error=instagram_state`
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

  const redirectUri = `${SITE_URL}/api/social/callback/instagram`

  // 1) Code -> Access Token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?` +
      new URLSearchParams({
        client_id: INSTAGRAM_APP_ID,
        client_secret: INSTAGRAM_APP_SECRET,
        redirect_uri: redirectUri,
        code,
      })
  )

  const tokenData = await tokenRes.json()
  if (!tokenRes.ok || !tokenData.access_token) {
    console.error('IG token error', tokenData)
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellungen/social?error=instagram_token`
    )
  }

  const userAccessToken = tokenData.access_token as string
  const effectiveToken = userAccessToken

  // 2) Pages -> Instagram Business Accounts holen
  const pagesRes = await fetch(
    'https://graph.facebook.com/v21.0/me/accounts?' +
      new URLSearchParams({
        fields:
          'name,id,instagram_business_account{id,username,profile_picture_url}',
      }),
    {
      headers: {
        Authorization: `Bearer ${effectiveToken}`,
      },
    }
  )

  const pagesData = await pagesRes.json()
  if (!pagesRes.ok) {
    console.error('IG pages error', pagesData)
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellungen/social?error=instagram_pages`
    )
  }

  const pages: any[] = pagesData.data ?? []
  const rows: any[] = []

  for (const page of pages) {
    const ig = page.instagram_business_account
    if (!ig) continue

    rows.push({
      user_id: user.id,
      provider: 'instagram',
      account_type: 'page',
      external_id: ig.id,
      display_name: ig.username,
      avatar_url: ig.profile_picture_url ?? null,
      access_token: effectiveToken,
      scopes: ['instagram_basic', 'instagram_content_publish'],
    })
  }

  if (rows.length > 0) {
    const { error: upsertError } = await supa.from('social_accounts').upsert(
      rows,
      { onConflict: 'user_id,provider,external_id' }
    )
    if (upsertError) {
      console.error('upsert instagram social_accounts error', upsertError)
      return NextResponse.redirect(
        `${SITE_URL}/dashboard/einstellungen/social?error=instagram_upsert`
      )
    }
  }

  return NextResponse.redirect(
    `${SITE_URL}/dashboard/einstellungen/social?connected=instagram`
  )
}

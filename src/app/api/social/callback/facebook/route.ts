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
    return NextResponse.json(
      { step: 'oauth_error', error },
      { status: 400 }
    )
  }

  if (!code || !state) {
    return NextResponse.json(
      { step: 'missing_code_or_state', code, state },
      { status: 400 }
    )
  }

  const cookieStore = await cookies()
  const cookieState = cookieStore.get('fb_oauth_state')?.value

  const supa = await supabaseServer()
  const {
    data: { user },
    error: userError,
  } = await supa.auth.getUser()

  if (!cookieState || cookieState !== state) {
    return NextResponse.json(
      {
        step: 'state_mismatch',
        cookieState,
        state,
        hasUser: !!user,
        userError,
      },
      { status: 400 }
    )
  }

  if (!user) {
    return NextResponse.json(
      {
        step: 'no_user',
        cookieState,
        state,
        userError,
      },
      { status: 400 }
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
    return NextResponse.json(
      {
        step: 'token_error',
        status: tokenRes.status,
        tokenData,
      },
      { status: 400 }
    )
  }

  const accessToken = tokenData.access_token as string

  // 2) Profil holen
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
    return NextResponse.json(
      {
        step: 'me_error',
        status: meRes.status,
        me,
      },
      { status: 400 }
    )
  }

  // 3) Insert in social_accounts
  const row = {
    user_id: user.id,
    provider: 'facebook' as const,
    account_type: 'profile' as const,
    external_id: String(me.id),
    display_name: me.name || 'Facebook Profil',
    avatar_url: me.picture?.data?.url ?? null,
    access_token: accessToken,
  }

  const { data: inserted, error: insertError } = await supa
    .from('social_accounts')
    .insert(row)
    .select('*')
    .maybeSingle()

  // 4) Direkt nach dem Insert den kompletten Table lesen
  const { data: allAccounts, error: selectError } = await supa
    .from('social_accounts')
    .select('*')
    .order('created_at', { ascending: true })

  return NextResponse.json(
    {
      step: 'done',
      user,
      rowWeTriedToInsert: row,
      insertError,
      inserted,
      selectError,
      allAccounts,
    },
    { status: insertError ? 400 : 200 }
  )
}

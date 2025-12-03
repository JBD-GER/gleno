import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gleno.de'

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID!

function randomState() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export async function GET() {
  const supa = await supabaseServer()
  const {
    data: { user },
  } = await supa.auth.getUser()

  if (!user) {
    return NextResponse.redirect(
      `${SITE_URL}/login?returnTo=/dashboard/einstellung/social`
    )
  }

  const state = randomState()
  const redirectUri = `${SITE_URL}/api/social/callback/instagram`

  // Scopes passend zu deinen Berechtigungen
  const scopes = [
    'instagram_business_basic',
    'instagram_manage_comments',
    'instagram_business_manage_messages',
    // später kannst du z. B. noch 'instagram_business_content_publish' ergänzen
  ]

  const params = new URLSearchParams({
    client_id: INSTAGRAM_APP_ID,
    redirect_uri: redirectUri,
    scope: scopes.join(','),
    response_type: 'code',
    state,
  })

  const authUrl = `https://api.instagram.com/oauth/authorize?${params.toString()}`

  const res = NextResponse.redirect(authUrl)

  res.cookies.set('ig_oauth_state', state, {
    httpOnly: true,
    secure: true,
    path: '/',
    maxAge: 10 * 60,
  })

  return res
}

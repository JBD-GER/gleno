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
      `${SITE_URL}/dashboard/einstellungen/social?error=linkedin_oauth`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellungen/social?error=linkedin_invalid`
    )
  }

  // 👇 FIX
  const cookieStore = await cookies()
  const cookieState = cookieStore.get('li_oauth_state')?.value
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellungen/social?error=linkedin_state`
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

  const redirectUri = `${SITE_URL}/api/social/callback/linkedin`

  // 1) Code -> Access Token
  const tokenRes = await fetch(
    'https://www.linkedin.com/oauth/v2/accessToken',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
      `${SITE_URL}/dashboard/einstellungen/social?error=linkedin_token`
    )
  }

  const accessToken = tokenData.access_token as string

  // 2) Orgs holen, für die der User Admin ist
  const orgAclRes = await fetch(
    'https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&state=APPROVED&role=ADMIN&projection=(elements*(organization~(id,localizedName,logoV2(original~:playableStreams))))',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    }
  )

  const orgAclData = await orgAclRes.json()
  if (!orgAclRes.ok) {
    console.error('LinkedIn orgAcls error', orgAclData)
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/einstellungen/social?error=linkedin_orgs`
    )
  }

  const elements: any[] = orgAclData.elements ?? []
  const rows: any[] = []

  for (const el of elements) {
    const org = el['organization~']
    if (!org) continue

    const orgId = org.id
    const name =
      org.localizedName ||
      org['localizedName~'] ||
      `LinkedIn Org ${orgId}`

    let logoUrl: string | null = null
    try {
      const logoStreams = org.logoV2?.original?.elements ?? []
      if (logoStreams.length > 0) {
        logoUrl = logoStreams[0].identifiers?.[0]?.identifier ?? null
      }
    } catch {
      // ignore
    }

    rows.push({
      user_id: user.id,
      provider: 'linkedin',
      account_type: 'page',
      external_id: String(orgId),
      display_name: name,
      avatar_url: logoUrl,
      access_token: accessToken,
      scopes: ['w_organization_social', 'rw_organization_admin'],
    })
  }

  if (rows.length > 0) {
    const { error: upsertError } = await supa.from('social_accounts').upsert(
      rows,
      { onConflict: 'user_id,provider,external_id' }
    )
    if (upsertError) {
      console.error('upsert linkedin social_accounts error', upsertError)
      return NextResponse.redirect(
        `${SITE_URL}/dashboard/einstellungen/social?error=linkedin_upsert`
      )
    }
  }

  return NextResponse.redirect(
    `${SITE_URL}/dashboard/einstellungen/social?connected=linkedin`
  )
}

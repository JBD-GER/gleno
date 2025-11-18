// src/app/api/website/domain-request/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { sendBrevo } from '@/app/mails/sendBrevo'
import { renderWebsiteDomainRequestInternalMail } from '@/app/mails/emailTemplates'

export async function POST(_req: NextRequest) {
  try {
    // 1) Cookies EINMAL holen (Next 15: async)
    const cookieStore = await cookies()

    // 2) Supabase-Server-Client bauen, der die Supabase-Cookies liest
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          // Wir müssen hier nichts schreiben, daher no-op:
          set() {},
          remove() {},
        },
      }
    )

    // 3) User holen
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error('[domain-request] getUser error', userError)
    }

    if (!user) {
      console.warn('[domain-request] no user from supabase')
      return NextResponse.json(
        { ok: false, error: 'Nicht eingeloggt.' },
        { status: 401 }
      )
    }

    // 4) Website des Users holen
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id, slug, title, domain_requested')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (websiteError) {
      console.error('[domain-request] load website error', websiteError)
      return NextResponse.json(
        { ok: false, error: 'Website konnte nicht geladen werden.' },
        { status: 500 }
      )
    }

    if (!website) {
      return NextResponse.json(
        { ok: false, error: 'Keine Website für diesen Account gefunden.' },
        { status: 404 }
      )
    }

    // Schon angefragt → einfach OK
    if (website.domain_requested) {
      return NextResponse.json({ ok: true })
    }

    // 5) Nutzer-E-Mail sauber ermitteln (verschiedene Pfade für Clerk/OAuth etc.)
    const userEmail =
      (user.email as string | null) ??
      (user.user_metadata?.email as string | null) ??
      (Array.isArray(user.identities) &&
        (user.identities[0]?.identity_data as any)?.email) ??
      'unbekannt'

    const websiteSlug = website.slug
    const websiteTitle = website.title ?? 'Unbenannte Website'

    // 6) HTML-Mail über dein zentrales Template
    const htmlContent = renderWebsiteDomainRequestInternalMail({
      userEmail,
      websiteTitle,
      websiteSlug,
    })

    // Plain-Text für Fallback-Mailclients
    const textContent = `Neue Anfrage für eine professionelle Website inkl. eigener Domain.

Nutzer: ${userEmail}
Website: ${websiteTitle}
Slug / URL: ${websiteSlug ? `/w/${websiteSlug}` : '-'}

Bitte den Nutzer kontaktieren und Angebot/Umsetzung abstimmen.`

    const fd = new FormData()
    fd.set('to', 'support@gleno.de')
    fd.set(
      'subject',
      'Anfrage: Professionelle Website inkl. eigener Domain'
    )
    fd.set('htmlContent', htmlContent)
    fd.set('textContent', textContent)

    await sendBrevo(fd)

    // 7) Flag in der DB setzen, damit der CTA verschwindet
    const { error: updateError } = await supabase
      .from('websites')
      .update({ domain_requested: true })
      .eq('id', website.id)

    if (updateError) {
      console.error('[domain-request] update error', updateError)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[domain-request] error', error)
    return NextResponse.json(
      { ok: false, error: 'Fehler beim Versenden der Anfrage.' },
      { status: 500 }
    )
  }
}

// src/app/(public)/w/[slug]/impressum/page.tsx
import { supabaseServer } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import Image from 'next/image'
import React from 'react'

export const revalidate = 60
type ParamsP = { params: Promise<{ slug: string }> }

function HostedCard({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <div
      className="
        mt-6 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-5 shadow-sm
      "
      style={{ outline: `1px solid ${secondary}22` }}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="inline-block h-8 w-8 rounded-xl"
          style={{ background: secondary }}
        />
        <div>
          <h2 className="text-base md:text-lg font-semibold" style={{ color: primary }}>
            Gehostete Website
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-800">
            Diese Website wird als gehostete Lösung von <strong>GLENO.de</strong> bereitgestellt
            (Bereitstellung über Vercel, Region Frankfurt (DE), und Supabase auf Amazon Web Services,
            Region Frankfurt (DE)). Die Flaaq Holding GmbH übernimmt keine Gewährleistung für Urheberrechte
            an extern eingebundenen Inhalten; auf Urheberrechtskontrollen wird ausdrücklich verzichtet.
          </p>
        </div>
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: ParamsP) {
  const { slug } = await params
  const supabase = await supabaseServer()
  const { data } = await supabase
    .from('websites')
    .select('title, favicon_url, status')
    .eq('slug', slug)
    .single()

  if (!data || data.status !== 'published') return {}
  return {
    title: `Impressum – ${data.title || 'Website'}`,
    icons: data.favicon_url ? [{ rel: 'icon', url: data.favicon_url }] : undefined,
  }
}

export default async function ImprintPage({ params }: ParamsP) {
  const { slug } = await params
  const supabase = await supabaseServer()
  const { data, error } = await supabase
    .from('websites')
    .select('title, logo_url, primary_color, secondary_color, imprint_html, status')
    .eq('slug', slug)
    .single()

  if (error || !data) notFound()
  if (data.status !== 'published') notFound()

  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? 'https'
  const host  = h.get('x-forwarded-host') ?? h.get('host') ?? ''
  const origin = host ? `${proto}://${host}` : ''
  const base = origin ? `${origin}/w/${slug}` : `/w/${slug}`

  const primary = data.primary_color || '#0a1b40'
  const secondary = data.secondary_color || '#f59e0b'
  const ownerName = data.title || 'Ihr Unternehmen'
  const year = new Date().getFullYear()

  return (
    <main
      style={
        {
          ['--brand' as any]: primary,
          ['--accent' as any]: secondary,
        } as React.CSSProperties
      }
      className="
        min-h-screen
        bg-[radial-gradient(ellipse_at_top,_rgba(10,27,64,0.06),transparent_60%)]
      "
    >
      {/* HEADER (leicht reduziert, mit Zurück-CTA) */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/55 border-b border-white/60">
        <div className="mx-auto max-w-6xl px-4 py-4 grid grid-cols-[auto_1fr_auto] items-center gap-6">
          <div className="min-w-0">
            {data.logo_url ? (
              <Image
                src={data.logo_url}
                alt="Logo"
                width={256}
                height={128}
                className="h-8 md:h-9 lg:h-10 w-auto object-contain"
                sizes="(min-width:1024px) 160px, (min-width:768px) 140px, 120px"
                priority
              />
            ) : (
              <span className="font-semibold text-base md:text-lg truncate text-slate-900">
                {data.title || 'Website'}
              </span>
            )}
          </div>

          <div className="justify-self-center text-sm md:text-[15px] text-slate-700">
            Rechtliche Angaben
          </div>

          <div className="justify-self-end">
            <a
              href={base}
              className="
                inline-flex items-center gap-2
                px-4 py-2 rounded-xl
                border border-white/70
                bg-white/65 hover:bg-white/85
                backdrop-blur-lg
                shadow-sm hover:shadow
                transition
                text-slate-900
              "
            >
              Zurück zur Website
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: `${secondary}` }} />
            </a>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <section className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        <h1 className="text-2xl md:text-3xl font-semibold mb-4" style={{ color: 'var(--brand)' }}>
          Impressum
        </h1>

        <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-5 text-sm text-slate-800 shadow-sm">
          {data.imprint_html ? (
            <div dangerouslySetInnerHTML={{ __html: data.imprint_html }} />
          ) : (
            <p>Es wurde noch kein Impressum hinterlegt.</p>
          )}
        </div>

        {/* Separate hübsche Karte für den Hosting-Hinweis */}
        <HostedCard primary={primary} secondary={secondary} />
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/60 bg-white/50 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm flex flex-wrap items-center gap-3">
          <a
            href={`${base}/impressum`}
            className="px-3 py-2 rounded-lg bg-white/40 hover:bg-white/70 border border-white/60 backdrop-blur-sm transition text-slate-800"
          >
            Impressum
          </a>
          <a
            href={`${base}/datenschutzerklaerung`}
            className="px-3 py-2 rounded-lg bg-white/40 hover:bg-white/70 border border-white/60 backdrop-blur-sm transition text-slate-800"
          >
            Datenschutzerklärung
          </a>

          <span className="ml-auto text-slate-700">
            © {year} <span style={{ color: 'var(--brand)' }}>{ownerName}</span> – Alle Rechte vorbehalten
          </span>
        </div>
      </footer>
    </main>
  )
}

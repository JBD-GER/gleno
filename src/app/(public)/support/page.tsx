// src/app/(public)/support/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  PhoneIcon,
  EnvelopeIcon,
  QuestionMarkCircleIcon,
  DocumentArrowDownIcon,
  ShieldCheckIcon,
  LifebuoyIcon,
} from '@heroicons/react/24/outline'

/* ----------------------------- SEO / Meta ----------------------------- */
const SITE_NAME = 'GLENO'
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://gleno.de'
const PRIMARY = '#0a1b40'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Support – GLENO',
    template: '%s | GLENO',
  },
  description:
    'Support für GLENO: Telefon & E-Mail, schnelle Hilfe, Import, Status & FAQ. All-in-One Plattform für Agenturen & Dienstleister.',
  alternates: { canonical: `${SITE_URL}/support` },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/support`,
    siteName: SITE_NAME,
    title: 'Support – GLENO',
    description:
      'Telefon & E-Mail Support, Hilfe bei Einrichtung, Import, CRM, Marktplatz & Website-Modul.',
    images: [{ url: `${SITE_URL}/og/og-support.jpg`, width: 1200, height: 630 }],
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Support – GLENO',
    description:
      'Telefon & E-Mail Support, Hilfe bei Einrichtung, Import, CRM, Marktplatz & Website-Modul.',
    images: [`${SITE_URL}/og/og-support.jpg`],
  },
  robots: { index: true, follow: true },
}

/* -------------------------------- Page -------------------------------- */
export default function SupportPage() {
  return (
    <div className="space-y-20 pb-16">
      {/* zarte Keyframes für den Soft-Glow */}
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes floatSoft {
            0%{ transform: translate3d(0,0,0); opacity:.5 }
            50%{ transform: translate3d(12px,8px,0); opacity:.62 }
            100%{ transform: translate3d(0,0,0); opacity:.5 }
          }`,
        }}
      />

      {/* Hero – Glass */}
      <section className="relative">
        {/* Hintergrund-Glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-28 -bottom-16 -z-10"
          style={{
            background:
              'radial-gradient(1400px 520px at 50% -8%, rgba(10,27,64,0.06), transparent),' +
              'radial-gradient(1100px 480px at 15% -10%, rgba(10,27,64,0.05), transparent),' +
              'radial-gradient(1100px 480px at 85% -12%, rgba(10,27,64,0.05), transparent)',
          }}
        />
        {/* animierte Lichtblase */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 -top-8 -z-10 h-[34rem] w-[34rem] rounded-full"
          style={{
            background:
              'radial-gradient(closest-side, rgba(10,27,64,.14), rgba(10,27,64,0))',
            filter: 'blur(26px)',
            animation: 'floatSoft 12s ease-in-out infinite',
          }}
        />

        <div className="relative mx-auto max-w-6xl px-6 pt-12 sm:pt-16">
          <div className="rounded-3xl border border-white/60 bg-white/70 p-10 text-center shadow-[0_18px_50px_rgba(2,6,23,0.08)] backdrop-blur-xl ring-1 ring-white/60 sm:p-14">
            <p className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold text-slate-900 ring-1 ring-white/60">
              <span
                className="rounded-full px-2 py-0.5 text-white"
                style={{ backgroundColor: PRIMARY }}
              >
                Hilfe
              </span>
              <span>Persönlicher Support – Telefon & E-Mail</span>
            </p>

            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Wir helfen dir schnell & unkompliziert
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-slate-700">
              Fragen zu Einrichtung, Import, CRM, Marktplatz, Website-Modul oder
              Abrechnung? Melde dich gerne – werktags reagieren wir in der Regel
              innerhalb weniger Stunden.
            </p>

            {/* Kontakt-CTA */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="tel:+4950353169991"
                className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow transition"
                style={{
                  backgroundColor: PRIMARY,
                  boxShadow:
                    '0 10px 28px rgba(10,27,64,.22), inset 0 1px 0 rgba(255,255,255,.25)',
                }}
                aria-label="Support anrufen"
              >
                <PhoneIcon className="h-5 w-5" />
                +49&nbsp;5035&nbsp;3169991
              </a>
              <a
                href="mailto:support@gleno.de"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/60 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-900 ring-1 ring-white/60 backdrop-blur hover:bg-white"
                aria-label="E-Mail an den Support schreiben"
              >
                <EnvelopeIcon className="h-5 w-5" />
                support@gleno.de
              </a>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Mo–Fr 9–17 Uhr • Server in der EU • DSGVO-konform
            </p>
          </div>
        </div>
      </section>

      {/* Quick Cards */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 sm:grid-cols-3">
        {[
          {
            title: 'Import & Daten',
            desc: 'Vorlagen & Anleitung für den Import deiner Daten.',
            href: '/docs/csv-vorlagen',
            icon: DocumentArrowDownIcon,
          },
          {
            title: 'System-Status',
            desc: 'Verfügbarkeit & geplante Wartungen im Blick.',
            href: '/status',
            icon: ShieldCheckIcon,
          },
          {
            title: 'Hilfe-Center',
            desc: 'Schritt-für-Schritt-Guides & Best Practices zu GLENO.',
            href: '/docs',
            icon: LifebuoyIcon,
          },
        ].map(({ title, desc, href, icon: Icon }) => (
          <Link
            key={title}
            href={href}
            className="group rounded-2xl border border-white/60 bg-white/70 p-6 shadow-[0_12px_36px_rgba(2,6,23,0.07)] backdrop-blur-xl ring-1 ring-white/60 transition hover:shadow-[0_16px_44px_rgba(2,6,23,0.09)]"
          >
            <div className="mb-3 inline-flex rounded-xl bg-white/80 p-3 ring-1 ring-white/60">
              <Icon className="h-6 w-6 text-slate-900" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              {title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              {desc}
            </p>
            <span className="mt-3 inline-block text-sm font-medium text-slate-900/70 group-hover:text-slate-900">
              Öffnen →
            </span>
          </Link>
        ))}
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-6xl px-6">
        <h2 className="mb-2 flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900">
          <QuestionMarkCircleIcon className="h-6 w-6 text-slate-400" />
          Häufige Fragen
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            {
              q: 'Wie starte ich mit GLENO?',
              a: 'Registriere dein Konto, lege dein Unternehmen an und folge den Schritten in der Dokumentation. Bei Fragen hilft der Support.',
            },
            {
              q: 'Wie importiere ich bestehende Daten?',
              a: 'Über passende CSV-Vorlagen. Im Hilfe-Center findest du Beispiele & Erklärungen.',
            },
            {
              q: 'Welche Support-Kanäle gibt es?',
              a: 'Telefon & E-Mail. Wir antworten in der Regel werktags innerhalb weniger Stunden.',
            },
            {
              q: 'Wo liegen meine Daten?',
              a: 'In der EU, verschlüsselt übertragen. Exporte sind jederzeit möglich.',
            },
          ].map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl ring-1 ring-white/60 open:shadow-[0_10px_34px_rgba(2,6,23,0.07)]"
            >
              <summary className="cursor-pointer list-none rounded-2xl p-5 text-left">
                <div className="text-base font-medium text-slate-900">
                  {f.q}
                </div>
                <div className="mt-1 hidden text-sm text-slate-700 group-open:block">
                  {f.a}
                </div>
              </summary>
              <div className="px-5 pb-5 pt-0 text-sm text-slate-700 sm:hidden">
                {f.a}
              </div>
            </details>
          ))}
        </div>

        {/* SEO-Abschluss */}
        <p className="mt-8 text-sm leading-relaxed text-slate-600">
          Noch Fragen zu <strong>GLENO</strong> oder zur Einrichtung deiner
          All-in-One Plattform für Marktplatz, CRM und Website? Ruf uns an oder
          schreib eine E-Mail – wir unterstützen dich beim Start und bei allen
          Schritten im laufenden Betrieb.
        </p>
      </section>
    </div>
  )
}

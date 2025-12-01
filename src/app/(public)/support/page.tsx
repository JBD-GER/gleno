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
    default: 'Support – GLENO Unternehmenssoftware',
    template: '%s | GLENO',
  },
  description:
    'Support für die GLENO Unternehmenssoftware: Telefon & E-Mail, Hilfe bei Einrichtung, Import, Datenumzug, Sicherheit und Fragen zum Alltag mit Aufträgen, Projekten, Zeiten & Rechnungen.',
  alternates: { canonical: `${SITE_URL}/support` },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/support`,
    siteName: SITE_NAME,
    title: 'Support – GLENO Unternehmenssoftware',
    description:
      'Persönlicher Support für die GLENO All-in-One Unternehmenssoftware: Hilfe bei Setup, Datenimport, Prozessen & Sicherheit – telefonisch oder per E-Mail.',
    images: [{ url: `${SITE_URL}/og/og-support.jpg`, width: 1200, height: 630 }],
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Support – GLENO Unternehmenssoftware',
    description:
      'Telefon & E-Mail Support für die GLENO Unternehmenssoftware. Unterstützung bei Einrichtung, Datenimport & laufendem Betrieb.',
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

      {/* Hero – Glass / Unternehmenssoftware-Support */}
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

        <div className="relative mx-auto max-w-7xl px-6 pt-12 sm:pt-16">
          <div className="rounded-3xl border border-white/60 bg-white/75 p-10 text-center shadow-[0_18px_50px_rgba(2,6,23,0.08)] backdrop-blur-xl ring-1 ring-white/60 sm:p-14">
            <p className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold text-slate-900 ring-1 ring-white/60">
              <span
                className="rounded-full px-2 py-0.5 text-white"
                style={{ backgroundColor: PRIMARY }}
              >
                Support
              </span>
              <span>Persönlicher Ansprechpartner für Ihre Unternehmenssoftware</span>
            </p>

            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Wir unterstützen Sie beim Arbeiten mit GLENO.
            </h1>
            <p className="mx-auto mt-3 max-w-3xl text-base leading-relaxed text-slate-700">
              Ob Sie GLENO gerade einführen oder bereits täglich nutzen – bei Fragen
              zu Einrichtung, Datenimport, Prozessen oder Sicherheit erreichen Sie uns
              direkt. Unser Ziel: Ihre All-in-One Unternehmenssoftware soll sich im
              Alltag ruhig und verlässlich anfühlen.
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
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/60 bg-white/85 px-6 py-3 text-sm font-semibold text-slate-900 ring-1 ring-white/60 backdrop-blur hover:bg-white"
                aria-label="E-Mail an den Support schreiben"
              >
                <EnvelopeIcon className="h-5 w-5" />
                support@gleno.de
              </a>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Mo–Fr 9–17 Uhr · Server in der EU · DSGVO-konforme Unternehmenssoftware
            </p>
          </div>
        </div>
      </section>

      {/* Quick Cards – Selbsthilfe & Status */}
      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 sm:grid-cols-3">
        {[
          {
            title: 'Import & Daten',
            desc: 'CSV-Vorlagen & Anleitungen für den Import von Kunden, Projekten & Stammdaten.',
            href: '/docs/csv-vorlagen',
            icon: DocumentArrowDownIcon,
          },
          {
            title: 'System-Status',
            desc: 'Verfügbarkeit der GLENO-Unternehmenssoftware & geplante Wartungen im Überblick.',
            href: '/status',
            icon: ShieldCheckIcon,
          },
          {
            title: 'Hilfe-Center',
            desc: 'Schritt-für-Schritt-Guides zu Aufträgen, Projekten, Zeiten, Rechnungen & mehr.',
            href: '/docs',
            icon: LifebuoyIcon,
          },
        ].map(({ title, desc, href, icon: Icon }) => (
          <Link
            key={title}
            href={href}
            className="group rounded-2xl border border-white/60 bg-white/75 p-6 shadow-[0_12px_36px_rgba(2,6,23,0.07)] backdrop-blur-xl ring-1 ring-white/60 transition hover:shadow-[0_16px_44px_rgba(2,6,23,0.09)]"
          >
            <div className="mb-3 inline-flex rounded-xl bg-white/90 p-3 ring-1 ring-white/70">
              <Icon className="h-6 w-6 text-slate-900" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              {desc}
            </p>
            <span className="mt-3 inline-block text-sm font-medium text-slate-900/70 group-hover:text-slate-900">
              Öffnen →
            </span>
          </Link>
        ))}
      </section>

      {/* FAQ – typische Support-Themen rund um Unternehmenssoftware */}
      <section className="mx-auto max-w-7xl px-6">
        <h2 className="mb-2 flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900">
          <QuestionMarkCircleIcon className="h-6 w-6 text-slate-400" />
          Häufige Fragen zur Unterstützung mit GLENO
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
          Die häufigsten Support-Themen rund um Einrichtung, Datenübernahme und den
          täglichen Einsatz der GLENO Unternehmenssoftware.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            {
              q: 'Wie starte ich mit der GLENO Unternehmenssoftware?',
              a: 'Sie registrieren Ihr Konto, legen Ihr Unternehmen an und folgen dem Einrichtungs-Assistenten. Im Hilfe-Center finden Sie Emp­fehlungen für den Start mit Aufträgen, Projekten, Zeiten und Rechnungen. Wenn Sie möchten, begleiten wir Sie per Telefon oder E-Mail.',
            },
            {
              q: 'Wie importiere ich bestehende Kunden- und Projektdaten?',
              a: 'Über CSV-Vorlagen können Sie Kunden, Kontakte, Projekte und weitere Stammdaten in GLENO importieren. Im Bereich „Import & Daten“ finden Sie passende Vorlagen, Beispiele und Erklärungen. Bei Fragen unterstützen wir Sie gerne.',
            },
            {
              q: 'Welche Support-Kanäle bietet GLENO?',
              a: 'Sie erreichen uns per E-Mail und telefonisch. In der Regel antworten wir werktags innerhalb weniger Stunden. Für komplexere Themen können wir einen kurzen gemeinsamen Termin vereinbaren.',
            },
            {
              q: 'Unterstützen Sie bei der Abbildung unserer Prozesse?',
              a: 'Ja. Viele Unternehmen nutzen GLENO für Auftragsmanagement, Projektsteuerung, Zeiterfassung und Rechnungen. Wir besprechen mit Ihnen, wie Ihre Abläufe aussehen und welches Setup in GLENO dazu passt.',
            },
            {
              q: 'Wo werden meine Unternehmensdaten gespeichert?',
              a: 'GLENO wird auf Servern in der EU betrieben. Die Daten werden verschlüsselt übertragen, regelmäßige Backups sind Teil des Betriebs. Auf Wunsch erläutern wir Ihnen gerne die wichtigsten technischen und organisatorischen Maßnahmen.',
            },
            {
              q: 'Was ist, wenn sich unser Bedarf später ändert?',
              a: 'GLENO ist modular gedacht – Sie können Bereiche wie Logistik, Vault oder Website-Builder nach und nach stärker nutzen, ohne das System wechseln zu müssen. Wenn Sie GLENO irgendwann verlassen möchten, lassen sich relevante Daten exportieren.',
            },
          ].map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-white/60 bg-white/75 backdrop-blur-xl ring-1 ring-white/60 open:shadow-[0_10px_34px_rgba(2,6,23,0.07)]"
            >
              <summary className="cursor-pointer list-none rounded-2xl p-5 text-left">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-base font-medium text-slate-900">
                    {f.q}
                  </div>
                  <span className="text-xs text-slate-400 transition-transform group-open:rotate-90">
                    ▸
                  </span>
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

        {/* SEO-Abschluss / ruhiger Text */}
        <p className="mt-8 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
          Wenn Sie eine <strong>zentrale Unternehmenssoftware</strong> für Aufträge,
          Projekte, Zeiten, Rechnungen, Team, Dokumente und Logistik nutzen möchten,
          sollen Support-Fragen nicht zur zusätzlichen Baustelle werden. Melden Sie sich
          einfach telefonisch oder per E-Mail – wir helfen Ihnen dabei, GLENO sauber
          einzurichten und im Alltag entspannt zu nutzen.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
          <a
            href="tel:+4950353169991"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
          >
            <PhoneIcon className="h-4 w-4" />
            Support anrufen
          </a>
          <a
            href="mailto:support@gleno.de"
            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            <EnvelopeIcon className="h-4 w-4" />
            E-Mail an support@gleno.de
          </a>
          <Link
            href="/beratung"
            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            Oder zuerst eine kurze Beratung zu GLENO buchen ↗
          </Link>
        </div>
      </section>
    </div>
  )
}

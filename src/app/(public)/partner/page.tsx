// src/app/(public)/partner/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'

/* ----------------------------- Site Constants ----------------------------- */
const SITE_NAME = 'GLENO'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gleno.de'
const PRIMARY = '#0F172A'
const ACCENT = PRIMARY

/* --------------------------------- SEO ----------------------------------- */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'GLENO Partnerprogramm – 30 % Lifetime Provision',
    template: '%s | GLENO',
  },
  description:
    'Werden Sie GLENO-Affiliate und verdienen Sie 30 % Lifetime Provision auf jedes aktive Abonnement. Zusätzlich sind strategische Partnerschaften mit bis zu 35 % Provision möglich.',
  keywords: [
    'GLENO',
    'Affiliate Programm',
    'Partnerprogramm',
    'Lifetime Provision',
    'SaaS Affiliate',
    'Wiederkehrende Provision',
  ],
  category: 'software',
  alternates: { canonical: `${SITE_URL}/partner` },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/partner`,
    siteName: SITE_NAME,
    title: 'GLENO Partnerprogramm – 30 % Lifetime Provision',
    description:
      'Empfehlen Sie GLENO und erhalten Sie 30 % Lifetime Provision auf aktive Abonnements – mit zusätzlichen Optionen für strategische Partnerschaften bis 35 %.',
    images: [
      {
        url: `${SITE_URL}/og/og-home.jpg`,
        width: 1200,
        height: 630,
        alt: 'GLENO Partnerprogramm – 30 % Lifetime Provision',
      },
    ],
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GLENO Partnerprogramm – 30 % Lifetime Provision',
    description:
      'Werden Sie GLENO-Affiliate und verdienen Sie wiederkehrende Provision auf aktive Abos.',
    images: [`${SITE_URL}/og/og-home.jpg`],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
}

/* ----------------------------- JSON-LD Schema ----------------------------- */
function JsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/favi.png`,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}#website`,
        url: SITE_URL,
        name: SITE_NAME,
        publisher: { '@id': `${SITE_URL}#organization` },
        inLanguage: 'de-DE',
      },
      {
        '@type': 'WebPage',
        '@id': `${SITE_URL}/partner#webpage`,
        url: `${SITE_URL}/partner`,
        name: 'GLENO Partnerprogramm',
        description:
          'Informationen zum GLENO Partnerprogramm mit 30 % Lifetime Provision und bis zu 35 % für strategische Partnerschaften.',
        publisher: { '@id': `${SITE_URL}#organization` },
        inLanguage: 'de-DE',
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Wie viel Provision erhalte ich als GLENO-Affiliate?',
            acceptedAnswer: {
              '@type': 'Answer',
              text:
                'Als GLENO-Affiliate erhalten Sie 30 % Lifetime Provision auf jedes aktive Abonnement, das über Ihre Empfehlung zustande kommt.',
            },
          },
          {
            '@type': 'Question',
            name: 'Gibt es höhere Provisionen für besondere Partner?',
            acceptedAnswer: {
              '@type': 'Answer',
              text:
                'Ja, für normale Partnerschaften und strategische Kooperationen bieten wir individuelle Vereinbarungen mit Provisionen von bis zu 35 % an.',
            },
          },
          {
            '@type': 'Question',
            name: 'Wie melde ich mich für das GLENO Partnerprogramm an?',
            acceptedAnswer: {
              '@type': 'Answer',
              text:
                'Sie nutzen den Digistore24-Einladelink, ersetzen AFFILIATE durch Ihre Digistore24-ID und können danach GLENO bewerben. Die Abrechnung erfolgt vollständig über Digistore24.',
            },
          },
        ],
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

/* ---------------------------------- Page ---------------------------------- */
export default function PartnerPage() {
  return (
    <>
      <JsonLd />

      {/* HERO --------------------------------------------------------------- */}
      <section className="relative overflow-hidden text-slate-50">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(160% 160% at top, #020817 0, #020817 26%, #020817 42%, #020817 55%, #020817 100%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-80 mix-blend-screen"
          style={{
            backgroundImage:
              'radial-gradient(circle at -10% -10%, rgba(79,70,229,0.28), transparent), radial-gradient(circle at 110% -20%, rgba(56,189,248,0.22), transparent)',
          }}
        />

        <div className="relative mx-auto flex max-w-5xl flex-col gap-10 px-6 pt-16 pb-20 lg:flex-row lg:items-center lg:justify-between">
          {/* Left */}
          <div className="max-w-2xl pt-4 lg:pt-8">
            <div className="mb-4 inline-flex flex-wrap items-center gap-2 rounded-full bg-slate-950/80 px-3 py-1 text-[10px] font-medium text-slate-200 ring-1 ring-slate-700/80 backdrop-blur">
              <span className="h-5 w-5 rounded-full bg-slate-800 text-[9px] grid place-content-center text-white">
                GL
              </span>
              <span>GLENO Partnerprogramm</span>
              <span className="hidden xs:inline text-slate-500">•</span>
              <span className="hidden xs:inline">
                30&nbsp;% Lifetime Provision auf aktive Abonnements
              </span>
            </div>

            <h1 className="text-[26px] leading-tight font-semibold tracking-tight sm:text-4xl lg:text-[38px] text-white">
              Verdienen Sie mit GLENO –
              <span className="block text-slate-300">
                30&nbsp;% Lifetime Provision auf jedes aktive Abo.
              </span>
            </h1>

            <p className="mt-5 text-[15px] leading-relaxed text-slate-300 sm:text-base max-w-xl">
              Empfehlen Sie GLENO als Plattform für Marktplatz, CRM und Website
              und erhalten Sie wiederkehrende Provisionen, solange das
              Abonnement aktiv bleibt. Die Abrechnung läuft vollständig und
              transparent über Digistore24.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_60px_rgba(0,0,0,0.8)] transition hover:shadow-[0_18px_70px_rgba(0,0,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                style={{ backgroundColor: ACCENT }}
              >
                Mehr über GLENO erfahren
                <span className="ml-1.5 text-xs">↗</span>
              </Link>
              <a
                href="https://www.digistore24.com/product/649531"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-600/80 bg-slate-900/70 px-5 py-3 text-sm font-semibold text-slate-100 backdrop-blur transition hover:bg-slate-900 hover:border-slate-300"
              >
                Produkt bei Digistore24 ansehen
              </a>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/80 px-2.5 py-1 ring-1 ring-slate-700/90">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                30&nbsp;% Lifetime Provision
              </span>
              <span>Automatische Abrechnung über Digistore24</span>
              <span>Partner-Deals bis 35&nbsp;% Provision</span>
            </div>
          </div>

          {/* Right: kleine Info-Card */}
          <div className="w-full max-w-md pt-4 lg:pt-10">
            <div
              className="relative flex flex-col gap-3 rounded-3xl p-5 text-slate-50 shadow-[0_26px_90px_rgba(0,0,0,0.7)] overflow-hidden"
              style={{
                background: 'radial-gradient(circle at top, #111827, #020817)',
                border: '1px solid rgba(148,163,253,0.28)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div
                className="pointer-events-none absolute -top-24 right-[-40px] h-52 w-52 rounded-full opacity-40"
                style={{
                  background:
                    'radial-gradient(circle, rgba(148,163,253,0.6), transparent)',
                }}
              />

              <div className="relative z-10 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Provisionsmodell im Überblick
              </div>

              <div className="relative z-10 rounded-2xl bg-slate-950/90 border border-slate-700/80 p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-200">
                    Standard-Affiliate
                  </span>
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                    30&nbsp;% Lifetime
                  </span>
                </div>
                <p className="mt-2 text-[12px] text-slate-300">
                  30&nbsp;% Provision auf jedes aktive GLENO-Abonnement, solange
                  der Kunde aktiv bleibt.
                </p>
              </div>

              <div className="relative z-10 rounded-2xl bg-slate-950/80 border border-slate-700/70 p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-200">
                    Strategische Partnerschaften
                  </span>
                  <span className="rounded-full bg-sky-500/20 px-3 py-1 text-[11px] font-semibold text-sky-300">
                    bis 35&nbsp;%
                  </span>
                </div>
                <p className="mt-2 text-[12px] text-slate-300">
                  Für Agenturen, Coaches und Reseller sind individuelle
                  Vereinbarungen mit Provisionen bis zu 35&nbsp;% möglich.
                </p>
              </div>

              <p className="relative z-10 mt-1 text-[11px] text-slate-400">
                Alle Zahlungen, Stornos und Auszahlungen werden direkt von
                Digistore24 abgewickelt.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WEISSER BEREICH ----------------------------------------------------- */}
      <div className="bg-white text-slate-900">
        {/* Ablauf Section ---------------------------------------------------- */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-slate-900 ring-1 ring-slate-200">
            <span
              className="px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: PRIMARY }}
            >
              SO FUNKTIONIERT&apos;S
            </span>
            <span>GLENO Partnerprogramm in 3 Schritten</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
            In drei Schritten zum GLENO-Affiliate.
          </h2>

          <p className="mt-3 max-w-3xl text-sm sm:text-[15px] leading-relaxed text-slate-600">
            Die Registrierung und Abrechnung läuft komplett über Digistore24.
            Sie benötigen lediglich eine eigene Digistore24-ID und können
            anschließend direkt starten, GLENO zu bewerben.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-white/80">
              <div className="mb-2 text-xs font-semibold text-slate-500">
                Schritt 1
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Digistore24-Account anlegen
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Falls noch nicht vorhanden, legen Sie einen kostenlosen
                Digistore24-Account an. Ihre Digistore24-ID benötigen Sie für
                den Einladelink.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-white/80">
              <div className="mb-2 text-xs font-semibold text-slate-500">
                Schritt 2
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Einladelink mit Ihrer ID nutzen
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Ersetzen Sie im Einladelink <code>AFFILIATE</code> durch Ihre
                eigene Digistore24-ID. Damit melden Sie sich direkt für das
                GLENO Partnerprogramm an.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-white/80">
              <div className="mb-2 text-xs font-semibold text-slate-500">
                Schritt 3
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                GLENO bewerben & Provisionen verdienen
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Platzieren Sie Ihren Affiliate-Link auf Website, in
                Newslettern, Social Media oder Ads. Für jedes aktive
                Abonnement, das über Ihre Empfehlung entsteht, erhalten Sie
                30&nbsp;% Lifetime Provision.
              </p>
            </div>
          </div>
        </section>

        {/* EINLADELINK SECTION ---------------------------------------------- */}
        <section className="border-t border-slate-100 bg-slate-50/70">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
              Ihr Affiliate-Einladelink bei Digistore24.
            </h2>
            <p className="mt-3 max-w-3xl text-sm sm:text-[15px] leading-relaxed text-slate-600">
              Nutzen Sie den folgenden Einladelink und ersetzen Sie{' '}
              <code>AFFILIATE</code> durch Ihre eigene Digistore24-ID. Danach
              wird Ihre Partnerschaft dem GLENO-Produkt zugeordnet und Sie
              erhalten Ihre Provisionen automatisch.
            </p>

<div className="mt-6">
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm w-full">
    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
      Standard-Einladelink
    </div>
    <p className="mt-2 text-sm text-slate-600">
      Dieser Link ist für die reguläre Anmeldung als GLENO-Affiliate. Ersetzen Sie{' '}
      <code>AFFILIATE</code> durch Ihre Digistore24-ID:
    </p>
    <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-900 px-3 py-2 text-[11px] text-slate-100">
{`https://www.digistore24.com/signup/649531/AFFILIATE`}
    </pre>
  </div>
</div>

            <p className="mt-4 text-[12px] text-slate-500">
              Hinweis: Bitte geben Sie Ihren persönlichen Einladelink niemals
              ohne Ersetzung von <code>AFFILIATE</code> weiter. Nur mit Ihrer
              eigenen Digistore24-ID können Verkäufe korrekt zugeordnet werden.
            </p>
          </div>
        </section>

        {/* PROVISIONEN SECTION --------------------------------------------- */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
            Provisionen im Überblick.
          </h2>
          <p className="mt-3 max-w-3xl text-sm sm:text-[15px] leading-relaxed text-slate-600">
            Unser Modell ist bewusst transparent gehalten: ein klares
            Standard-Affiliate-Modell für alle – und zusätzliche Optionen für
            Partner, die GLENO aktiv in ihre Beratung oder Services
            integrieren.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-white/80">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                Standard-Affiliate
              </div>
              <h3 className="text-xl font-semibold text-slate-900">
                30&nbsp;% Lifetime Provision
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Sie erhalten 30&nbsp;% Provision auf jedes aktive GLENO-Abo, das
                über Ihre Empfehlung zustande kommt – solange das Abonnement
                aktiv ist. Die Auszahlung erfolgt über Digistore24.
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                <li>✔️ Wiederkehrende Einnahmen</li>
                <li>✔️ Vollautomatische Abrechnung & Auszahlungen</li>
                <li>✔️ Ideal für Content-Creator, Newsletter & Blogs</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-white/80">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700">
                Strategische Partnerschaften
              </div>
              <h3 className="text-xl font-semibold text-slate-900">
                Normale Partnerschaften bis zu 35&nbsp;%
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Für normale Partnerschaften und strategische Kooperationen – z.
                B. Agenturen, Coaches oder Software-Reseller – bieten wir
                individuelle Vereinbarungen mit Provisionen von bis zu
                35&nbsp;% an.
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                <li>✔️ Geeignet für intensivere Zusammenarbeit</li>
                <li>✔️ Gemeinsame Aktionen & Co-Branding möglich</li>
                <li>✔️ Individuelle Abstimmung nach Potenzial</li>
              </ul>
              <p className="mt-3 text-sm text-slate-600">
                Schreiben Sie uns bei Interesse einfach an:{' '}
                <a
                  href="mailto:support@gleno.de"
                  className="font-semibold text-slate-900 underline underline-offset-2"
                >
                  support@gleno.de
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* FAQ -------------------------------------------------------------- */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
            Häufige Fragen zum GLENO Partnerprogramm.
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                q: 'Wie viel Provision erhalte ich als Affiliate?',
                a:
                  'Als Standard-Affiliate erhalten Sie 30 % Lifetime Provision auf jedes aktive GLENO-Abonnement, das über Ihre Empfehlung zustande kommt.',
              },
              {
                q: 'Was bedeutet „Lifetime Provision“ konkret?',
                a:
                  'Solange der von Ihnen geworbene Kunde ein aktives GLENO-Abonnement hat und bezahlt, erhalten Sie Ihre 30 % Provision auf diese Zahlungen.',
              },
              {
                q: 'Gibt es höhere Provisionen?',
                a:
                  'Ja. Für normale Partnerschaften und strategische Kooperationen sind individuelle Vereinbarungen mit Provisionen bis zu 35 % möglich.',
              },
              {
                q: 'Wer übernimmt die Abrechnung?',
                a:
                  'Die komplette Zahlungsabwicklung, Stornobearbeitung und Provisionsauszahlung übernimmt Digistore24. Sie sehen alle Informationen in Ihrem Digistore24-Account.',
              },
              {
                q: 'Wo finde ich meinen Affiliate-Link?',
                a:
                  'Nach Anmeldung über den Einladelink in Ihrem Digistore24-Account. Dort sehen Sie Ihre Affiliate-Links und Statistiken zum GLENO-Produkt.',
              },
              {
                q: 'Gibt es Werbematerialien?',
                a:
                  'Ja, wir stellen Affiliate-Partnern auf Anfrage Vorlagen für Texte, E-Mails und Creatives zur Verfügung. Schreiben Sie uns dazu gerne an support@gleno.de.',
              },
            ].map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-slate-100 bg-white p-0 shadow-sm open:shadow-md transition"
              >
                <summary className="cursor-pointer list-none rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-slate-400">?</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900">
                        {f.q}
                      </div>
                      <div className="mt-1 hidden text-sm text-slate-600 group-open:block">
                        {f.a}
                      </div>
                    </div>
                  </div>
                </summary>
                <div className="px-5 pb-5 pt-0 text-sm text-slate-600 sm:hidden">
                  {f.a}
                </div>
              </details>
            ))}
          </div>

          <p className="mt-8 text-sm leading-relaxed text-slate-600">
            Wenn Sie Fragen zum Partnerprogramm haben oder eine strategische
            Kooperation mit höheren Provisionen (bis 35&nbsp;%) besprechen
            möchten, schreiben Sie uns gerne an{' '}
            <a
              href="mailto:support@gleno.de"
              className="font-semibold text-slate-900 underline underline-offset-2"
            >
              support@gleno.de
            </a>
            .
          </p>
        </section>
      </div>
    </>
  )
}

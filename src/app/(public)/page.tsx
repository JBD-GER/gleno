// src/app/(public)/page.tsx
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
    default: 'GLENO – Marktplatz, CRM & Website in einem',
    template: '%s | GLENO',
  },
  description:
    'GLENO vereint Marktplatz, CRM und Website in einer Plattform. KI-optimierte Anfragen, smarte Angebotsprozesse und ein integrierter Onepager – speziell für Agenturen & Dienstleister.',
  keywords: [
    'GLENO',
    'Agentursoftware',
    'CRM Agentur',
    'B2B Marktplatz',
    'Lead Management',
    'Website Builder',
    'KI Angebote',
    'All-in-One Plattform',
  ],
  category: 'software',
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'GLENO – Marktplatz, CRM & Website in einem',
    description:
      'Marktplatz, CRM und Website in einem – GLENO bündelt KI-optimierte Anfragen, smarte Angebots- & Rechnungsprozesse und deinen Onepager in einer Plattform.',
    images: [
      {
        url: `${SITE_URL}/og/og-home.jpg`,
        width: 1200,
        height: 630,
        alt: 'GLENO – Marktplatz, CRM & Website',
      },
    ],
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GLENO – Marktplatz, CRM & Website in einem',
    description:
      'All-in-One Plattform für Agenturen & Dienstleister. Leads, CRM & Webauftritt – verbunden durch KI.',
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
        '@type': 'BreadcrumbList',
        '@id': `${SITE_URL}#breadcrumbs`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Startseite',
            item: SITE_URL,
          },
        ],
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE_URL}#app`,
        name: 'GLENO',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '59.00',
          priceCurrency: 'EUR',
          description: 'Monatliche Nutzung, zzgl. MwSt., jederzeit kündbar.',
          url: `${SITE_URL}/registrieren`,
        },
        description:
          'GLENO vereint Marktplatz, CRM und Website in einer Plattform. KI-optimierte Anfragen, smarte Angebote & Rechnungen und ein integrierter Onepager für Agenturen & Dienstleister.',
        url: SITE_URL,
        image: `${SITE_URL}/og/og-home.jpg`,
        publisher: { '@id': `${SITE_URL}#organization` },
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Für wen ist GLENO gemacht?',
            acceptedAnswer: {
              '@type': 'Answer',
              text:
                'GLENO richtet sich an Agenturen und B2B-Dienstleister, die Leads, CRM-Prozesse und ihren Webauftritt an einem Ort steuern wollen.',
            },
          },
          {
            '@type': 'Question',
            name: 'Was macht GLENO besonders?',
            acceptedAnswer: {
              '@type': 'Answer',
              text:
                'GLENO kombiniert Marktplatz, CRM und Website mit KI-unterstützten Angeboten und optimierten Anfragen zu einem durchgängigen Funnel.',
            },
          },
          {
            '@type': 'Question',
            name: 'Kann ich GLENO testen?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Ja. GLENO kann unverbindlich im Early-Access getestet werden.',
            },
          },
          {
            '@type': 'Question',
            name: 'Ist GLENO DSGVO-konform?',
            acceptedAnswer: {
              '@type': 'Answer',
              text:
                'GLENO wird auf Servern in der EU betrieben. Datensicherheit und DSGVO-Konformität sind integraler Bestandteil.',
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

/* ---------------------- Lead Flow Animation ------------------------------- */
function LeadFlowAnimation() {
  const dots = Array.from({ length: 8 })

  return (
    <div className="mt-10">
      <div className="lf-wrapper">
        {/* Quellen */}
        <div className="lf-node lf-source lf-market">
          <span className="lf-dot-indicator" />
          <span>Marktplatz-Leads</span>
        </div>
        <div className="lf-node lf-source lf-website">
          <span className="lf-dot-indicator" />
          <span>Website-Leads</span>
        </div>
        <div className="lf-node lf-source lf-offline">
          <span className="lf-dot-indicator" />
          <span>Offline-Leads</span>
        </div>

        {/* Zentrum */}
        <div className="lf-node lf-center">
          <div className="lf-center-top">ALLE KANÄLE</div>
          <div className="lf-center-main">Dein Unternehmen</div>
          <div className="lf-center-sub">gebündelt in GLENO</div>
        </div>

        {/* Animierte Punkte */}
        {dots.map((_, i) => (
          <span
            key={`m-${i}`}
            className="lf-float lf-from-market"
            style={{ animationDelay: `${i * 0.35}s` }}
          />
        ))}
        {dots.map((_, i) => (
          <span
            key={`w-${i}`}
            className="lf-float lf-from-website"
            style={{ animationDelay: `${0.18 + i * 0.35}s` }}
          />
        ))}
        {dots.map((_, i) => (
          <span
            key={`o-${i}`}
            className="lf-float lf-from-offline"
            style={{ animationDelay: `${0.28 + i * 0.35}s` }}
          />
        ))}
      </div>

      <style>{`
        .lf-wrapper {
          position: relative;
          margin: 0 auto;
          margin-top: 12px;
          max-width: 820px;
          height: 340px;
          padding: 72px 80px 72px; /* deutlich mehr Abstand nach innen */
          border-radius: 999px;
          background:
            radial-gradient(circle at top, rgba(56,189,248,0.14), transparent),
            radial-gradient(circle at bottom, rgba(15,23,42,0.98), rgba(2,6,23,1));
          box-shadow:
            0 35px 110px rgba(15,23,42,0.70),
            0 0 70px rgba(56,189,248,0.12);
          border: 1px solid rgba(148,163,253,0.26);
          overflow: hidden;
          backdrop-filter: blur(24px);
        }

        .lf-node {
          position: absolute;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 16px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 500;
          white-space: nowrap;
          z-index: 2;
        }

        .lf-source {
          background: rgba(1,6,18,0.98);
          color: rgba(248,250,252,0.98);
          border: 1px solid rgba(148,163,253,0.35);
          backdrop-filter: blur(14px);
        }

        .lf-dot-indicator {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #38bdf8;
          box-shadow: 0 0 14px rgba(56,189,248,0.95);
        }

        .lf-market {
          top: 40px;
          left: 80px;
        }
        .lf-website {
          top: 32px;
          left: 50%;
          transform: translateX(-50%);
        }
        .lf-offline {
          top: 40px;
          right: 80px;
        }

        .lf-center {
          left: 50%;
          bottom: 70px;
          transform: translateX(-50%);
          flex-direction: column;
          align-items: flex-start;
          padding: 14px 18px 11px;
          border-radius: 20px;
          background:
            radial-gradient(circle at top, rgba(56,189,248,0.22), transparent),
            rgba(2,6,23,0.98);
          color: #e5e7eb;
          border: 1px solid rgba(148,163,253,0.42);
          box-shadow:
            0 22px 52px rgba(15,23,42,0.95),
            0 0 26px rgba(56,189,248,0.25);
        }

        .lf-center-top {
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          color: rgba(148,163,253,0.95);
        }
        .lf-center-main {
          font-size: 13px;
          font-weight: 600;
          color: #f9fafb;
        }
        .lf-center-sub {
          font-size: 8px;
          color: rgba(156,163,175,1);
        }

        .lf-float {
          position: absolute;
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: #38bdf8;
          box-shadow: 0 0 12px rgba(56,189,248,0.9);
          opacity: 0;
        }

        /* Markt -> Mitte (mit mehr Abstand berechnet) */
        .lf-from-market {
          top: 110px;
          left: 104px;
          animation: lf-move-market 3.2s infinite ease-in-out;
        }
        @keyframes lf-move-market {
          0%   { opacity: 0; transform: translate(0,0); }
          12%  { opacity: 1; }
          68%  { opacity: 1; transform: translate(260px,120px); }
          100% { opacity: 0; transform: translate(260px,120px); }
        }

        /* Website -> Mitte */
        .lf-from-website {
          top: 100px;
          left: 50%;
          transform: translateX(-50%);
          animation: lf-move-website 3.0s infinite ease-in-out;
        }
        @keyframes lf-move-website {
          0%   { opacity: 0; transform: translate(-50%,0); }
          14%  { opacity: 1; }
          70%  { opacity: 1; transform: translate(-50%,110px); }
          100% { opacity: 0; transform: translate(-50%,110px); }
        }

        /* Offline -> Mitte */
        .lf-from-offline {
          top: 110px;
          right: 104px;
          animation: lf-move-offline 3.4s infinite ease-in-out;
        }
        @keyframes lf-move-offline {
          0%   { opacity: 0; transform: translate(0,0); }
          12%  { opacity: 1; }
          68%  { opacity: 1; transform: translate(-260px,120px); }
          100% { opacity: 0; transform: translate(-260px,120px); }
        }

        @media (max-width: 768px) {
          .lf-wrapper {
            max-width: 100%;
            height: 280px;
            padding: 56px 24px 52px;
            border-radius: 36px;
          }
          .lf-market {
            top: 34px;
            left: 22px;
          }
          .lf-website {
            top: 26px;
          }
          .lf-offline {
            top: 34px;
            right: 22px;
          }
          .lf-center {
            bottom: 52px;
          }

          @keyframes lf-move-market {
            0%   { opacity: 0; transform: translate(0,0); }
            12%  { opacity: 1; }
            68%  { opacity: 1; transform: translate(140px,92px); }
            100% { opacity: 0; transform: translate(140px,92px); }
          }
          @keyframes lf-move-website {
            0%   { opacity: 0; transform: translate(-50%,0); }
            14%  { opacity: 1; }
            70%  { opacity: 1; transform: translate(-50%,82px); }
            100% { opacity: 0; transform: translate(-50%,82px); }
          }
          @keyframes lf-move-offline {
            0%   { opacity: 0; transform: translate(0,0); }
            12%  { opacity: 1; }
            68%  { opacity: 1; transform: translate(-140px,92px); }
            100% { opacity: 0; transform: translate(-140px,92px); }
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .lf-float {
            animation: none !important;
            opacity: 0.35;
          }
        }
      `}</style>
    </div>
  )
}

/* ---------------------- Mini Dashboard Preview ---------------------------- */
function MiniDashboard() {
  const cardBg = 'rgba(10,16,30,0.98)'

  return (
    <div
      className="relative flex flex-col gap-3 rounded-3xl p-4 text-slate-50 shadow-[0_26px_90px_rgba(0,0,0,0.7)] overflow-hidden"
      aria-label="GLENO Dashboard Vorschau"
      style={{
        background: 'radial-gradient(circle at top, #111827, #020817)',
        border: '1px solid rgba(148,163,253,0.18)',
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

      <div className="relative z-10 mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-2xl bg-slate-900/95 ring-1 ring-slate-500 grid place-content-center text-[9px] font-semibold">
            GL
          </div>
          <div className="h-2 w-16 rounded-full bg-slate-700/90" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-1.5 w-5 rounded-full bg-slate-700/80" />
          <div className="h-1.5 w-8 rounded-full bg-slate-700/60" />
          <div className="h-5 w-5 rounded-full bg-slate-900/95 border border-slate-600/80" />
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-3 gap-2 text-[8px]">
        <div
          className="flex flex-col gap-1 rounded-2xl p-2"
          style={{ background: cardBg, border: '1px solid rgba(15,23,42,1)' }}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[8px] uppercase tracking-wide text-slate-400">
              Marktplatz
            </span>
            <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[7px] text-slate-100">
              12 Anfragen
            </span>
          </div>
          {['Web Relaunch', 'SEO Retainer', 'Branding'].map((l, i) => (
            <div
              key={l}
              className="flex items-center justify-between gap-1 rounded-xl bg-slate-950/90 px-2 py-1"
            >
              <span className="truncate text-slate-200">{l}</span>
              <span className="text-[7px] text-emerald-300">
                {i === 0 ? 'Hot' : i === 1 ? 'Fit' : 'Neu'}
              </span>
            </div>
          ))}
        </div>

        <div
          className="flex flex-col gap-1 rounded-2xl p-2"
          style={{ background: cardBg, border: '1px solid rgba(15,23,42,1)' }}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[8px] uppercase tracking-wide text-slate-400">
              CRM Pipeline
            </span>
            <span className="text-[7px] text-slate-200">78k € offen</span>
          </div>
          {[
            ['Neu', 40],
            ['In Verhandlung', 70],
            ['Gewonnen', 100],
          ].map(([label, pct]) => (
            <div key={label as string} className="space-y-0.5">
              <div className="flex justify-between text-[7px] text-slate-400">
                <span>{label}</span>
                <span>{pct}%</span>
              </div>
              <div className="h-1 w-full rounded-full bg-slate-900">
                <div
                  className="h-1 rounded-full"
                  style={{
                    width: `${pct}%`,
                    background:
                      'linear-gradient(to right, rgba(148,163,253,0.25), #e5e7eb)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div
          className="flex flex-col gap-1 rounded-2xl p-2"
          style={{ background: cardBg, border: '1px solid rgba(15,23,42,1)' }}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[8px] uppercase tracking-wide text-slate-400">
              Website Leads
            </span>
            <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[7px] text-slate-100">
              Onepager
            </span>
          </div>
          <div className="flex items-center justify-between text-[7px] text-slate-300">
            <span>Formular-Eingänge</span>
            <span>+19%</span>
          </div>
          <div className="h-1 w-full rounded-full bg-slate-900 overflow-hidden">
            <div
              className="h-1 rounded-full"
              style={{
                width: '65%',
                background:
                  'linear-gradient(to right, rgba(148,163,253,0.35), #f9fafb)',
              }}
            />
          </div>
          <div className="mt-1 grid grid-cols-6 gap-[2px]">
            {[3, 5, 4, 7, 6, 8].map((h, i) => (
              <div
                key={i}
                className="rounded-full bg-slate-200/95"
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
          <p className="mt-1 text-[7px] text-slate-400">
            Website-Formulare landen direkt im GLENO-CRM.
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-2 flex items-center justify-between gap-2 rounded-2xl bg-slate-950/95 px-2 py-1.5 border border-slate-700/70 text-[7px]">
        <span className="text-slate-300">
          Markt · Website · Offline → ein Funnel
        </span>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[7px] text-slate-100">
          in GLENO
        </span>
      </div>
    </div>
  )
}

/* ---------------------------------- Page ---------------------------------- */
export default function HomePage() {
  return (
    <>
      <JsonLd />

      {/* HERO */}
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
              'radial-gradient(circle at -10% -10%, rgba(79,70,229,0.22), transparent), radial-gradient(circle at 110% -20%, rgba(56,189,248,0.16), transparent)',
          }}
        />

        <div className="relative mx-auto flex max-w-7xl flex-col gap-10 lg:gap-14 px-6 pt-14 pb-22 lg:flex-row lg:items-center">
          {/* Left */}
          <div className="max-w-3xl pt-8 lg:pt-14">
            <div className="mb-4 inline-flex flex-wrap items-center gap-2 rounded-full bg-slate-950/80 px-3 py-1 text-[10px] font-medium text-slate-200 ring-1 ring-slate-700/80 backdrop-blur">
              <span className="h-5 w-5 rounded-full bg-slate-800 text-[9px] grid place-content-center text-white">
                GL
              </span>
              <span>GLENO</span>
              <span className="hidden xs:inline text-slate-500">•</span>
              <span className="hidden xs:inline">
                Marktplatz, CRM & Website in einer Plattform
              </span>
              <span className="hidden sm:inline text-slate-500">•</span>
              <span className="hidden sm:inline">Fokus: Agenturen & Services</span>
            </div>

            {/* kleiner, damit in 2 Zeilen bleibt */}
            <h1 className="text-[26px] leading-tight font-semibold tracking-tight sm:text-4xl lg:text-[40px] text-white">
              Marktplatz, CRM und Website –
              <span className="block text-slate-300">
                Kunden gewinnen, Deals steuern, online sichtbar.
              </span>
            </h1>

            <p className="mt-5 text-[15px] leading-relaxed text-slate-300 sm:text-base max-w-2xl">
              GLENO bündelt KI-optimierte Anfragen über den Marktplatz, ein CRM
              von Angebot bis Rechnung und einen Onepager, der Leads direkt in
              dein System holt – ohne Tool-Chaos.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/registrieren"
                className="inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_60px_rgba(0,0,0,0.8)] transition hover:shadow-[0_18px_70px_rgba(0,0,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                style={{ backgroundColor: ACCENT }}
              >
                Zugang sichern
                <span className="ml-1.5 text-xs">↗</span>
              </Link>
              <Link
                href="/funktionen"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-600/80 bg-slate-900/70 px-5 py-3 text-sm font-semibold text-slate-100 backdrop-blur transition hover:bg-slate-900 hover:border-slate-300"
              >
                Funktionen ansehen
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/80 px-2.5 py-1 ring-1 ring-slate-700/90">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                DSGVO-konform & EU-Hosting
              </span>
              <span>Keine Setup-Gebühr</span>
              <span>Monatlich kündbar</span>
              <span>KI-first statt Excel-lastig</span>
            </div>
          </div>

          {/* Right */}
          <div className="w-full max-w-md lg:max-w-lg pt-4 lg:pt-14">
            <MiniDashboard />
          </div>
        </div>
      </section>

      {/* WEISSER BEREICH ----------------------------------------------------- */}
      <div className="text-slate-900">
        {/* Lead Flow Section */}
        <section className="relative border-t border-slate-800/10">
          <div className="relative mx-auto flex max-w-7xl flex-col gap-10 px-6 py-16 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-900 text-[9px] font-semibold text-slate-100 px-2 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Alle Leads in einem System
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                Drei Kanäle. Ein Funnel. Keine verlorenen Anfragen.
              </h2>
              <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-slate-600">
                Mit GLENO landen Leads aus dem Marktplatz, von deiner
                GLENO-Website und aus Offline-Kanälen direkt in einem
                durchgängigen CRM-Flow: qualifizieren, mit KI-Angeboten
                antworten, Projekte starten, Zeiten erfassen, Rechnungen
                schreiben.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>
                  <span className="font-semibold">Marktplatz-Leads:</span>{' '}
                  KI-optimierte Anfragen mit Chat, Dateien & Vergleichbarkeit.
                </li>
                <li>
                  <span className="font-semibold">Website-Leads:</span>{' '}
                  Onepager-Formulare senden direkt ins GLENO-CRM.
                </li>
                <li>
                  <span className="font-semibold">Offline-Leads:</span>{' '}
                  Telefon, Messen, Empfehlungen – sauber erfasst & nachverfolgbar.
                </li>
              </ul>
              <p className="mt-2 text-[11px] text-slate-500">
                Alles läuft zentral auf dein Unternehmen: inklusive Angebote,
                Projekte, Zeiterfassung, Logistik & Abrechnung.
              </p>
            </div>

            <div className="flex-1">
              <LeadFlowAnimation />
            </div>
          </div>
        </section>

        {/* EIN FLOW + MODULE */}
        <section className="relative mx-auto max-w-6xl px-6 py-16">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-slate-900 ring-1 ring-slate-200">
            <span
              className="px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: PRIMARY }}
            >
              EIN FLOW
            </span>
            <span>Marktplatz</span>
            <span className="text-slate-400">→</span>
            <span>CRM</span>
            <span className="text-slate-400">→</span>
            <span>Website</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
            Vom Lead bis zur Rechnung – ohne Brüche, ohne Copy &amp; Paste.
          </h2>

          <p className="mt-4 max-w-4xl text-sm sm:text-[15px] leading-relaxed text-slate-600">
            GLENO verbindet Marktplatz, CRM und Website: Anfragen landen
            automatisch im System, werden mit Vorlagen &amp; KI zu Angeboten,
            in Aufträge, Projekte &amp; Rechnungen überführt. Dein Onepager ist
            Teil desselben Funnels.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                badge: 'KI-optimierte Leads',
                title: 'Marktplatz',
                text:
                  'Strukturierte Anfragen, KI-Optimierung, Chat, Dokumente, Angebote, Aufträge & Rechnungen – plus öffentliches Profil und Bewertungen.',
              },
              {
                badge: 'Angebote & Projekte',
                title: 'CRM & Operations',
                text:
                  'Angebots-, Auftrags- & Rechnungsflow, Projektführung, Doku, Zeiterfassung, Mitarbeiterzugänge, Logistik für Fuhrpark & Material.',
              },
              {
                badge: 'Onepager inklusive',
                title: 'Website mit CRM-Anschluss',
                text:
                  'Moderner Onepager mit deinem Branding. Formulare schreiben direkt ins GLENO-CRM. KI unterstützt bei Rechtstexten.',
              },
            ].map((m) => (
              <div
                key={m.title}
                className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-white/80 backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className="mb-2 inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-[9px] font-semibold text-slate-50"
                  style={{ backgroundColor: PRIMARY }}
                >
                  {m.badge}
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {m.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{m.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURE GRID */}
        <section className="mx-auto max-w-7xl grid grid-cols-1 gap-6 px-6 pb-16 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: '🤖',
              title: 'KI-Angebote',
              desc: 'Angebotsentwürfe aus Anfragen & Vorlagen direkt in GLENO.',
            },
            {
              icon: '📚',
              title: 'Template-Bibliothek',
              desc: 'Wiederkehrende Leistungen & Pakete sauber organisiert.',
            },
            {
              icon: '🧾',
              title: 'Angebot bis Rechnung',
              desc: 'Ein Flow von Angebot über Auftrag bis Rechnung.',
            },
            {
              icon: '📅',
              title: 'Kalender & Zeiterfassung',
              desc: 'Termine, Einsätze & Zeiten deines Teams im Überblick.',
            },
            {
              icon: '🚐',
              title: 'Logistik',
              desc: 'Fuhrpark, Werkzeuge & Material mit Fälligkeiten.',
            },
            {
              icon: '📂',
              title: 'Projekt-Dokumentation',
              desc: 'Dokumente & Notizen direkt am Projekt.',
            },
            {
              icon: '💬',
              title: 'Marktplatz-Chat',
              desc: 'Chat & Dateien direkt mit Deals verknüpft.',
            },
            {
              icon: '⭐',
              title: 'Partnerprofil',
              desc: 'Öffentliches Profil & Bewertungen im Marktplatz.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-white/80 backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="text-2xl">{f.icon}</div>
              <h3 className="mt-3 text-base font-semibold text-slate-900">
                {f.title}
              </h3>
              <p className="mt-1 text-sm text-slate-600">{f.desc}</p>
            </div>
          ))}
        </section>

        {/* PRICING */}
        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm ring-1 ring-white/80 backdrop-blur-sm">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  Starten Sie kostenlos mit GLENO.
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Ein Preis für Marktplatz-Anbindung, CRM und Website-Modul.
                  Early-Access mit Support & Einfluss auf die Roadmap.
                </p>
              </div>
              <div className="flex flex-col w-full gap-2 sm:w-auto sm:flex-row sm:justify-end">
                <Link
                  href="/registrieren"
                  className="inline-flex w-full items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 sm:w-auto"
                  style={{ backgroundColor: ACCENT }}
                >
                  Jetzt Zugang sichern
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* STORY */}
        <section className="mx-auto max-w-6xl px-6 pb-16">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            GLENO ist gebaut für Teams, die weniger Tool-Noise und mehr Klarheit wollen.
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-6 md:grid-cols-2 text-sm leading-relaxed text-slate-600">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <p>
                Statt CRM, Tabellen, DMS, Marktplatz-Profilen und
                Website-Formularen getrennt zu pflegen, führt GLENO alles
                zusammen. Anfragen aus Marktplatz und Onepager landen in einem
                Prozess: qualifizieren, mit KI-Angeboten antworten, Projekte
                starten, Zeiten erfassen, Rechnungen stellen.
              </p>
              <p className="mt-3">
                Du siehst jederzeit, welcher Lead wo steht, welche Unterlagen
                fehlen, wer verantwortlich ist und welcher Umsatz gesichert ist.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <ul className="space-y-2">
                <li>✔️ KI dort, wo sie hilft: Anfragen & Angebote.</li>
                <li>✔️ Durchgängige Daten statt Insel-Lösungen.</li>
                <li>✔️ Fokus auf Agenturen & B2B-Services.</li>
                <li>✔️ Schnell eingeführt, intuitiv im Alltag.</li>
                <li>✔️ Roadmap gemeinsam mit Early-Partnern.</li>
              </ul>
              <p className="mt-3">
                GLENO ist dein Fundament, um Leadgen, Sales und Delivery
                in einer klaren Umgebung zu verbinden – ohne Konzernsoftware-Overkill.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Häufige Fragen zu GLENO
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                q: 'Für wen ist GLENO gedacht?',
                a: 'Für Agenturen, Studios und Dienstleister, die Anfragen, Angebote, Projekte und Rechnungen in einem System führen wollen – inklusive Marktplatz und Website.',
              },
              {
                q: 'Wie funktionieren die KI-Funktionen?',
                a: 'GLENO strukturiert Anfragen, schlägt passende Partner vor und generiert Angebotsentwürfe aus Templates & Kontext. Du gibst immer final frei.',
              },
              {
                q: 'Was bietet das CRM konkret?',
                a: 'Angebote, Auftragsbestätigungen, Projekte, Zeiterfassung, Kalender, Mitarbeiterzugänge, Logistik (Fuhrpark, Werkzeuge, Material), Dokumentation und Vorlagen-Bibliothek.',
              },
              {
                q: 'Wie ist der Marktplatz integriert?',
                a: 'Anfragen werden mit KI angereichert. Du bewirbst dich, chattest, teilst Dokumente und wandelst Deals direkt in GLENO-Aufträge und Rechnungen.',
              },
              {
                q: 'Welche Website-Funktionen gibt es?',
                a: 'Ein Onepager mit deinem Branding. Formulare schreiben direkt ins CRM. KI unterstützt bei Impressum & Datenschutztexten.',
              },
              {
                q: 'Ist GLENO DSGVO-konform?',
                a: 'Ja. Hosting in der EU, Verschlüsselung und B2B-taugliche Datenschutzprozesse.',
              },
              {
                q: 'Kann ich bestehende Daten mitnehmen?',
                a: 'Ja. Kunden, Leistungen und Vorlagen können importiert werden. Wir unterstützen beim Start.',
              },
              {
                q: 'Wie flexibel ist die Laufzeit?',
                a: 'Monatlich kündbar, keine langfristigen Bindungen.',
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
            GLENO ist für Teams gebaut, die keine Lust auf verstreute Tools
            haben. Wenn Marktplatz-Leads, CRM und Website bei dir noch getrennt
            laufen, ist das dein Signal, alles in einer klaren Plattform zu
            bündeln.
          </p>
        </section>
      </div>
    </>
  )
}

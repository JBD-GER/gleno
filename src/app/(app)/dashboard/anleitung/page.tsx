// src/app/(app)/dashboard/anleitung/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Anleitung & erste Schritte | GLENO',
  description:
    'Schritt-für-Schritt-Anleitung für den perfekten Start mit GLENO: Mitarbeiter anlegen, einladen, Kunden & Projekte erstellen und Funktionen wie Zeiterfassung nutzen.',
}

const steps = [
  {
    number: 1,
    title: 'Mitarbeiter anlegen',
    description:
      'Legen Sie alle Personen an, die später mit GLENO arbeiten sollen (z. B. Monteure, Bürokräfte, Projektleiter).',
    details: [
      'Öffnen Sie im linken Menü den Bereich „Verwaltung -> Mitarbeiter“.',
      'Klicken Sie auf „Mitarbeiter hinzufügen“.',
      'Tragen Sie Name, E-Mail-Adresse und – falls vorhanden – Rolle/Funktion ein.',
      'Speichern Sie den Mitarbeiter.',
    ],
  },
  {
    number: 2,
    title: 'Mitarbeiter einladen',
    description:
      'Damit Ihre Mitarbeiter GLENO nutzen können, müssen diese eine Einladung per E-Mail erhalten.',
    details: [
      'Öffnen Sie wieder den Bereich „Verwaltung -> Mitarbeiter“.',
      'Wählen Sie den gewünschten Mitarbeiter aus der Liste.',
      'Klicken Sie auf „Mitarbeiter einladen“.',
      'Der Mitarbeiter erhält eine E-Mail, und legt sein Passwort fest.',
    ],
  },
  {
    number: 3,
    title: 'Kunden anlegen',
    description:
      'Legen Sie Ihre Kunden an, damit Sie Projekte, Angebote, Rechnungen oder Zeiterfassung später sauber zuordnen können.',
    details: [
      'Öffnen Sie im Menü den Bereich „Kunden“.',
      'Klicken Sie auf „Kunde hinzufügen“.',
      'Tragen Sie die Stammdaten ein (z. B. Name/Firma, Adresse, Kontaktinformationen).',
      'Speichern Sie den Kunden.',
    ],
  },
  {
    number: 4,
    title: 'Projekt anlegen (optional)',
    description:
      'Projekte sind ideal, wenn Sie Zeiten, Dokumente und Abläufe projektbezogen bündeln möchten (z. B. Baustellen, Aufträge, größere Kundenprojekte).',
    details: [
      'Öffnen Sie im Menü den Bereich „Projekte“.',
      'Klicken Sie auf „Neues Projekt“.',
      'Wählen Sie einen Kunden aus und vergeben Sie einen Projektnamen (z. B. „Sanierung Musterstraße 12“).',
      'Optional: Definieren Sie Start-/Enddatum, geplante Stunden und weisen Sie bereits Mitarbeiter zu.',
    ],
    optional: true,
  },
]

const features = [
  {
    key: 'zeiterfassung',
    title: 'Zeiterfassung',
    description:
      'Erfahren Sie, wie Ihre Mitarbeiter Zeiten erfassen, wie Sie Einträge auswerten, exportieren und projektbasiert auswerten.',
    href: '/dashboard/anleitung/zeiterfassung',
    status: 'verfügbar' as const,
  },
  {
    key: 'projekte',
    title: 'Projekte (bald)',
    description:
      'Anlegen, strukturieren und auswerten von Projekten – von Basisdaten bis zu Dokumenten und Auswertungen.',
    href: '#',
    status: 'coming' as const,
  },
  {
    key: 'kunden',
    title: 'Kunden & CRM (bald)',
    description:
      'Kundenverwaltung, Historie, Angebote und Rechnungen an einem Ort gebündelt.',
    href: '#',
    status: 'coming' as const,
  },
  {
    key: 'buchhaltung',
    title: 'Angebote & Rechnungen (bald)',
    description:
      'Vom Angebot bis zur Rechnung – inklusive Statusübersicht und Exportmöglichkeiten.',
    href: '#',
    status: 'coming' as const,
  },
]

export default function AnleitungPage() {
  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Header kompakter als Glass-Card */}
      <header className="mb-6 rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm backdrop-blur-xl sm:mb-8 sm:flex sm:items-center sm:justify-between sm:px-6">
        <div className="max-w-2xl">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Anleitung & erste Schritte
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-[15px]">
            Hier finden Sie eine einfache Schritt-für-Schritt-Anleitung, wie Sie GLENO
            starten – von Mitarbeitern & Kunden bis hin zur Zeiterfassung. Nutzen Sie
            zuerst die{' '}
            <span className="font-medium text-slate-900">
              essentiellen Schritte für den Start
            </span>{' '}
            und springen Sie danach direkt in die Anleitungen je Funktion.
          </p>
        </div>

        <div className="mt-3 flex items-center gap-3 sm:mt-0">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
            Schnellstart · 5–10 Minuten
          </span>
        </div>
      </header>

      {/* Essentielle Schritte – kompakter & in 2 Spalten */}
      <section
        aria-labelledby="essentielle-schritte-heading"
        className="mb-8 space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-xl sm:p-5 lg:p-6"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              id="essentielle-schritte-heading"
              className="text-base font-semibold text-slate-900 sm:text-lg"
            >
              Essentielle Schritte für den Start
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Führen Sie diese Schritte einmalig durch, damit Ihre Mitarbeiter sich
              anmelden können und Ihre Kunden & Projekte direkt sauber angelegt sind.
            </p>
          </div>
        </div>

        <ol className="mt-4 grid gap-4 sm:grid-cols-2">
          {steps.map((step) => (
            <li
              key={step.number}
              className="relative flex flex-col rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm"
            >
              {/* Nummer-Badge oben links */}
              <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white shadow-sm">
                {step.number}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 sm:text-[15px]">
                    {step.title}
                    {step.optional && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Optional
                      </span>
                    )}
                  </h3>
                </div>
                {step.description && (
                  <p className="mt-1 text-sm text-slate-600">{step.description}</p>
                )}

                {step.details && (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-600">
                    {step.details.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-3 rounded-xl bg-slate-50/80 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-100">
          <p className="font-medium text-slate-900">Tipp für den Start:</p>
          <p className="mt-1">
            Sobald Sie mindestens einen Mitarbeiter eingeladen haben, können Sie direkt
            mit der{' '}
            <Link
              href="/dashboard/anleitung/zeiterfassung"
              className="font-medium text-slate-900 underline underline-offset-4"
            >
              Zeiterfassung
            </Link>{' '}
            starten. Projekte können Sie jederzeit nachträglich anlegen und zuordnen.
          </p>
        </div>
      </section>

      {/* Funktionen im Detail */}
      <section
        aria-labelledby="funktionen-heading"
        className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-xl sm:p-5 lg:p-6"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              id="funktionen-heading"
              className="text-base font-semibold text-slate-900 sm:text-lg"
            >
              Anleitungen je Funktion
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Wählen Sie eine Funktion, um eine detaillierte Schritt-für-Schritt-Anleitung
              zu erhalten. Starten Sie idealerweise mit der Zeiterfassung.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) =>
            feature.status === 'verfügbar' ? (
              <Link
                key={feature.key}
                href={feature.href}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white/80 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10"
              >
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 sm:text-[15px]">
                    {feature.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                    {feature.description}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-white">
                    Verfügbar
                  </span>
                  <span className="inline-flex items-center text-xs font-medium text-slate-600 group-hover:text-slate-900">
                    Anleitung öffnen
                    <span aria-hidden="true" className="ml-1">
                      ↗
                    </span>
                  </span>
                </div>
              </Link>
            ) : (
              <div
                key={feature.key}
                className="flex flex-col justify-between rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-left text-slate-400 shadow-sm"
              >
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 sm:text-[15px]">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm">
                    {feature.description ||
                      'Dieser Bereich wird demnächst mit einer Anleitung ergänzt.'}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Bald verfügbar
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">
                    In Vorbereitung
                  </span>
                </div>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  )
}

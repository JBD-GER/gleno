// src/app/(app)/dashboard/anleitung/zeiterfassung/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Anleitung Zeiterfassung | GLENO',
  description:
    'Schritt-für-Schritt-Anleitung für die Zeiterfassung in GLENO: Zeiten starten, stoppen, ansehen, exportieren und projektbasiert auswerten.',
}

const anchorLinks = [
  { id: 'voraussetzungen', label: 'Voraussetzungen' },
  { id: 'starten', label: 'Zeiterfassung starten' },
  { id: 'ansehen', label: 'Zeiterfassung ansehen' },
  { id: 'projektbasiert', label: 'Projektbasierte Zeiterfassung' },
]

export default function ZeiterfassungAnleitungPage() {
  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-xs text-slate-500 sm:mb-6">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link
              href="/dashboard/anleitung"
              className="font-medium text-slate-500 hover:text-slate-900"
            >
              Anleitung
            </Link>
          </li>
          <li className="text-slate-400">/</li>
          <li className="font-medium text-slate-900">Zeiterfassung</li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mb-6 space-y-3 sm:mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Zeiterfassung in GLENO
        </h1>
        <p className="max-w-2xl text-sm text-slate-600 sm:text-base">
          In dieser Anleitung erfahren Sie, wie Sie die Zeiterfassung mit Ihren
          Mitarbeitern nutzen – vom Einladen der Mitarbeiter bis hin zur Auswertung und
          zum Export der erfassten Zeiten. Die Schritte sind bewusst kurz und klar
          gehalten, damit Sie sofort starten können.
        </p>

        {/* Quick-Nav */}
        <div className="mt-3 flex flex-wrap gap-2">
          {anchorLinks.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-sm hover:border-slate-300 hover:text-slate-900"
            >
              {link.label}
            </a>
          ))}
        </div>
      </header>

      <div className="space-y-8">
        {/* Voraussetzungen */}
        <section
          id="voraussetzungen"
          className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-xl sm:p-6 lg:p-7"
        >
          <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
            Voraussetzungen für die Zeiterfassung
          </h2>
          <p className="text-sm text-slate-600 sm:text-base">
            Bevor Ihre Mitarbeiter Zeiten erfassen können, sollten die folgenden Schritte
            erledigt sein:
          </p>

          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
            <li>
              <span className="font-medium text-slate-900">Mitarbeiter anlegen</span> – im
              Bereich „Mitarbeiter“.
            </li>
            <li>
              <span className="font-medium text-slate-900">Mitarbeiter einladen</span> –
              damit diese Zugang zu GLENO erhalten.
            </li>
            <li>
              <span className="font-medium text-slate-900">Optional: Projekt anlegen</span>
              – wenn Sie mit projektbasierter Zeiterfassung arbeiten möchten.
            </li>
          </ul>

          <div className="mt-3 rounded-xl bg-slate-50/80 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-100">
            <p className="font-medium text-slate-900">Tipp:</p>
            <p className="mt-1">
              Wenn Sie gerade erst starten, reicht es, zunächst einen Mitarbeiter
              einzuladen und ein bis zwei Testkunden anzulegen. Sie können die Struktur
              später jederzeit erweitern.
            </p>
          </div>
        </section>

        {/* Zeiterfassung starten */}
        <section
          id="starten"
          className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-xl sm:p-6 lg:p-7"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
              Zeiterfassung starten (für Mitarbeiter)
            </h2>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
              Aktivierung durch Mitarbeiter
            </span>
          </div>

          <p className="text-sm text-slate-600 sm:text-base">
            So läuft der typische Ablauf, bis ein Mitarbeiter seine erste Zeit erfasst:
          </p>

          <ol className="mt-2 space-y-3 text-sm text-slate-700 sm:text-base">
            <li className="rounded-xl bg-slate-50/80 px-4 py-3 ring-1 ring-slate-100">
              <p className="font-medium text-slate-900">1. Mitarbeiter einladen</p>
              <p className="mt-1 text-sm text-slate-600">
                Sie legen den Mitarbeiter im Bereich „Mitarbeiter“ an und senden ihm eine
                Einladung. Der Mitarbeiter erhält eine E-Mail, um seinen Zugang zu
                erstellen.
              </p>
            </li>
            <li className="rounded-xl bg-slate-50/80 px-4 py-3 ring-1 ring-slate-100">
              <p className="font-medium text-slate-900">2. Einladung annehmen</p>
              <p className="mt-1 text-sm text-slate-600">
                Der Mitarbeiter klickt auf den Link in der E-Mail, vergibt ein Passwort
                und meldet sich in GLENO an. Ab diesem Zeitpunkt kann er auf das
                Zeiterfassungs-Modul zugreifen.
              </p>
            </li>
            <li className="rounded-xl bg-slate-50/80 px-4 py-3 ring-1 ring-slate-100">
              <p className="font-medium text-slate-900">
                3. Zeit erfassen im Menüpunkt „Zeiterfassung“
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Im Dashboard des Mitarbeiters befindet sich der Eintrag{' '}
                <span className="font-medium text-slate-900">„Zeiterfassung“</span>. Dort
                kann er:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                <li>einen neuen Zeiteintrag starten (z. B. mit Start-Button),</li>
                <li>optional eine Tätigkeit / Notiz hinterlegen,</li>
                <li>und den Eintrag mit einem Stopp-Button wieder beenden.</li>
              </ul>
            </li>
          </ol>

          <div className="mt-3 rounded-xl bg-slate-50/80 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-100">
            <p className="font-medium text-slate-900">Praxis-Tipp:</p>
            <p className="mt-1">
              Empfehlen Sie Ihren Mitarbeitern, immer direkt bei Arbeitsbeginn zu starten
              und beim Wechsel des Projekts oder am Feierabend zu stoppen. So bleiben die
              Zeiten sauber und nachvollziehbar.
            </p>
          </div>
        </section>

        {/* Zeiterfassung ansehen */}
        <section
          id="ansehen"
          className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-xl sm:p-6 lg:p-7"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
              Zeiterfassung ansehen & bearbeiten
            </h2>
            <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-600 ring-1 ring-slate-200/80">
              Verwaltung durch Admin / Büro
            </span>
          </div>

          <p className="text-sm text-slate-600 sm:text-base">
            In der Verwaltung sehen Sie alle Zeiteinträge pro Mitarbeiter und können diese
            exportieren oder – je nach Berechtigung – bearbeiten.
          </p>

          <ol className="mt-2 space-y-3 text-sm text-slate-700 sm:text-base">
            <li className="rounded-xl bg-slate-50/80 px-4 py-3 ring-1 ring-slate-100">
              <p className="font-medium text-slate-900">1. Mitarbeiter aufrufen</p>
              <p className="mt-1 text-sm text-slate-600">
                Öffnen Sie im Menü den Bereich{' '}
                <span className="font-medium text-slate-900">„Mitarbeiter“</span> und
                wählen Sie den gewünschten Mitarbeiter aus der Liste aus.
              </p>
            </li>
            <li className="rounded-xl bg-slate-50/80 px-4 py-3 ring-1 ring-slate-100">
              <p className="font-medium text-slate-900">2. Button „Zeiteinträge“</p>
              <p className="mt-1 text-sm text-slate-600">
                In der Detailansicht des Mitarbeiters finden Sie den Button{' '}
                <span className="font-medium text-slate-900">„Zeiteinträge“</span>. Ein
                Klick darauf öffnet eine Übersicht aller erfassten Zeiten dieses
                Mitarbeiters.
              </p>
            </li>
            <li className="rounded-xl bg-slate-50/80 px-4 py-3 ring-1 ring-slate-100">
              <p className="font-medium text-slate-900">
                3. Export oder manuelle Bearbeitung
              </p>
              <p className="mt-1 text-sm text-slate-600">
                In der Übersicht können – je nach Ihrem Setup – folgende Aktionen
                möglich sein:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                <li>
                  <span className="font-medium text-slate-900">Export</span> der
                  Zeiteinträge, z. B. als CSV/Excel zur Weiterverarbeitung (Lohn, Auswertung,
                  Rechnungsgrundlage).
                </li>
                <li>
                  <span className="font-medium text-slate-900">
                    Manuelle Bearbeitung
                  </span>{' '}
                  einzelner Einträge (z. B. Korrektur von Start-/Endzeiten oder Notizen),
                  sofern dies in Ihrer Rolle erlaubt ist.
                </li>
              </ul>
            </li>
          </ol>
        </section>

        {/* Projektbasierte Zeiterfassung */}
        <section
          id="projektbasiert"
          className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-xl sm:p-6 lg:p-7"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
              Projektbasierte Zeiterfassung
            </h2>
            <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-white ring-1 ring-slate-900/80">
              Empfohlen für Projekte / Baustellen
            </span>
          </div>

          <p className="text-sm text-slate-600 sm:text-base">
            Wenn Sie mit Projekten arbeiten (z. B. Baustellen, Kundenaufträge), können
            Sie Zeiten direkt einem Projekt zuordnen. So sehen Sie später genau, welche
            Stunden auf welches Projekt gefallen sind.
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Mitarbeiter-Sicht */}
            <div className="space-y-3 rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-100 sm:p-5">
              <h3 className="text-sm font-semibold text-slate-900 sm:text-base">
                A. Schritte für den Mitarbeiter
              </h3>
              <ol className="mt-1 space-y-2 text-sm text-slate-700">
                <li>
                  <span className="font-medium text-slate-900">
                    1. Mitarbeiter dem Projekt zuweisen
                  </span>
                  <p className="mt-1 text-slate-600">
                    In der Projektverwaltung (Bereich „Projekte“) fügen Sie den
                    entsprechenden Mitarbeiter zum jeweiligen Projekt hinzu. Dadurch kann
                    der Mitarbeiter das Projekt später in der Zeiterfassung auswählen.
                  </p>
                </li>
                <li>
                  <span className="font-medium text-slate-900">
                    2. Projekt vor Start auswählen
                  </span>
                  <p className="mt-1 text-slate-600">
                    Im Zeiterfassungs-Bereich wählt der Mitarbeiter vor dem Start der Zeit
                    das passende Projekt aus der Liste aus (z. B. „Projekt: Musterstraße
                    12“).
                  </p>
                </li>
                <li>
                  <span className="font-medium text-slate-900">
                    3. Zeit starten & beenden
                  </span>
                  <p className="mt-1 text-slate-600">
                    Der Mitarbeiter startet die Zeiterfassung wie gewohnt, arbeitet am
                    Projekt und beendet den Eintrag, sobald die Tätigkeit abgeschlossen
                    ist. Die Zeit ist damit direkt dem Projekt zugeordnet.
                  </p>
                </li>
              </ol>
            </div>

            {/* Verwaltung-Sicht */}
            <div className="space-y-3 rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-100 sm:p-5">
              <h3 className="text-sm font-semibold text-slate-900 sm:text-base">
                B. Verwaltung & Auswertung pro Projekt
              </h3>
              <ol className="mt-1 space-y-2 text-sm text-slate-700">
                <li>
                  <span className="font-medium text-slate-900">
                    1. Projekt aufrufen
                  </span>
                  <p className="mt-1 text-slate-600">
                    Öffnen Sie den Bereich „Projekte“ und wählen Sie das gewünschte
                    Projekt aus der Liste aus.
                  </p>
                </li>
                <li>
                  <span className="font-medium text-slate-900">
                    2. Button „Zeiteinträge zu diesem Projekt“
                  </span>
                  <p className="mt-1 text-slate-600">
                    In der Projekt-Detailansicht finden Sie den Button{' '}
                    <span className="font-medium text-slate-900">
                      „Zeiteinträge zu diesem Projekt“
                    </span>
                    . Ein Klick zeigt Ihnen alle Zeiten, die diesem Projekt zugeordnet
                    wurden.
                  </p>
                </li>
                <li>
                  <span className="font-medium text-slate-900">
                    3. Ansehen & exportieren (keine Bearbeitung)
                  </span>
                  <p className="mt-1 text-slate-600">
                    In dieser Projektübersicht können Sie die Zeiteinträge{' '}
                    <span className="font-medium">ansehen</span> und{' '}
                    <span className="font-medium">exportieren</span>, jedoch nicht direkt
                    bearbeiten. Anpassungen erfolgen aus Gründen der Datenkonsistenz nur
                    im jeweiligen Mitarbeiterprofil unter „Zeiteinträge“.
                  </p>
                </li>
              </ol>
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-slate-50/80 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-100">
            <p className="font-medium text-slate-900">Warum projektbasiert?</p>
            <p className="mt-1">
              Mit projektbasierter Zeiterfassung sehen Sie auf einen Blick, wie viele
              Stunden in ein bestimmtes Projekt geflossen sind – ideal für Kalkulation,
              Nachkalkulation und als Grundlage für Rechnungen.
            </p>
          </div>
        </section>

        {/* Abschluss / Link zurück */}
        <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 text-sm text-slate-700 shadow-sm backdrop-blur-xl sm:p-6 lg:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-slate-900">
                Nächster Schritt: Weitere Funktionen entdecken
              </p>
              <p className="mt-1 max-w-xl">
                Sobald die Zeiterfassung läuft, können Sie Projekte, Angebote &
                Rechnungen oder weitere Module in GLENO nutzen. Die Anleitungen dazu
                finden Sie auf der Übersichtsseite.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/dashboard/anleitung"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-900"
              >
                ← Zurück zur Anleitung-Übersicht
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

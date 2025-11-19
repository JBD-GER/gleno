import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'

export default async function EmpfehlungPage() {
  const supabase = await supabaseServer()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const referralCode = user.id?.slice(0, 8) ?? ''
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.gleno.io'
  const referralLink = `${appUrl}/register?ref=${referralCode}`

  return (
    <div className="w-full space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Hero */}
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl space-y-3 sm:space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-600">
              GLENO Empfehlungsprogramm
            </p>
            <h1 className="text-balance text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
              Empfehlen Sie GLENO weiter & sichern Sie sich{' '}
              <span className="bg-gradient-to-r from-sky-600 to-emerald-600 bg-clip-text text-transparent">
                59 € Gutschrift
              </span>{' '}
              pro geworbenem Unternehmen.
            </h1>
            <p className="text-sm text-slate-600 sm:text-base">
              Für jedes Unternehmen, das Sie erfolgreich empfehlen und das mindestens{' '}
              <span className="font-semibold text-slate-900">3 Monate aktiv Kunde bleibt</span>,
              erhalten Sie von uns eine Gutschrift in Höhe von{' '}
              <span className="font-semibold text-slate-900">59 €</span>.
            </p>

            <div className="flex flex-col gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                🚀 Hinweis: Zugang wird bald freigeschaltet
              </span>
              <p>
                Ihr Empfehlungszugang ist bereits hinterlegt – die ausführliche Übersicht mit
                Tracking, Rankings & Auszahlungsstatus wird aktuell noch ausgerollt und ist{' '}
                <span className="font-semibold">bald für Sie freigeschaltet</span>.
              </p>
            </div>
          </div>

          {/* HIER: volle Breite auf Handy, max-w-xs erst ab sm */}
          <div className="mt-4 w-full shrink-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm sm:mt-0 sm:max-w-xs">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Ihr Profil
            </p>
            <p className="mt-2 truncate text-sm font-semibold text-slate-900">
              {user.email}
            </p>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Ihr Empfehlungs-Code
              </p>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-mono text-slate-900">
                <span className="truncate">{referralCode}</span>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Ihr Empfehlungs-Link
              </p>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900">
                <p className="line-clamp-2 break-all">{referralLink}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs text-slate-600">
              <p>Teilen Sie den Link zum Beispiel mit:</p>
              <ul className="list-inside list-disc space-y-0.5">
                <li>anderen Gebäudereinigungs-Unternehmen</li>
                <li>befreundeten Unternehmer:innen</li>
                <li>Ihrem Netzwerk (WhatsApp, E-Mail, Social Media)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Wie es funktioniert */}
      <section className="w-full space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
              So funktioniert Ihre Empfehlung
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Fair, transparent und ideal für unsere aktuellen Kund:innen und Beta-User.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Beta-Special: Sie sind von Anfang an dabei.</span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
              Schritt 1
            </p>
            <h3 className="mt-2 text-sm font-semibold text-slate-900">
              Link teilen
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Senden Sie Ihren persönlichen Empfehlungslink an Unternehmen, die von GLENO profitieren
              würden – zum Beispiel Gebäudereinigungen oder andere Dienstleister.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
              Schritt 2
            </p>
            <h3 className="mt-2 text-sm font-semibold text-slate-900">
              Unternehmen startet mit GLENO
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Das empfohlene Unternehmen registriert sich über Ihren Link und nutzt GLENO regulär im
              Alltag.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
              Schritt 3
            </p>
            <h3 className="mt-2 text-sm font-semibold text-slate-900">
              59 € Gutschrift nach 3 Monaten
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Bleibt das empfohlene Unternehmen{' '}
              <span className="font-semibold">mindestens 3 Monate</span> aktiv Kunde, erhalten Sie
              von uns eine <span className="font-semibold">Gutschrift über 59 €</span>.
            </p>
          </div>
        </div>
      </section>

      {/* Stufen / Rewards */}
      <section className="w-full space-y-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
            Bonus-Stufen für Viel-Empfehler:innen
          </h2>
          <p className="text-sm text-slate-600">
            Für alle, die richtig Gas geben, haben wir ein einfaches, motivierendes Stufen-Modell
            vorgesehen.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Stufe 1
              </p>
              <h3 className="mt-2 text-lg font-semibold text-emerald-900">
                1–2 Empfehlungen
              </h3>
              <p className="mt-1 text-sm text-emerald-800">
                Für jede erfolgreiche Empfehlung:{' '}
                <span className="font-semibold">59 € Gutschrift</span> nach 3 Monaten
                Vertragslaufzeit.
              </p>
            </div>
            <p className="mt-3 text-xs text-emerald-800">
              Ideal, um Ihr Netzwerk langsam an GLENO heranzuführen.
            </p>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                Stufe 2
              </p>
              <h3 className="mt-2 text-lg font-semibold text-sky-900">
                3–4 Empfehlungen
              </h3>
              <p className="mt-1 text-sm text-sky-800">
                Sie erhalten weiterhin pro Empfehlung{' '}
                <span className="font-semibold">59 € Gutschrift</span> – zusätzlich planen wir
                exklusive Beta-Features & kleine Überraschungen nur für starke Empfehler:innen.
              </p>
            </div>
            <p className="mt-3 text-xs text-sky-800">
              Perfekt, wenn Sie GLENO aktiv in Ihrem Netzwerk platzieren.
            </p>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                Stufe 3
              </p>
              <h3 className="mt-2 text-lg font-semibold text-amber-900">
                5+ Empfehlungen
              </h3>
              <p className="mt-1 text-sm text-amber-800">
                Für Power-User denken wir langfristig über{' '}
                <span className="font-semibold">
                  zusätzliche Boni (z. B. Upgrades, Specials oder Events)
                </span>{' '}
                nach – natürlich zusätzlich zu den 59 € pro Empfehlung.
              </p>
            </div>
            <p className="mt-3 text-xs text-amber-800">
              Details kommunizieren wir, sobald das Programm vollständig live ist.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          <span className="font-semibold">Wichtig:</span> Wir sind aktuell in der Beta-Phase. Das
          hier ist der geplante Stand unseres Empfehlungsprogramms. Einzelne Details (z. B.
          Auszahlungsweg oder Einlösung Ihrer Gutschriften) können sich noch leicht ändern – wir
          informieren Sie rechtzeitig und immer transparent.
        </p>
      </section>

      {/* Beta-Hinweis & Ausblick */}
      <section className="mb-4 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-sm sm:p-5">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-900">
            Was kommt als Nächstes?
          </h3>
          <p className="text-xs text-slate-700 sm:text-sm">
            Bald sehen Sie hier eine detaillierte Übersicht über Ihre geworbenen Unternehmen:
            Name, Status, Startdatum und wann Ihre 59 € Gutschrift fällig wird.
          </p>
          <p className="text-xs text-slate-700 sm:text-sm">
            Als Beta-User helfen Sie uns mit Ihrem Feedback, das Programm noch fairer & smarter
            zu machen. Wenn Sie Ideen haben, melden Sie sich jederzeit gern bei uns – wir bauen
            GLENO gemeinsam mit Ihnen.
          </p>
        </div>
      </section>
    </div>
  )
}

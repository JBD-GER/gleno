import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import { ReferralProfileBox } from './ReferralProfilBox'

/** E-Mail maskieren: erster Buchstabe + ****@****.** */
function maskEmail(email?: string | null) {
  if (!email) return '—'
  const [local] = email.split('@')
  if (!local || local.length === 0) return '—'
  return `${local[0]}****@****.**`
}

/** Phase anhand subscription_status ableiten */
function getPhaseLabel(subscriptionStatus?: string | null): string {
  if (!subscriptionStatus || subscriptionStatus === 'none') return 'Kein Abo'
  if (subscriptionStatus === 'trialing' || subscriptionStatus === 'trial_expired') {
    return 'Testphase'
  }
  // gekündigte Abos
  if (['canceled', 'cancelled', 'cancelling'].includes(subscriptionStatus)) {
    return 'Gekündigt'
  }
  // alles andere behandeln wir als „Abo aktiv“
  return 'Abo aktiv'
}

/**
 * Auszahlungs-/Referral-Status berechnen
 * - nutzt bevorzugt DB-Felder (qualified_at, payout_at)
 * - berechnet "Auszahlung frühestens ab" = Abo-Start + 3 Monate + 1 Tag
 * - wenn Abo gekündigt → Status "gekündigt" (kein Anspruch mehr)
 */
function computeReferralDisplayStatus(opts: {
  dbStatus: string
  qualifiedAt?: string | null
  payoutAt?: string | null
  subscriptionStatus?: string | null
  trialEndsAt?: string | null
  createdAt?: string | null
}) {
  const {
    dbStatus,
    qualifiedAt,
    payoutAt,
    subscriptionStatus,
    trialEndsAt,
    createdAt,
  } = opts
  const now = new Date()

  const isCancelled =
    !!subscriptionStatus &&
    ['canceled', 'cancelled', 'cancelling'].includes(subscriptionStatus)

  // Phase (Kein Abo / Testphase / Abo aktiv / Gekündigt)
  const phaseLabel = getPhaseLabel(subscriptionStatus)

  // Abo-Start:
  // 1. Wenn in der DB hinterlegt (qualified_at) → immer bevorzugen
  // 2. Sonst Heuristik: bei "Abo aktiv" → trial_ends_at oder created_at
  let aboStart: Date | null = null

  if (qualifiedAt) {
    const d = new Date(qualifiedAt)
    if (!Number.isNaN(d.getTime())) {
      aboStart = d
    }
  } else {
    const isAboAktiv =
      subscriptionStatus &&
      !['trialing', 'trial_expired', 'none', 'canceled', 'cancelled', 'cancelling'].includes(
        subscriptionStatus
      )

    if (isAboAktiv) {
      if (trialEndsAt) {
        const d = new Date(trialEndsAt)
        if (!Number.isNaN(d.getTime())) {
          aboStart = d
        }
      } else if (createdAt) {
        const d = new Date(createdAt)
        if (!Number.isNaN(d.getTime())) {
          aboStart = d
        }
      }
    }
  }

  // Datum, ab wann Auszahlung „fällig“ wäre: 3 Monate + 1 Tag nach Abo-Start
  let payoutEligibleAt: Date | null = null
  if (aboStart) {
    payoutEligibleAt = new Date(aboStart)
    payoutEligibleAt.setMonth(payoutEligibleAt.getMonth() + 3)
    payoutEligibleAt.setDate(payoutEligibleAt.getDate() + 1)
  }

  // Display-Status:
  // - aus DB: 'offen' | 'qualifiziert' | 'ausgezahlt'
  // - zusätzlich abgeleitet: 'auszahlung_faellig' | 'gekündigt'
  let displayStatus = dbStatus as
    | 'offen'
    | 'qualifiziert'
    | 'ausgezahlt'
    | 'auszahlung_faellig'
    | 'gekündigt'

  const isAboAktiv =
    subscriptionStatus &&
    ![
      'trialing',
      'trial_expired',
      'none',
      'canceled',
      'cancelled',
      'cancelling',
    ].includes(subscriptionStatus)

  // Wenn Abo aktiv und DB-Status noch „offen“ → für Anzeige auf „qualifiziert“ heben
  if (dbStatus === 'offen' && isAboAktiv) {
    displayStatus = 'qualifiziert'
  }

  // Wenn Abo gekündigt → immer "gekündigt" anzeigen, keine Auszahlung mehr
  if (isCancelled) {
    displayStatus = 'gekündigt'
    payoutEligibleAt = null
  } else if (payoutAt) {
    // Wenn ein Auszahlungstermin in der DB steht → Status immer "ausgezahlt"
    displayStatus = 'ausgezahlt'
  } else if (dbStatus !== 'ausgezahlt' && payoutEligibleAt && now >= payoutEligibleAt) {
    // Wenn nicht bereits „ausgezahlt“ und Frist abgelaufen → „Auszahlung fällig“
    displayStatus = 'auszahlung_faellig'
  }

  const displayStatusLabel = (() => {
    switch (displayStatus) {
      case 'offen':
        return 'Offen'
      case 'qualifiziert':
        return 'Qualifiziert (Abo aktiv)'
      case 'auszahlung_faellig':
        return 'Auszahlung fällig'
      case 'ausgezahlt':
        return 'Ausgezahlt'
      case 'gekündigt':
        return 'Gekündigt (kein Anspruch mehr)'
      default:
        return 'Offen'
    }
  })()

  const aboStartDisplay =
    aboStart && !Number.isNaN(aboStart.getTime())
      ? aboStart.toLocaleDateString('de-DE')
      : '—'

  const payoutEligibleDisplay =
    payoutEligibleAt && !Number.isNaN(payoutEligibleAt.getTime())
      ? payoutEligibleAt.toLocaleDateString('de-DE')
      : '—'

  return {
    phaseLabel,
    displayStatus,
    displayStatusLabel,
    aboStartDisplay,
    payoutEligibleDisplay,
  }
}

export default async function EmpfehlungPage() {
  const supabase = await supabaseServer()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // === Referral-Code laden/erzeugen ===
  let referralCode = ''

  const { data: existing, error: referralSelectError } = await supabase
    .from('referral_codes')
    .select('code')
    .eq('user_id', user.id)
    .maybeSingle()

  if (referralSelectError) {
    console.error('Fehler beim Laden des Referral-Codes:', referralSelectError.message)
  }

  if (existing?.code) {
    referralCode = existing.code
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from('referral_codes')
      .insert({ user_id: user.id })
      .select('code')
      .single()

    if (insertError) {
      console.error('Fehler beim Erstellen des Referral-Codes:', insertError.message)
      referralCode = 'FEHLER'
    } else {
      referralCode = inserted?.code ?? ''
    }
  }

  const referralLink = referralCode
    ? `https://www.gleno.de/registrieren?ref=${encodeURIComponent(referralCode)}`
    : 'https://www.gleno.de/registrieren'

  // === Geworbene Nutzer holen ===
  const {
    data: referrals,
    error: referralsError,
  } = await supabase
    .from('user_referrals')
    .select(
      `
      id,
      status,
      created_at,
      qualified_at,
      payout_at,
      referred:referred_user_id (
        id,
        email,
        subscription_status,
        trial_ends_at,
        created_at
      )
    `
    )
    .eq('referrer_user_id', user.id)
    .order('created_at', { ascending: false })

  if (referralsError) {
    console.error('Fehler beim Laden der Referrals:', referralsError.message)
  }

  const safeReferrals = referrals ?? []

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
                🚀 Hinweis: Zugang ist freigeschaltet
              </span>
              <p>
                Ihr Empfehlungszugang ist bereits hinterlegt – die ausführliche Übersicht mit
                Tracking, Rankings & Auszahlungsstatus wird aktuell noch ausgerollt und ist{' '}
                <span className="font-semibold">bald für Sie freigeschaltet</span>.
              </p>
            </div>
          </div>

          {/* Profil + Referral-Code (Client-Komponente) */}
          <ReferralProfileBox
            email={user.email ?? ''}
            referralCode={referralCode}
            referralLink={referralLink}
          />
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

      {/* Beta-Hinweis & Ausblick + Tabelle „Was kommt als Nächstes?“ */}
      <section className="mb-4 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-sm sm:p-5">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-900">
            Was kommt als Nächstes?
          </h3>
          <p className="text-xs text-slate-700 sm:text-sm">
            Unten sehen Sie Ihre geworbenen Unternehmen inklusive Phase
            (Testphase/Abo/Gekündigt) und dem aktuellen Auszahlungsstatus.
          </p>
        </div>

        {/* Desktop-Tabelle */}
        <div className="mt-4 hidden rounded-xl border border-slate-200 bg-slate-50/60 sm:block">
          {safeReferrals.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-500 sm:text-sm">
              Es wurde bisher noch keine Einladung angenommen. Sobald ein Unternehmen sich über
              Ihren Link registriert, erscheint es hier automatisch.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl">
              <table className="min-w-full text-left text-xs text-slate-700 sm:text-sm">
                <thead className="bg-slate-100/80 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Geworbenes Unternehmen (E-Mail)</th>
                    <th className="px-4 py-2">Phase</th>
                    <th className="px-4 py-2">Abo seit</th>
                    <th className="px-4 py-2">Auszahlungsstatus</th>
                    <th className="px-4 py-2">Auszahlung frühestens ab</th>
                  </tr>
                </thead>
                <tbody>
                  {safeReferrals.map((row: any) => {
                    const referred = row.referred as
                      | {
                          id?: string
                          email?: string | null
                          subscription_status?: string | null
                          trial_ends_at?: string | null
                          created_at?: string | null
                        }
                      | null
                      | undefined

                    const {
                      phaseLabel,
                      displayStatusLabel,
                      aboStartDisplay,
                      payoutEligibleDisplay,
                    } = computeReferralDisplayStatus({
                      dbStatus: row.status,
                      qualifiedAt: row.qualified_at,
                      payoutAt: row.payout_at,
                      subscriptionStatus: referred?.subscription_status,
                      trialEndsAt: referred?.trial_ends_at,
                      createdAt: referred?.created_at,
                    })

                    const masked = maskEmail(referred?.email)

                    return (
                      <tr
                        key={row.id}
                        className="border-t border-slate-200/70 last:border-b hover:bg-slate-100/60"
                      >
                        <td className="px-4 py-2 align-middle text-xs sm:text-sm">
                          {masked}
                        </td>
                        <td className="px-4 py-2 align-middle text-xs sm:text-sm">
                          {phaseLabel}
                        </td>
                        <td className="px-4 py-2 align-middle text-xs sm:text-sm">
                          {aboStartDisplay}
                        </td>
                        <td className="px-4 py-2 align-middle text-xs sm:text-sm">
                          {displayStatusLabel}
                        </td>
                        <td className="px-4 py-2 align-middle text-xs sm:text-sm">
                          {payoutEligibleDisplay}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Mobile-Kartenansicht */}
        <div className="mt-4 space-y-3 sm:hidden">
          {safeReferrals.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
              Es wurde bisher noch keine Einladung angenommen.
            </div>
          ) : (
            safeReferrals.map((row: any) => {
              const referred = row.referred as
                | {
                    id?: string
                    email?: string | null
                    subscription_status?: string | null
                    trial_ends_at?: string | null
                    created_at?: string | null
                  }
                | null
                | undefined

              const {
                phaseLabel,
                displayStatusLabel,
                aboStartDisplay,
                payoutEligibleDisplay,
              } = computeReferralDisplayStatus({
                dbStatus: row.status,
                qualifiedAt: row.qualified_at,
                payoutAt: row.payout_at,
                subscriptionStatus: referred?.subscription_status,
                trialEndsAt: referred?.trial_ends_at,
                createdAt: referred?.created_at,
              })

              const masked = maskEmail(referred?.email)

              return (
                <div
                  key={row.id}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">{masked}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                      {phaseLabel}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="flex justify-between">
                      <span className="text-slate-500">Abo seit:</span>
                      <span className="font-medium text-slate-800">
                        {aboStartDisplay}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500">Auszahlungsstatus:</span>
                      <span className="font-medium text-slate-800">
                        {displayStatusLabel}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500">Auszahlung ab:</span>
                      <span className="font-medium text-slate-800">
                        {payoutEligibleDisplay}
                      </span>
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <p className="mt-3 text-[11px] text-slate-500 sm:text-xs">
          Hinweis: Die angezeigten Phasen und Auszahlungszeitpunkte werden automatisch anhand des
          Abo-Status der geworbenen Unternehmen berechnet. Wenn ein Abo gekündigt wurde, wird dies
          als „Gekündigt (kein Anspruch mehr)“ angezeigt. Sobald alle Bedingungen erfüllt sind,
          markieren wir Ihre Empfehlung als auszahlungsreif und informieren Sie separat.
        </p>
      </section>
    </div>
  )
}

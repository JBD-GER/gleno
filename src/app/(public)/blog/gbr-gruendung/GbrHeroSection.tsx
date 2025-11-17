// src/app/(public)/gbr-gruendung/GbrHeroSection.tsx
'use client'

import { FormEvent, useEffect, useState } from 'react'

const PRIMARY = '#0F172A'

export function GbrHeroSection() {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isConsultTime, setIsConsultTime] = useState(false)

  // Nur zwischen 09:00 und 17:00 Uhr anzeigen
  useEffect(() => {
    const now = new Date()
    const hours = now.getHours() // lokale Browserzeit
    if (hours >= 9 && hours < 17) {
      setIsConsultTime(true)
    } else {
      setIsConsultTime(false)
    }
  }, [])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setStatus('idle')
    setErrorMessage(null)

    const form = e.currentTarget
    const formData = new FormData(form)

    try {
      const res = await fetch('/api/leads/gbr-gruendung', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Es ist ein Fehler aufgetreten.')
      }

      setStatus('success')
      form.reset()
    } catch (err: any) {
      setStatus('error')
      setErrorMessage(
        err?.message ||
          'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section
      id="hero"
      className="relative flex min-h-screen items-center overflow-hidden bg-slate-950 text-slate-50"
    >
      {/* Background-Glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at top, rgba(56,189,248,0.16), transparent 55%), radial-gradient(circle at bottom, rgba(15,23,42,1), #020617)',
        }}
      />
      <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-[-80px] h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />

      {/* Content-Grid */}
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 pt-28 pb-24 lg:flex-row lg:items-center lg:gap-14 lg:pt-32 lg:pb-28">
        {/* LEFT: Copy */}
        <div className="max-w-3xl">
          {/* Tagline / Credibility */}
          <div className="inline-flex flex-wrap items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-200 ring-1 ring-sky-500/30 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>GbR gründen 2025</span>
            <span className="hidden text-slate-500 sm:inline">•</span>
            <span className="hidden sm:inline">
              Kosten, Vertrag &amp; Ablauf verstehen
            </span>
            <span className="hidden text-slate-500 md:inline">•</span>
            <span className="hidden md:inline">
              Starterpaket aus der Praxis – 100 % kostenlos
            </span>
          </div>

          {/* Beratungsservice – nur zwischen 09:00 und 17:00 Uhr sichtbar */}
          {isConsultTime && (
            <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-50 shadow-sm backdrop-blur">
              <a
                href="tel:+4950353169991"
                className="inline-flex items-center rounded-2xl bg-emerald-500/90 px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-emerald-400"
              >
                Kostenloser Beratungsservice · +49 5035 3169991
              </a>
              <span className="text-[10px] text-emerald-100/90">
                Wir beantworten jede Frage persönlich – inklusive optionalem{' '}
                <strong>30-Minuten Online-Meeting</strong>, falls nötig.
              </span>
            </div>
          )}

          <h1 className="mt-4 text-[26px] font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-[40px]">
            GbR gründen ohne Anwaltspanik
            <span className="block text-sky-100">
              Holen Sie sich das komplette Starterpaket in Ihr Postfach.
            </span>
          </h1>

          <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-slate-200 sm:text-[15px]">
            Statt zehn Tabs offen zu haben, bekommen Sie alles an einem Ort: Ein{' '}
            <strong>Leitfaden zur GbR-Gründung</strong>, eine{' '}
            <strong>Checkliste zum Abhaken</strong>, ein{' '}
            <strong>Mustervertrag (Word)</strong>, eine{' '}
            <strong>Excel-Kostenübersicht</strong> und ein{' '}
            <strong>30-Tage-Startplan</strong> – direkt nutzbar für Ihre eigene GbR.
          </p>

          <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-sky-300">
            Klar, praxisnah und ohne Juristendeutsch – erstellt von Unternehmern,
            die selbst gegründet haben. Ideal, wenn Sie sich gerade fragen:
            „Wo fange ich an? Was kostet das? Und was darf ich auf keinen Fall
            vergessen?“
          </p>

          {/* Trust badges */}
          <div className="mt-5 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-3 py-1 ring-1 ring-slate-700/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              100 % kostenlos &amp; unverbindlich
            </span>
            <span className="rounded-full bg-slate-900/80 px-3 py-1 ring-1 ring-slate-800/80">
              Sofortiger Versand per E-Mail
            </span>
            <span className="rounded-full bg-slate-900/70 px-3 py-1 ring-1 ring-slate-800/70">
              Sie können sich jederzeit mit einem Klick abmelden
            </span>
          </div>
        </div>

        {/* RIGHT: Lead-Form */}
        <div className="w-full max-w-md lg:max-w-sm" id="lead-form">
          <div className="relative overflow-hidden rounded-3xl border border-sky-500/30 bg-slate-900/90 p-5 shadow-[0_24px_90px_rgba(15,23,42,0.98)] backdrop-blur-xl">
            {/* Glow */}
            <div className="pointer-events-none absolute -top-16 right-[-40px] h-32 w-32 rounded-full bg-sky-500/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 left-[-40px] h-32 w-32 rounded-full bg-emerald-400/15 blur-3xl" />

            <div className="relative">
              <h2 className="text-sm font-semibold tracking-tight text-white sm:text-[15px]">
                Starterpaket „GbR gründen 2025“ sichern
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                Tragen Sie Ihre E-Mail ein – wir bereiten alle Unterlagen vor und
                senden sie Ihnen mit allen Anhängen in einer E-Mail zu. Die
                Telefonnummer hilft uns nur, falls wir Rückfragen haben. Kein
                Telefonverkauf, kein Spam.
              </p>

              {/* WHAT YOU GET LIST */}
              <div className="mt-3 rounded-2xl border border-slate-700/80 bg-slate-950/80 p-3 text-[11px] text-slate-200">
                <p className="font-semibold text-sky-200">
                  Sie erhalten per E-Mail:
                </p>
                <ul className="mt-1 space-y-1">
                  <li>
                    • PDF-Leitfaden „GbR gründen 2025 – Der komplette Überblick“
                  </li>
                  <li>• Einfache GbR-Gründungs-Checkliste zum Ausdrucken</li>
                  <li>• Muster-Gesellschaftsvertrag als Word-Datei (editierbar)</li>
                  <li>
                    • Excel-Vorlage zur Planung aller Gründungs- &amp; laufenden
                    Kosten
                  </li>
                  <li>
                    • 30-Tage-Startplan mit Wochenaufgaben nach der Gründung
                  </li>
                </ul>
              </div>

              {/* FORM – Client Submit */}
              <form
                className="mt-4 space-y-3"
                onSubmit={handleSubmit}
              >
                <div className="space-y-1">
                  <label
                    htmlFor="email"
                    className="block text-[11px] font-medium text-slate-100"
                  >
                    E-Mail-Adresse *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="z. B. name@unternehmen.de"
                    className="w-full rounded-2xl border border-slate-600 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-50 outline-none placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="phone"
                    className="block text-[11px] font-medium text-slate-100"
                  >
                    Telefonnummer (optional)
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="Für Rückfragen – kein Telefonverkauf"
                    className="w-full rounded-2xl border border-slate-600 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-50 outline-none placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-1">
                  <label className="flex items-start gap-2 text-[10px] text-slate-400">
                    <input
                      type="checkbox"
                      name="privacy"
                      required
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-500 bg-slate-900 text-sky-500 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isLoading}
                    />
                    <span>
                      Ich bin damit einverstanden, dass mir die Unterlagen per
                      E-Mail zugesendet werden. Weitere Informationen in der
                      Datenschutzerklärung.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 inline-flex w-full items-center justify-center rounded-2xl px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_18px_60px_rgba(8,47,73,0.9)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_80px_rgba(8,47,73,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:translate-y-0 disabled:shadow-none disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ backgroundColor: PRIMARY }}
                >
                  {isLoading && (
                    <span className="mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-sky-200/70 border-t-transparent animate-spin" />
                  )}
                  {isLoading
                    ? 'Starterpaket wird vorbereitet …'
                    : 'Starterpaket jetzt kostenlos anfordern'}
                </button>

                {isLoading && (
                  <p className="mt-2 text-[10px] text-sky-300 animate-pulse">
                    Ihre Unterlagen werden vorbereitet, die Anhänge werden erzeugt
                    und gleich gemeinsam in einer E-Mail versendet …
                  </p>
                )}

                {status === 'success' && (
                  <div className="mt-3 rounded-2xl border border-emerald-400/60 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-100">
                    <strong>Fast geschafft!</strong>{' '}
                    Die E-Mail mit allen Anhängen wurde versendet. Bitte prüfen
                    Sie in den nächsten Minuten auch Ihren{' '}
                    <strong>Spam- oder Werbeordner</strong>, falls die Nachricht
                    nicht im Posteingang auftaucht.
                  </div>
                )}

                {status === 'error' && (
                  <div className="mt-3 rounded-2xl border border-rose-400/70 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-100">
                    <strong>Es ist ein Fehler aufgetreten.</strong>{' '}
                    {errorMessage ||
                      'Bitte versuchen Sie es später noch einmal oder kontaktieren Sie uns direkt.'}
                  </div>
                )}

                <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                  100 % kostenlos &amp; unverbindlich. Sie erhalten gelegentlich
                  ergänzende Tipps zur GbR-Gründung und zum Arbeiten mit GLENO.
                  Abmeldung ist jederzeit mit einem Klick möglich.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

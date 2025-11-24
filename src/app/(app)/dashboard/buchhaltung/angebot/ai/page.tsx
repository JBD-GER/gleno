'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AIPromptOfferPage() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  async function handleGenerate() {
    if (!prompt.trim() || loading) return
    setLoading(true)
    setErr(null)
    try {
      // Alten Draft vor neuem Versuch leeren
      try {
        sessionStorage.removeItem('ai_offer_draft')
      } catch {}

      const res = await fetch('/api/ai/draft-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Fehler')

      sessionStorage.setItem('ai_offer_draft', JSON.stringify(data))
      router.push('/dashboard/buchhaltung/angebot/angebot-erstellen')
    } catch (e: any) {
      setErr(e?.message || 'Fehler beim Erzeugen des Entwurfs.')
    } finally {
      setLoading(false)
    }
  }

  const disabled = loading || !prompt.trim()

  const examplePrompts = [
    '30 m² Badezimmer: alte Fliesen entfernen, Untergrund vorbereiten, neue Feinsteinzeug-Fliesen verlegen, Silikonfugen – inkl. Material.',
    'Unterhaltsreinigung Büro (200 m²) 2x pro Woche: Bodenreinigung, Sanitär, Küche, Mülleimer, Oberflächen.',
    'Montage & Anschluss einer 7 kW Klimaanlage inkl. Kernbohrung, Inbetriebnahme und Einweisung.',
  ]

  const currentStep = loading ? 2 : prompt.trim() ? 1 : 1

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(1200px_350px_at_-10%_-30%,rgba(15,23,42,0.08),transparent_60%),radial-gradient(1200px_450px_at_110%_130%,rgba(15,23,42,0.18),transparent_60%),#e8edf5] px-4 py-8 text-slate-700">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 lg:gap-8">
        {/* Kopfbereich */}
        <header className="space-y-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-xl">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white">
              ✨
            </span>
            KI-Assistenz für Angebote
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Lass dir dein Angebot von der KI vorbereiten
          </h1>
          <p className="max-w-2xl text-sm text-slate-600 sm:text-[15px]">
            Beschreibe in eigenen Worten, was du anbieten möchtest. Die KI erstellt daraus einen
            vollständigen Angebotsentwurf, den du im nächsten Schritt im Editor anpassen kannst.
          </p>
        </header>

        {/* Layout: links Prompt, rechts Ablauf / Erklärung */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          {/* Linkes Panel: Prompt & Aktionen */}
          <section className="space-y-4 rounded-2xl border border-white/70 bg-white/80 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.20)] backdrop-blur-xl sm:p-6">
            {/* Step-Indicator */}
            <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                Schritt{' '}
                <span className="font-semibold text-slate-900">
                  {currentStep}
                </span>{' '}
                von 3
              </span>
              {prompt.length > 0 && (
                <span className="tabular-nums">
                  {prompt.length.toLocaleString('de-DE')} Zeichen
                </span>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Projekt / Leistungsbeschreibung
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={8}
                className="w-full rounded-xl border border-white/70 bg-white/80 p-3 text-sm text-slate-900 outline-none ring-indigo-200/70 placeholder:text-slate-400 focus:ring-4"
                placeholder="Beschreibe hier möglichst konkret, was du anbieten möchtest: Umfang, Besonderheiten, Material, Ort, etc."
              />

              {/* Prompt-Ideen */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500">
                  Beispiele (klicken zum Übernehmen):
                </p>
                <div className="flex flex-wrap gap-2">
                  {examplePrompts.map((ex, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPrompt(ex)}
                      className="group inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-left text-[11px] text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-900 hover:text-white"
                    >
                      <span className="line-clamp-1">
                        {ex}
                      </span>
                      <span className="text-[10px] text-slate-400 group-hover:text-slate-200">
                        Verwenden
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {err && (
              <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700">
                {err}
              </div>
            )}

            {/* Actions + „Fortschrittsleiste“ beim Generieren */}
            <div className="mt-4 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() =>
                    router.push('/dashboard/buchhaltung/angebot/angebot-erstellen')
                  }
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white/80 px-4 py-2 text-xs font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
                >
                  Ohne KI fortfahren
                </button>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={disabled}
                  className={[
                    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition',
                    disabled
                      ? 'cursor-not-allowed bg-slate-400'
                      : 'bg-slate-900 hover:bg-slate-800',
                  ].join(' ')}
                >
                  {loading && (
                    <span className="inline-flex h-4 w-4 items-center justify-center">
                      <span className="h-3 w-3 animate-spin rounded-full border-[2px] border-white/40 border-t-white" />
                    </span>
                  )}
                  <span>
                    {loading ? 'KI erstellt deinen Entwurf…' : 'Entwurf erzeugen & weiter'}
                  </span>
                </button>
              </div>

              {loading && (
                <div className="mt-1 space-y-1 text-[11px] text-slate-500">
                  <div className="h-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-1/2 animate-[progress_1.2s_ease-in-out_infinite] rounded-full bg-slate-900/80" />
                  </div>
                  <p>
                    Die KI zerlegt deine Beschreibung in Leistungen, Mengen und Preise und
                    übergibt alles an den Angebotseditor…
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Rechtes Panel: Ablauf / Erklärung */}
          <aside className="space-y-4 rounded-2xl border border-white/60 bg-white/60 p-5 text-sm text-slate-700 shadow-[0_16px_45px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:p-6">
            <h2 className="mb-1 text-sm font-semibold tracking-tight text-slate-900">
              So läuft es ab
            </h2>
            <ol className="space-y-3 text-xs sm:text-[13px]">
              <li className="flex gap-3">
                <div
                  className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold ${
                    currentStep === 1
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 bg-white text-slate-500'
                  }`}
                >
                  1
                </div>
                <div>
                  <div className="font-medium text-slate-900">
                    Auftrag beschreiben
                  </div>
                  <p className="text-slate-600">
                    Du schreibst in deinen Worten, was du genau anbieten möchtest –
                    je konkreter, desto besser der Entwurf.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div
                  className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold ${
                    loading
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 bg-white text-slate-500'
                  }`}
                >
                  2
                </div>
                <div>
                  <div className="font-medium text-slate-900">
                    KI erstellt Angebotsentwurf
                  </div>
                  <p className="text-slate-600">
                    Positionen, Mengen, Einheiten, Texte &ndash; die KI bereitet alles als
                    strukturierten Entwurf vor. Nichts wird automatisch an den Kunden
                    verschickt.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-semibold text-slate-500">
                  3
                </div>
                <div>
                  <div className="font-medium text-slate-900">
                    Im Editor prüfen & anpassen
                  </div>
                  <p className="text-slate-600">
                    Du landest automatisch im Angebots-Editor, kannst jede Position
                    bearbeiten, Rabatte setzen und das PDF erzeugen oder als Grundlage für
                    eine Auftragsbestätigung nutzen.
                  </p>
                </div>
              </li>
            </ol>

            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-[11px] text-slate-600">
              <p className="font-medium text-slate-900">
                Wichtig:
              </p>
              <p className="mt-1">
                Der KI-Entwurf ist nur eine Hilfe. Du behältst immer die volle Kontrolle
                und entscheidest, was du dem Kunden tatsächlich anbietest.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Tailwind Keyframe Hinweis: 
          In deiner tailwind.config kannst du optional ein 'progress'-Keyframe definieren,
          ansonsten nutzt Tailwind automatisch eine lineare Animation. */}
      <style jsx>{`
        @keyframes progress {
          0% {
            transform: translateX(-60%);
          }
          50% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(120%);
          }
        }
      `}</style>
    </div>
  )
}

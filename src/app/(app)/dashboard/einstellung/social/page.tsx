// app/(app)/dashboard/einstellung/social/page.tsx
import Link from 'next/link'
import { supabaseServer } from '@/lib/supabase-server'

type RawSearchParams = {
  connected?: string
  disconnected?: string
  error?: string
}

type SocialSettingsPageProps = {
  searchParams: Promise<RawSearchParams>
}

export default async function SocialSettingsPage(props: SocialSettingsPageProps) {
  // ✅ Next 13.5+ – searchParams awaiten
  const { connected, disconnected, error } = await props.searchParams

  const providerLabel =
    connected === 'facebook'
      ? 'Facebook'
      : connected === 'instagram'
      ? 'Instagram'
      : connected === 'linkedin'
      ? 'LinkedIn'
      : null

  const disconnectedLabel =
    disconnected === 'facebook'
      ? 'Facebook'
      : disconnected === 'instagram'
      ? 'Instagram'
      : disconnected === 'linkedin'
      ? 'LinkedIn'
      : null

  const errorLabel = (() => {
    if (!error) return null
    if (error.startsWith('facebook_')) return 'Facebook'
    if (error.startsWith('instagram_')) return 'Instagram'
    if (error.startsWith('linkedin_')) return 'LinkedIn'
    return 'Social Media'
  })()

  // ------------------- Verbundene Accounts laden -------------------
  const supa = await supabaseServer()
  const {
    data: { user },
  } = await supa.auth.getUser()

  let facebookCount = 0
  let instagramCount = 0
  let linkedinCount = 0

  if (user) {
    const { data: accounts, error: accountsError } = await supa
      .from('social_accounts')
      .select('id, provider')
      .eq('user_id', user.id)

    if (!accountsError && accounts) {
      facebookCount = accounts.filter((a) => a.provider === 'facebook').length
      instagramCount = accounts.filter((a) => a.provider === 'instagram').length
      linkedinCount = accounts.filter((a) => a.provider === 'linkedin').length
    }
  }

  const hasAnyConnection =
    facebookCount > 0 || instagramCount > 0 || linkedinCount > 0

  return (
    <div className="relative w-full space-y-6">
      {/* Soft Background Glow – dezent, nicht so fett wie vorher */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-10 top-6 h-40 w-40 rounded-full bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.14),_transparent_60%)]" />
        <div className="absolute right-[-40px] top-32 h-48 w-48 rounded-full bg-[radial-gradient(circle_at_center,_rgba(37,99,235,0.16),_transparent_60%)]" />
      </div>

      {/* HEAD / GATE */}
      <div className="rounded-3xl border border-white/70 bg-white/85 px-4 py-4 shadow-[0_14px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-[10px] shadow-sm">
              1
            </span>
            Social Media Gate
          </div>

          <div>
            <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">
              Social Media Verknüpfungen
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Betritt das Gate, verbinde deine Kanäle und plane Posts direkt aus
              GLENO – ohne Tool-Chaos, ohne Copy-&-Paste.
            </p>
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
            <span className="rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 shadow-sm">
              Facebook Seiten
            </span>
            <span className="rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 shadow-sm">
              Instagram Business
            </span>
            <span className="rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 shadow-sm">
              LinkedIn Unternehmensseiten
            </span>
          </div>
        </div>
      </div>

      {/* STATUS-MELDUNGEN */}
      {(connected || disconnected || error) && (
        <div className="space-y-2">
          {connected && providerLabel && (
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-xs text-emerald-900 shadow-sm backdrop-blur">
              <span className="mr-1.5 inline-block h-4 w-4 translate-y-[1px] rounded-full bg-emerald-400/90" />{' '}
              <span className="font-semibold">{providerLabel}</span> wurde
              erfolgreich verbunden.
            </div>
          )}

          {disconnected && disconnectedLabel && (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs text-amber-900 shadow-sm backdrop-blur">
              <span className="mr-1.5 inline-block h-4 w-4 translate-y-[1px] rounded-full bg-amber-400/90" />{' '}
              Die Verbindung zu{' '}
              <span className="font-semibold">{disconnectedLabel}</span> wurde
              getrennt.
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-200/80 bg-rose-50/90 px-3 py-2 text-xs text-rose-900 shadow-sm backdrop-blur">
              <span className="mr-1.5 inline-block h-4 w-4 translate-y-[1px] rounded-full bg-rose-400/90" />{' '}
              Beim Verbinden mit{' '}
              <span className="font-semibold">{errorLabel}</span> ist ein
              Fehler aufgetreten. Bitte versuche es später erneut.
              <div className="mt-1 text-[10px] text-rose-500">
                (Technischer Code: {error})
              </div>
            </div>
          )}
        </div>
      )}

      {/* GRID: links Übersicht (Tabelle), rechts die „Gates“ */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.1fr)]">
        {/* LINKS: Übersicht als kleine Table im Glass-Panel */}
        <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.17em] text-slate-500">
                Übersicht
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Welche Kanäle aktuell mit GLENO verbunden sind.
              </p>
            </div>
            {hasAnyConnection && (
              <span className="rounded-full border border-emerald-200/70 bg-emerald-50/90 px-2.5 py-1 text-[11px] font-medium text-emerald-800 shadow-sm">
                Ready to schedule
              </span>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-slate-50/60 text-xs shadow-sm">
            <div className="grid grid-cols-[1.2fr_1fr_1fr] border-b border-slate-100/80 bg-white/70 px-3 py-2 font-medium text-slate-500 backdrop-blur">
              <div>Kanal</div>
              <div>Status</div>
              <div className="text-right">Verknüpfte Konten</div>
            </div>

            <div className="divide-y divide-slate-100/80">
              {/* Facebook Row */}
              <div className="grid grid-cols-[1.2fr_1fr_1fr] px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0866FF]" />
                  <span>Facebook</span>
                </div>
                <div className="text-slate-600">
                  {facebookCount > 0 ? 'Verbunden' : 'Nicht verbunden'}
                </div>
                <div className="text-right text-slate-700">
                  {facebookCount > 0 ? facebookCount : '–'}
                </div>
              </div>

              {/* Instagram Row */}
              <div className="grid grid-cols-[1.2fr_1fr_1fr] px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]" />
                  <span>Instagram</span>
                </div>
                <div className="text-slate-600">
                  {instagramCount > 0 ? 'Verbunden' : 'Nicht verbunden'}
                </div>
                <div className="text-right text-slate-700">
                  {instagramCount > 0 ? instagramCount : '–'}
                </div>
              </div>

              {/* LinkedIn Row */}
              <div className="grid grid-cols-[1.2fr_1fr_1fr] px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0A66C2]" />
                  <span>LinkedIn</span>
                </div>
                <div className="text-slate-600">
                  {linkedinCount > 0 ? 'Verbunden' : 'Nicht verbunden'}
                </div>
                <div className="text-right text-slate-700">
                  {linkedinCount > 0 ? linkedinCount : '–'}
                </div>
              </div>
            </div>
          </div>

          <p className="mt-2 text-[11px] text-slate-500">
            Tipp: Später kannst du hier auch sehen, welche Seite welchem GLENO
            Workspace zugeordnet ist.
          </p>
        </div>

        {/* RECHTS: drei kleinere „Gate-Karten“ untereinander (mobil: full width) */}
        <div className="space-y-4">
          {/* Facebook Card */}
          <div className="group rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-transform duration-150 hover:-translate-y-0.5 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Kanal
                </div>
                <div className="mt-0.5 text-sm font-semibold text-slate-900">
                  Facebook
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Verbinde deine Facebook-Seiten, um organische Posts direkt aus
                  GLENO zu veröffentlichen.
                </p>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Status:{' '}
                  <span className="font-medium">
                    {facebookCount > 0 ? 'Verbunden' : 'Noch nicht verbunden'}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
{facebookCount > 0 && (
  <a
    href="/api/social/disconnect/facebook"
    className="rounded-xl border border-slate-200/80 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-slate-50"
  >
    Verbindung trennen
  </a>
)}

              <Link
                href="/api/social/connect/facebook"
                className="rounded-xl bg-[#0866FF] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-[#0750c7]"
              >
                Verbinden
              </Link>
            </div>
          </div>

          {/* Instagram Card */}
          <div className="group rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-transform duration-150 hover:-translate-y-0.5 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Kanal
                </div>
                <div className="mt-0.5 text-sm font-semibold text-slate-900">
                  Instagram
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Verknüpfe dein Instagram-Business-Konto für Reels, Bilder und
                  Carousels direkt aus GLENO.
                </p>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Status:{' '}
                  <span className="font-medium">
                    {instagramCount > 0
                      ? 'Verbunden'
                      : 'Noch nicht verbunden'}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
{instagramCount > 0 && (
  <a
    href="/api/social/disconnect/instagram"
    className="rounded-xl border border-slate-200/80 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-slate-50"
  >
    Verbindung trennen
  </a>
)}
              <Link
                href="/api/social/connect/instagram"
                className="rounded-xl bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition"
              >
                Verbinden
              </Link>
            </div>
          </div>

          {/* LinkedIn Card */}
          <div className="group rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-transform duration-150 hover:-translate-y-0.5 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Kanal
                </div>
                <div className="mt-0.5 text-sm font-semibold text-slate-900">
                  LinkedIn
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Poste Fach-Content direkt auf deine LinkedIn-Unternehmensseite
                  – ohne Export aus anderen Tools.
                </p>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Status:{' '}
                  <span className="font-medium">
                    {linkedinCount > 0
                      ? 'Verbunden'
                      : 'Noch nicht verbunden'}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
{linkedinCount > 0 && (
  <a
    href="/api/social/disconnect/linkedin"
    className="rounded-xl border border-slate-200/80 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-slate-50"
  >
    Verbindung trennen
  </a>
)}
              <Link
                href="/api/social/connect/linkedin"
                className="rounded-xl bg-[#0A66C2] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-[#084f97]"
              >
                Verbinden
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

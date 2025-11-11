// src/app/(consument)/konsument/anfragen/[requestId]/bewerbungen/[applicationId]/page.tsx

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/* -------------------------------- Types -------------------------------- */

type PartnerRow = {
  id: string
  display_name: string | null
  company_name: string | null
  city: string | null
  website: string | null
  logo_path: string | null
}

type FileRow = {
  id: string
  name: string | null
  size: number | null
  path: string
  uploaded_at: string
  content_type: string | null
}

type AppRow = {
  id: string
  status: 'eingereicht' | 'angenommen' | 'abgelehnt' | string
  message_html: string | null
  message_text: string | null
  created_at: string
  partner_id: string
  request_id: string
  partner: PartnerRow | PartnerRow[] | null
  files: FileRow[] | null
}

type ReqRow = {
  id: string
  user_id: string
  status: string
}

/* --------------------------- Helpers & Styles --------------------------- */

const PUBLIC_PARTNER_ROUTE_PREFIX = '/markt/partner'

function normalizePartner(p: AppRow['partner']): PartnerRow | null {
  if (!p) return null
  return Array.isArray(p) ? p[0] ?? null : p
}

function statusBadgeCls(s: string) {
  const v = (s || '').toLowerCase()
  const base =
    'inline-flex items-center justify-center rounded-full px-3 py-0.5 text-[10px] font-semibold text-white'
  if (v === 'angenommen') return `${base} bg-emerald-600`
  if (v === 'abgelehnt') return `${base} bg-rose-600`
  return `${base} bg-[#0a1b40]`
}

function statusLabel(s: string) {
  const v = (s || '').toLowerCase()
  if (v === 'angenommen') return 'Angenommen'
  if (v === 'abgelehnt') return 'Abgelehnt'
  return 'Eingereicht'
}

function bytesNice(n: number | null | undefined) {
  const b = typeof n === 'number' ? n : 0
  if (b < 1024) return `${b} B`
  const kb = b / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`
}

const cardBase =
  'rounded-3xl border border-white/70 bg-white/92 backdrop-blur-2xl px-5 py-4 shadow-[0_16px_50px_rgba(15,23,42,0.10)] ring-1 ring-white/70'

function normalizeRequestStatus(raw: string | null | undefined) {
  const v = (raw || '').toLowerCase().trim().replace(/\s+/g, '_')
  return v
}

function isRequestLocked(status: string | null | undefined) {
  const v = normalizeRequestStatus(status)
  if (!v) return false
  return [
    'aktiv',
    'auftrag_erstellt',
    'auftrag-erstellt',
    'auftrag_bestaetigt',
    'auftrag-bestaetigt',
    'rechnungsphase',
    'abgeschlossen',
  ].includes(v)
}

/* Logo-URL wie im öffentlichen Partnerprofil */

async function resolveLogoUrl(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  rawPath?: string | null
) {
  if (!rawPath) return null
  const trimmed = rawPath.trim()
  if (!trimmed) return null

  // Bereits absolute URL?
  if (/^https?:\/\//i.test(trimmed)) return trimmed

  const bucket = 'markt'
  const objectPath = trimmed.includes('/') ? trimmed : `logo/${trimmed}`

  // Erst signierte URL versuchen
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(objectPath, 60 * 60)
    if (!error && data?.signedUrl) return data.signedUrl
  } catch {
    // ignore
  }

  // Dann Public-URL fallback
  const pub = supabase.storage.from(bucket).getPublicUrl(objectPath)
  if (pub?.data?.publicUrl) return pub.data.publicUrl

  return null
}

/* --------------------------------- Page --------------------------------- */

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id?: string; requestId?: string; applicationId: string }>
}) {
  const awaited = await params
  const requestId = awaited.requestId ?? awaited.id
  const applicationId = awaited.applicationId

  if (!requestId) {
    console.error('[ApplicationDetailPage] Missing requestId. params =', awaited)
    return notFound()
  }

  const supabase = await supabaseServer()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return redirect('/login')

  // Anfrage prüfen
  const { data: reqRow, error: reqErr } = await supabase
    .from('market_requests')
    .select('id,user_id,status')
    .eq('id', requestId)
    .maybeSingle<ReqRow>()

  if (reqErr) {
    console.error(
      '[ApplicationDetailPage] market_requests error:',
      reqErr.message,
      { requestId }
    )
  }

  if (!reqRow || reqRow.user_id !== session.user.id) return notFound()

  // Bewerbung + Partner + Files laden
  const { data: appRow, error: appErr } = await supabase
    .from('market_applications')
    .select(
      `
      id, status, message_html, message_text, created_at, partner_id, request_id,
      partner:partners(id, display_name, company_name, city, website, logo_path),
      files:market_application_files(id, name, size, path, uploaded_at, content_type)
    `
    )
    .eq('id', applicationId)
    .eq('request_id', requestId)
    .maybeSingle<AppRow>()

  if (appErr) {
    console.error(
      '[ApplicationDetailPage] market_applications error:',
      appErr.message,
      { applicationId, requestId }
    )
  }

  if (!appRow) return notFound()

  const partner = normalizePartner(appRow.partner)
  const isThisAccepted = (appRow.status || '').toLowerCase() === 'angenommen'
  const requestLocked = isRequestLocked(reqRow.status)
  const showLockedHint = requestLocked && !isThisAccepted

  // Logo-URL korrekt auflösen
  const partnerLogoUrl = await resolveLogoUrl(supabase, partner?.logo_path)

  // Dateien signen
  const filesWithLinks: (FileRow & { viewUrl: string; downloadUrl: string })[] =
    []
  if (Array.isArray(appRow.files) && appRow.files.length > 0) {
    for (const f of appRow.files) {
      const { data: signed } = await supabase.storage
        .from('markt')
        .createSignedUrl(f.path, 60 * 10, { download: f.name || undefined })
      const link = signed?.signedUrl || '#'
      filesWithLinks.push({ ...f, viewUrl: link, downloadUrl: link })
    }
  }

  /* --------------------------------- UI --------------------------------- */

  return (
    <section className="relative mx-auto max-w-5xl px-4 sm:px-6 py-7 sm:py-9">
      {/* Soft Background */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-28vh] -z-10 h-[130vh] w-[180vw] -translate-x-1/2"
        style={{
          background:
            'radial-gradient(1200px 480px at 50% 0%, rgba(10,27,64,0.06), transparent),radial-gradient(900px 420px at 10% 15%, rgba(10,27,64,0.04), transparent),radial-gradient(900px 420px at 90% 10%, rgba(10,27,64,0.04), transparent)',
        }}
      />

      {/* Top-Bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[10px] font-medium text-slate-700 ring-1 ring-white/70 backdrop-blur">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Bewerbung zu Ihrer Anfrage
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
            Bewerbung von{' '}
            {partner?.display_name ||
              partner?.company_name ||
              'Ihrem Handwerksbetrieb'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Prüfen Sie Nachricht, Unterlagen und Profil des Partners und
            entscheiden Sie anschließend, ob Sie die Bewerbung annehmen möchten.
          </p>
        </div>

        <Link
          href={`/konsument/anfragen/${requestId}`}
          className="rounded-2xl border border-white/70 bg-white/92 px-3 py-1.5 text-xs sm:text-sm text-slate-800 shadow-sm hover:shadow-md"
        >
          Zur Anfrage zurück
        </Link>
      </div>

      {/* Partner-Header */}
      <div className={cardBase}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {partnerLogoUrl ? (
              <img
                src={partnerLogoUrl}
                alt={
                  partner?.display_name ||
                  partner?.company_name ||
                  'Partner Logo'
                }
                className="h-11 w-11 rounded-2xl border border-white/70 object-contain bg-white/90 p-1"
              />
            ) : (
              <div className="h-11 w-11 rounded-2xl border border-white/70 bg-slate-100 text-slate-500 text-sm grid place-items-center">
                {(partner?.display_name ||
                  partner?.company_name ||
                  'P'
                )
                  .slice(0, 1)
                  .toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-900">
                <span className="truncate">
                  {partner?.display_name ||
                    partner?.company_name ||
                    'Partner'}
                </span>
                {partner?.city && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-normal text-slate-600">
                      {partner.city}
                    </span>
                  </>
                )}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                Bewerbung eingereicht am{' '}
                {new Date(appRow.created_at).toLocaleString('de-DE')}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            <span className={statusBadgeCls(appRow.status)}>
              {statusLabel(appRow.status)}
            </span>

            {partner?.id && (
              <Link
                href={`${PUBLIC_PARTNER_ROUTE_PREFIX}/${partner.id}`}
                className="rounded-2xl border border-slate-100 bg-white/95 px-3 py-1.5 text-[10px] sm:text-xs text-slate-900 shadow-sm hover:shadow"
              >
                Partner-Profil
              </Link>
            )}

            {partner?.website && (
              <a
                href={partner.website}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-slate-100 bg-white/95 px-3 py-1.5 text-[10px] sm:text-xs text-slate-900 shadow-sm hover:shadow"
              >
                Website öffnen
              </a>
            )}

            {isThisAccepted && (
              <Link
                href={`/konsument/chat/${requestId}`}
                className="rounded-2xl bg-slate-900 px-3 py-1.5 text-[10px] sm:text-xs text-white shadow-sm hover:opacity-90"
              >
                Chat öffnen
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Angenommen-Hinweis */}
      {isThisAccepted && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-xs sm:text-sm text-emerald-900 shadow-sm">
          Diese Bewerbung haben Sie angenommen. Die Anfrage läuft jetzt mit
          diesem Partner. Sie können über den Chat direkt kommunizieren.
        </div>
      )}

      {/* Nachricht */}
      <div className={`${cardBase} mt-5`}>
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm sm:text-base font-semibold text-slate-900">
            Nachricht des Partners
          </div>
        </div>

        {appRow.message_html ? (
          <div
            className="prose prose-sm mt-3 max-w-none text-slate-800"
            dangerouslySetInnerHTML={{ __html: appRow.message_html }}
          />
        ) : appRow.message_text ? (
          <pre className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800">
            {appRow.message_text}
          </pre>
        ) : (
          <div className="mt-3 text-sm text-slate-500">
            Der Partner hat keine zusätzliche Nachricht hinterlassen.
          </div>
        )}
      </div>

      {/* Dateien */}
      <div className={`${cardBase} mt-4`}>
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm sm:text-base font-semibold text-slate-900">
            Unterlagen & Dateien
          </div>
        </div>

        {filesWithLinks.length === 0 ? (
          <div className="mt-3 text-sm text-slate-500">
            Es wurden keine Dateien mitgesendet.
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100/70">
            {filesWithLinks.map((f) => {
              const type = (f.content_type || '').toLowerCase()
              const isImage = type.startsWith('image/')
              const isPdf = type === 'application/pdf'
              const label = isPdf
                ? 'PDF'
                : isImage
                ? 'Bild'
                : f.content_type || 'Datei'

              return (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {f.name || 'Datei'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {label} · {bytesNice(f.size)} ·{' '}
                      {new Date(f.uploaded_at).toLocaleString('de-DE')}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <a
                      href={f.viewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-slate-100 bg-white/95 px-2.5 py-1.5 text-[10px] text-slate-900 shadow-sm hover:shadow"
                    >
                      Ansehen
                    </a>
                    <a
                      href={f.downloadUrl}
                      download={f.name || undefined}
                      className="rounded-2xl border border-slate-100 bg-white/95 px-2.5 py-1.5 text-[10px] text-slate-900 shadow-sm hover:shadow"
                    >
                      Download
                    </a>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Aktionen */}
      <div
        className={`${cardBase} mt-4 flex flex-col gap-3 ${
          requestLocked && !isThisAccepted
            ? 'opacity-70 pointer-events-none'
            : ''
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm sm:text-base font-semibold text-slate-900">
            Entscheidung treffen
          </div>
          {showLockedHint && (
            <div className="text-[10px] text-amber-700">
              Für diese Anfrage wurde bereits eine andere Bewerbung angenommen.
            </div>
          )}
        </div>

        <p className="text-[10px] sm:text-xs text-slate-500">
          Mit der Annahme bestätigen Sie, dass Sie mit diesem Partner
          zusammenarbeiten möchten. Ihre Anfrage wird entsprechend markiert.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <form
            action={`/api/konsument/applications/${appRow.id}/decision`}
            method="post"
          >
            <input type="hidden" name="action" value="accept" />
            <input type="hidden" name="request_id" value={requestId} />
            <button
              disabled={requestLocked && !isThisAccepted}
              className="rounded-2xl bg-slate-900 px-4 py-1.5 text-xs sm:text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-40"
            >
              Bewerbung annehmen
            </button>
          </form>

          <form
            action={`/api/konsument/applications/${appRow.id}/decision`}
            method="post"
          >
            <input type="hidden" name="action" value="decline" />
            <input type="hidden" name="request_id" value={requestId} />
            <button
              disabled={requestLocked && !isThisAccepted}
              className="rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-1.5 text-xs sm:text-sm font-medium text-rose-600 shadow-sm hover:bg-rose-50 hover:shadow disabled:opacity-40"
            >
              Ablehnen
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}

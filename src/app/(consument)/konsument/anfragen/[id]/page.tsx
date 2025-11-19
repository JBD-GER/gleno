// src/app/(consument)/konsument/anfragen/[id]/page.tsx

import { redirect, notFound } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import EditMarketRequestForm from './EditMarketRequestForm'
import RightPanel from './RightPanel'

export const dynamic = 'force-dynamic'

type Req = {
  id: string
  user_id: string
  status: string
  branch: string | null
  category: string | null
  city: string | null
  zip: string | null
  urgency: string | null
  execution: 'vorOrt' | 'digital' | string | null
  budget_min: number | null
  budget_max: number | null
  request_text: string
  summary: string | null
  recommendations: any | null
  created_at: string
  updated_at: string
  applications_count: number | null
}

type PartnerLite = {
  id: string
  display_name: string | null
  company_name: string | null
  city: string | null
  website: string | null
  logo_path: string | null
} | null

type ApplicantLite = {
  id: string
  partner_id: string | null
  partner_name: string | null
  created_at: string
  note: string | null
  status: string | null
}

/* ---------- Helpers ---------- */

function normalizeStatus(s?: string | null) {
  const v = (s || '').trim().toLowerCase()
  switch (v) {
    case 'geloescht':
    case 'gelöscht':
      return 'Gelöscht'
    case 'aktiv':
      return 'Aktiv'
    case 'termin_angelegt':
      return 'Termin angelegt'
    case 'termin_bestaetigt':
      return 'Termin bestätigt'
    case 'auftrag_erstellt':
    case 'auftrag_angelegt':
      return 'Auftrag erstellt'
    case 'auftrag_bestaetigt':
      return 'Auftrag bestätigt'
    case 'rechnungsphase':
      return 'Rechnungsphase'
    case 'abgeschlossen':
      return 'Abgeschlossen'
    case 'feedback':
      return 'Feedback'
    case 'problem':
      return 'Problem'
    case 'anfrage':
    default:
      return 'Anfrage'
  }
}

function statusBadgeCls(raw: string) {
  const v = (raw || '').toLowerCase()
  const base =
    'inline-flex items-center justify-center rounded-full px-3 py-0.5 text-[10px] font-semibold text-white'
  if (v === 'geloescht' || v === 'gelöscht') return `${base} bg-slate-400`
  if (v === 'problem') return `${base} bg-rose-600`
  if (v === 'aktiv') return `${base} bg-emerald-600`
  if (v === 'termin_angelegt') return `${base} bg-amber-500`
  if (v === 'termin_bestaetigt') return `${base} bg-indigo-600`
  if (v === 'auftrag_erstellt' || v === 'auftrag_angelegt') return `${base} bg-sky-600`
  if (v === 'auftrag_bestaetigt') return `${base} bg-emerald-700`
  if (v === 'rechnungsphase') return `${base} bg-violet-600`
  if (v === 'abgeschlossen') return `${base} bg-slate-900`
  if (v === 'feedback') return `${base} bg-fuchsia-600`
  return `${base} bg-[#0a1b40]`
}

function titleOf(req: Req) {
  if (req.summary && req.summary.trim()) return req.summary.trim()
  const t = (req.request_text || '')
    .split('\n')
    .map((s) => s.trim())
    .find(Boolean)
  return t || 'Anfrage bearbeiten'
}

function executionLabel(v: Req['execution']) {
  if (!v) return null
  const x = String(v).toLowerCase()
  if (x === 'vorort' || x === 'vor-ort' || x === 'vor_ort' || v === 'vorOrt') return 'Vor Ort'
  if (x === 'digital') return 'Digital'
  return v
}

/* ---------- Page ---------- */

export default async function AnfrageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await supabaseServer()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Anfrage laden – inkl. applications_count
  const { data, error } = await supabase
    .from('market_requests')
    .select(
      'id, user_id, status, branch, category, city, zip, urgency, execution, budget_min, budget_max, request_text, summary, recommendations, created_at, updated_at, applications_count'
    )
    .eq('id', id)
    .eq('user_id', session.user.id)
    .single()

  if (error || !data) {
    return notFound()
  }

  const req = data as Req
  const activePartner: PartnerLite = null
  const statusLabel = normalizeStatus(req.status)

  // Bewerbungen (Kurzliste) – message_text statt note
  const { data: apps } = await supabase
    .from('market_applications')
    .select(
      `
      id,
      status,
      created_at,
      message_text,
      partner_id,
      partner:partners(display_name, company_name)
    `
    )
    .eq('request_id', id)
    .order('created_at', { ascending: false })

  const applicants: ApplicantLite[] = (apps || []).map((a: any) => ({
    id: a.id,
    partner_id: a.partner_id ?? null,
    partner_name: a?.partner?.display_name || a?.partner?.company_name || null,
    created_at: a.created_at,
    note: a.message_text ?? null,
    status: a.status ?? null,
  }))

  // 🔢 Bewerbungszahl: gespeicherter Zähler vs. live gezählt
  const liveCount = applicants.length
  const storedCount = req.applications_count ?? 0
  const applicantsCount = Math.max(storedCount, liveCount)

  return (
    <section className="relative mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10">
      {/* Background */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-28vh] -z-10 h-[130vh] w-[180vw] -translate-x-1/2"
        style={{
          background:
            'radial-gradient(1200px 480px at 50% 0%, rgba(10,27,64,0.06), transparent),radial-gradient(900px 420px at 12% 10%, rgba(10,27,64,0.04), transparent),radial-gradient(900px 420px at 88% 8%, rgba(10,27,64,0.04), transparent)',
        }}
      />

      {/* Header Card */}
      <div className="rounded-3xl border border-white/70 bg-white/90 px-5 sm:px-7 py-5 sm:py-6 shadow-[0_22px_70px_rgba(15,23,42,0.11)] backdrop-blur-2xl ring-1 ring-white/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[10px] font-medium text-slate-700 ring-1 ring-white/70">
              <span className={statusBadgeCls(req.status)}>{statusLabel}</span>
              <span className="text-slate-600">
                Anfrage-ID:{' '}
                <span className="font-semibold">{req.id.slice(0, 8)}</span>
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>
                Erstellt am{' '}
                {new Date(req.created_at).toLocaleDateString('de-DE')}
              </span>
              {req.updated_at && (
                <>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>
                    Aktualisiert am{' '}
                    {new Date(req.updated_at).toLocaleDateString('de-DE')}
                  </span>
                </>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
              {titleOf(req)}
            </h1>

            <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs text-slate-600">
              {req.branch && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50/90 px-2.5 py-1 ring-1 ring-slate-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  {req.branch}
                  {req.category ? ` · ${req.category}` : ''}
                </span>
              )}
              {(req.city || req.zip) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50/90 px-2.5 py-1 ring-1 ring-slate-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  {[req.zip, req.city].filter(Boolean).join(' ')}
                </span>
              )}
              {executionLabel(req.execution) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50/90 px-2.5 py-1 ring-1 ring-slate-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Modus: {executionLabel(req.execution)}
                </span>
              )}
              {(req.budget_min || req.budget_max) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50/90 px-2.5 py-1 ring-1 ring-slate-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Budget:{' '}
                  {req.budget_min
                    ? `${req.budget_min.toLocaleString('de-DE')} €`
                    : '—'}{' '}
                  {req.budget_max &&
                    `– ${req.budget_max.toLocaleString('de-DE')} €`}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50/90 px-2.5 py-1 ring-1 ring-slate-100">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                Bewerbungen: {applicantsCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Edit Form */}
        <div className="lg:col-span-2">
          <div className="rounded-3xl border border-white/70 bg-white/92 px-4 sm:px-5 py-4 sm:py-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl ring-1 ring-white/60">
            <EditMarketRequestForm
              initial={req}
              activePartner={activePartner}
              applicants={applicants}
              applicantsCount={applicantsCount}
            />
          </div>
        </div>

        {/* Right: Info / Aktionen */}
        <div className="space-y-4">
          <RightPanel
            requestId={req.id}
            activePartner={activePartner}
            createdAt={req.created_at}
            updatedAt={req.updated_at}
          />
        </div>
      </div>
    </section>
  )
}

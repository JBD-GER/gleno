// src/app/(consumer)/konsument/chat/page.tsx
import Link from 'next/link'
import { headers } from 'next/headers'

type Item = {
  conversation_id: string
  request_id: string
  updated_at: string
  request: {
    id: string
    status: string | null
    summary: string | null
    category: string | null
    city: string | null
    zip: string | null
    created_at: string
  } | null
  partner: {
    id: string
    display: string
    logo_path: string | null
    city: string | null
  } | null
}

async function loadItems(): Promise<{ ok: boolean; items?: Item[]; error?: string }> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  if (!host) return { ok: false, error: 'no_host_header' }
  const base = `${proto}://${host}`
  const cookie = h.get('cookie') ?? ''
  const res = await fetch(`${base}/api/konsument/chat/list`, { headers: { cookie }, cache: 'no-store' })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, error: j?.error || res.statusText }
  return { ok: true, items: j.items as Item[] }
}

function StatusBadge({ value }: { value?: string | null }) {
  const v = (value ?? '').toLowerCase()
  const map: Record<string, string> = {
    'anfrage': 'bg-slate-100 text-slate-700 ring-slate-200',
    'aktiv': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    'gelöscht': 'bg-rose-50 text-rose-700 ring-rose-200',
    'geloescht': 'bg-rose-50 text-rose-700 ring-rose-200',
  }
  const cls = map[v] ?? 'bg-slate-100 text-slate-700 ring-slate-200'
  const label = value || '—'
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ring-1 ${cls}`}>{label}</span>
}

export default async function ConsumerChatIndexPage() {
  const { ok, items, error } = await loadItems()

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Chats</h1>
        <Link href="/konsument/anfragen" className="inline-flex items-center rounded-xl border border-white/60 bg-white px-3 py-2 text-sm shadow hover:shadow-sm">
          Zu meinen Anfragen
        </Link>
      </div>

      {!ok && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          Fehler: {error}
        </div>
      )}

      {ok && (items?.length ?? 0) === 0 && (
        <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-6 shadow-[0_10px_34px_rgba(2,6,23,0.07)]">
          <div className="text-slate-900 font-medium">Noch kein Chat aktiviert</div>
          <p className="mt-1 text-sm text-slate-600">
            Ein Chat startet automatisch, sobald Sie eine Bewerbung zu Ihrer Anfrage <strong>annehmen</strong>.
          </p>
          <ul className="mt-3 text-sm text-slate-600 list-disc pl-5 space-y-1">
            <li>Öffnen Sie eine Ihrer Anfragen.</li>
            <li>Prüfen Sie die Bewerbungen und klicken Sie auf <em>„Annehmen“</em>.</li>
            <li>Danach erscheint der Chat hier &amp; unter der Anfrage.</li>
          </ul>
          <div className="mt-4">
            <Link href="/konsument/anfragen" className="inline-flex items-center rounded-lg bg-slate-900 text-white px-3 py-1.5 text-sm hover:opacity-90">
              Zu meinen Anfragen
            </Link>
          </div>
        </div>
      )}

      {ok && (items?.length ?? 0) > 0 && (
        <div className="space-y-3">
          {items!.map((it) => (
            <div key={it.conversation_id} className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-4 shadow-[0_10px_34px_rgba(2,6,23,0.07)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusBadge value={it.request?.status ?? ''} />
                    <span className="text-xs text-slate-500">req #{it.request_id.slice(0, 8)}</span>
                    <span className="text-xs text-slate-400">· zuletzt: {new Date(it.updated_at).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-900">
                    {it.request?.summary || 'Ohne Kurzbeschreibung'}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {[
                      it.request?.category,
                      [it.request?.zip, it.request?.city].filter(Boolean).join(' '),
                      it.partner?.display ? `Partner: ${it.partner.display}` : '',
                    ].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div className="shrink-0">
                  <Link href={`/konsument/chat/${it.request_id}`} className="inline-flex items-center rounded-lg bg-slate-900 text-white px-3 py-1.5 text-sm hover:opacity-90">
                    Chat öffnen
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

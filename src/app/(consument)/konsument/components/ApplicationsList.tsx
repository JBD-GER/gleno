'use client'

import Link from 'next/link'
import React, { useEffect, useState } from 'react'

type PartnerLite = {
  id: string
  display_name: string | null
  company_name: string | null
  city: string | null
  website: string | null
  logo_path: string | null
}

type ApplicationLite = {
  id: string
  status: 'eingereicht' | 'angenommen' | 'abgelehnt' | string
  created_at: string
  partner: PartnerLite | PartnerLite[] | null
}

function pickPartner(p: ApplicationLite['partner']): PartnerLite | null {
  if (!p) return null
  return Array.isArray(p) ? (p[0] ?? null) : p
}

export default function ApplicationsList({
  requestId,
  limit,
  onLoaded,
}: {
  requestId: string
  limit?: number
  onLoaded?: (count: number) => void
}) {
  const [items, setItems] = useState<ApplicationLite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  async function load() {
    setLoading(true); setError('')
    const url = `/api/konsument/requests/${encodeURIComponent(requestId)}/applications`
    try {
      console.debug('[ApplicationsList] fetch ->', url)
      const res = await fetch(url, {
        cache: 'no-store',
        credentials: 'same-origin',   // <-- WICHTIG: Cookies explizit mitsenden
        headers: { 'Accept': 'application/json' },
      })

      const ct = res.headers.get('content-type') || ''
      const hit = res.headers.get('x-route-hit') || ''
      console.debug('[ApplicationsList] status:', res.status, '| x-route-hit:', hit, '| ct:', ct)

      if (!ct.includes('application/json')) {
        const txt = await res.text()
        throw new Error(res.ok
          ? 'Unerwartete Antwort (kein JSON).'
          : `HTTP ${res.status}${txt ? `: ${txt.slice(0,120)}…` : ''}`)
      }

      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'load_failed')

      const arr = Array.isArray(j.items) ? j.items : []
      setItems(limit ? arr.slice(0, limit) : arr)
      onLoaded?.(arr.length)
    } catch (e: any) {
      console.error('[ApplicationsList] load error:', e)
      setError(e?.message || 'Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [requestId, limit])

  if (loading) return <div className="text-sm text-slate-600">Lade Bewerbungen …</div>
  if (error)   return <div className="text-sm text-rose-600">Fehler: {error}</div>
  if (items.length === 0) return <div className="text-sm text-slate-600">Noch keine Bewerbungen.</div>

  return (
    <div className="space-y-3">
      {items.map(a => {
        const p = pickPartner(a.partner)
        const label = a.status === 'angenommen' ? 'Angenommen'
          : a.status === 'abgelehnt' ? 'Abgelehnt'
          : 'Eingereicht'
        return (
          <div key={a.id} className="rounded-2xl border border-white/60 bg-white/80 p-4 ring-1 ring-white/60">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-slate-900 truncate">
                  {p?.display_name || p?.company_name || 'Partner'}
                  {p?.city ? ` · ${p.city}` : ''}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Status: {label} · {new Date(a.created_at).toLocaleString('de-DE')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/konsument/anfragen/${requestId}/bewerbungen/${a.id}`}
                  className="inline-flex items-center rounded-lg bg-slate-900 text-white px-3 py-1.5 text-sm hover:opacity-90"
                >
                  Aufrufen
                </Link>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

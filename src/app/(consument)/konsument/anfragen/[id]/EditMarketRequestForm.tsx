'use client'

import React, { useState } from 'react'
import ApplicationsList from '../../components/ApplicationsList'

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

function normalizeStatusLabel(s: string) {
  const v = (s || '').toLowerCase()
  if (v === 'geloescht' || v === 'gelöscht') return 'Gelöscht'
  if (v === 'anfrage') return 'Anfrage'
  if (v === 'termin_angelegt') return 'Termin angelegt'
  if (v === 'aktiv')              return 'Aktiv'
  if (v === 'termin_bestaetigt') return 'Termin bestätigt'
  if (v === 'auftrag_erstellt' || v === 'auftrag_angelegt') return 'Auftrag erstellt'
  if (v === 'auftrag_bestaetigt') return 'Auftrag bestätigt'
  if (v === 'rechnungsphase') return 'Rechnungsphase'
  if (v === 'abgeschlossen') return 'Abgeschlossen'
  if (v === 'feedback') return 'Feedback'
  if (v === 'problem') return 'Problem'
  return 'Anfrage'
}
function statusBadgeCls(s: string) {
  const v = (s || '').toLowerCase()
  const base = 'rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-white/60 text-white'
  if (v === 'geloescht' || v === 'gelöscht') return `${base} bg-slate-400`
  if (v === 'problem')            return `${base} bg-rose-600`
    if (v === 'aktiv')              return `${base} bg-green-600`
  if (v === 'termin_angelegt')    return `${base} bg-amber-500`
  if (v === 'termin_bestaetigt')  return `${base} bg-indigo-600`
  if (v === 'auftrag_erstellt' || v === 'auftrag_angelegt') return `${base} bg-sky-600`
  if (v === 'auftrag_bestaetigt') return `${base} bg-emerald-600`
  if (v === 'rechnungsphase')     return `${base} bg-violet-600`
  if (v === 'abgeschlossen')      return `${base} bg-slate-800`
  if (v === 'feedback')           return `${base} bg-fuchsia-600`
  return `${base} bg-[#0a1b40]`
}

export default function EditMarketRequestForm({
  initial,
  activePartner = null,
  applicants = [],
  applicantsCount = 0,
}: {
  initial: Req
  activePartner?: PartnerLite
  applicants?: ApplicantLite[] // optional (wird nicht mehr gerendert, aber kompatibel)
  applicantsCount?: number     // initialer Count (optional)
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string>('')

  const [localStatus, setLocalStatus] = useState(initial.status || 'anfrage')
  const [summary, setSummary] = useState(initial.summary || '')
  const [city, setCity] = useState(initial.city || '')
  const [zip, setZip] = useState(initial.zip || '')
  const [urgency, setUrgency] = useState(initial.urgency || '')
  const [execution, setExecution] = useState<'vorOrt' | 'digital'>(
    initial.execution === 'vorOrt' ? 'vorOrt' : 'digital'
  )
  const [budgetMin, setBudgetMin] = useState<string>(initial.budget_min != null ? String(initial.budget_min) : '')
  const [budgetMax, setBudgetMax] = useState<string>(initial.budget_max != null ? String(initial.budget_max) : '')
  const [isEditingText, setIsEditingText] = useState(false)
  const [requestText, setRequestText] = useState(initial.request_text || '')

  // Bewerbungen: Count kommt live aus ApplicationsList
  const [shortApplicantsCount, setShortApplicantsCount] = useState<number>(applicantsCount || 0)

  const isDeleted =
    (localStatus || '').toLowerCase() === 'geloescht' ||
    (localStatus || '').toLowerCase() === 'gelöscht'

  function parseEuroInput(v: string): number | null {
    const n = v.replace(/\./g, '').replace(/,/, '.').replace(/[^\d.]/g, '')
    const num = Number(n)
    return Number.isFinite(num) && num >= 0 ? Math.round(num) : null
  }
  function toEuro(v: number | null) {
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return `${Math.round(v).toLocaleString('de-DE')} €`
    return '—'
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing || isDeleted) return
    setSaving(true)
    try {
      const payload = {
        summary: summary || null,
        city: city || null,
        zip: zip || null,
        urgency: urgency || null,
        execution,
        budget_min: parseEuroInput(budgetMin),
        budget_max: parseEuroInput(budgetMax),
        request_text: requestText,
      }
      const res = await fetch(`/api/markt/leads/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'save_failed')
      setToast('Gespeichert ✅')
      setEditing(false)
      setIsEditingText(false)
      setTimeout(() => setToast(''), 1800)
    } catch {
      setToast('Fehler beim Speichern ❌')
      setTimeout(() => setToast(''), 2200)
    } finally {
      setSaving(false)
    }
  }

  const [confirmDelete, setConfirmDelete] = useState(false)
  async function markAsDeleted() {
    if (isDeleted) return
    setSaving(true)
    try {
      const res = await fetch(`/api/markt/leads/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'geloescht' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'delete_failed')
      setLocalStatus('geloescht')
      setToast('Als gelöscht markiert ✅')
      setEditing(false)
      setIsEditingText(false)
      setConfirmDelete(false)
      setTimeout(() => setToast(''), 2200)
    } catch {
      setToast('Konnte nicht löschen ❌')
      setTimeout(() => setToast(''), 2200)
    } finally {
      setSaving(false)
    }
  }

  function RequestRenderer({ text }: { text: string }) {
    const lines = (text || '').split('\n')
    const idxIntro = lines.findIndex((l) => /^ *anfrage\s*–\s*einleitung/i.test(l))
    const idxScope = lines.findIndex((l) => /^ *leistungsumfang\s*–\s*stichpunkte/i.test(l))
    if (idxIntro === -1 || idxScope === -1) {
      return (
        <div className="leading-relaxed">
          <h3 className="font-semibold text-slate-900">Anfrage</h3>
          <p className="mt-1 text-[15px] whitespace-pre-line">{text}</p>
        </div>
      )
    }
    const intro = lines.slice(idxIntro + 1, idxScope).join('\n').trim()
    const bullets = lines.slice(idxScope + 1).map((l) => l.replace(/^-\s*/, '')).filter((l) => l.trim().length > 0)
    return (
      <div className="leading-relaxed">
        <h3 className="font-semibold text-slate-900">Anfrage – Einleitung</h3>
        <p className="mt-1 text-[15px] whitespace-pre-line">{intro}</p>
        <h4 className="mt-4 font-semibold text-slate-900">Leistungsumfang – Stichpunkte</h4>
        <ul className="mt-1 list-disc pl-5 text-[15px] space-y-1">
          {bullets.map((b, i) => (<li key={i}>{b}</li>))}
        </ul>
      </div>
    )
  }

  const inputCls = 'w-full rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400/40'
  const card = `rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl p-6 shadow-[0_10px_34px_rgba(2,6,23,0.07)] ring-1 ring-white/60 ${isDeleted ? 'opacity-60 grayscale' : ''}`
  const badge = 'rounded-full border border-white/60 bg-white/80 px-2 py-0.5 text-xs text-slate-700'

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {toast && <div className="rounded-xl bg-emerald-600 text-white text-sm px-4 py-2 shadow">{toast}</div>}

      {/* Info-Kacheln */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={card}>
          <div className="text-xs text-slate-500">Status</div>
          <div className="mt-1">
            <span className={statusBadgeCls(localStatus)}>{normalizeStatusLabel(localStatus)}</span>
          </div>
        </div>
        <div className={card}>
          <div className="text-xs text-slate-500">Branche</div>
          <div className="mt-1 text-sm font-medium text-slate-900">{initial.branch || '—'}</div>
        </div>
        <div className={card}>
          <div className="text-xs text-slate-500">Ausführung</div>
          {!editing ? (
            <div className="mt-1"><span className={badge}>{execution === 'vorOrt' ? 'Vor Ort' : 'Digital'}</span></div>
          ) : (
            <select className={inputCls} value={execution} onChange={e => setExecution(e.target.value as 'vorOrt' | 'digital')} disabled={isDeleted}>
              <option value="digital">Digital</option>
              <option value="vorOrt">Vor Ort</option>
            </select>
          )}
        </div>
      </div>

      {/* Stammdaten */}
      <div className={card}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-lg font-medium text-slate-900">Details</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(v => !v)}
              className="rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-50"
              disabled={isDeleted || saving}
              title="Anfrage als gelöscht markieren"
            >
              Löschen
            </button>

            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-xl border border-slate-900/20 bg-white px-3 py-1.5 text-sm text-slate-900 hover:border-slate-900/35 disabled:opacity-50"
                disabled={isDeleted}
              >
                Bearbeiten
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSummary(initial.summary || '')
                    setCity(initial.city || '')
                    setZip(initial.zip || '')
                    setUrgency(initial.urgency || '')
                    setExecution(initial.execution === 'vorOrt' ? 'vorOrt' : 'digital')
                    setBudgetMin(initial.budget_min != null ? String(initial.budget_min) : '')
                    setBudgetMax(initial.budget_max != null ? String(initial.budget_max) : '')
                    setRequestText(initial.request_text || '')
                    setIsEditingText(false)
                    setEditing(false)
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:shadow"
                >
                  Abbrechen
                </button>
                <button
                  disabled={saving}
                  className={`rounded-xl bg-slate-900 px-4 py-2 text-sm text-white ${saving ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'}`}
                >
                  {saving ? 'Speichere…' : 'Speichern'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Inline-Confirm Löschen */}
        {confirmDelete && !isDeleted && (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>Diese Anfrage wird als <b>„Gelöscht“</b> markiert. Bewerbungen/Nachrichten sind dann nicht mehr möglich.</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100"
                  disabled={saving}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={markAsDeleted}
                  className="rounded-xl bg-rose-600 px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-60"
                  disabled={saving}
                >
                  Als gelöscht markieren
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Felder */}
        <div className="mt-4">
          <label className="block text-sm text-slate-600 mb-1">Titel / Summary</label>
          {!editing ? (
            <div className="rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm">{summary || '—'}</div>
          ) : (
            <input className={inputCls} value={summary} onChange={e => setSummary(e.target.value)} disabled={isDeleted} />
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Stadt</label>
            {!editing ? (
              <div className="rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm">{city || '—'}</div>
            ) : (
              <input className={inputCls} value={city} onChange={e => setCity(e.target.value)} placeholder="z. B. Köln" disabled={isDeleted} />
            )}
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">PLZ</label>
            {!editing ? (
              <div className="rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm">{zip || '—'}</div>
            ) : (
              <input className={inputCls} value={zip} onChange={e => setZip(e.target.value)} placeholder="z. B. 50933" disabled={isDeleted} />
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Dringlichkeit</label>
            {!editing ? (
              <div className="rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm">{urgency || '—'}</div>
            ) : (
              <input className={inputCls} value={urgency} onChange={e => setUrgency(e.target.value)} placeholder="z. B. hoch / normal / niedrig" disabled={isDeleted} />
            )}
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Ausführung</label>
            {!editing ? (
              <div className="rounded-2xl border border-white/60 bg-white/80 px-3 py-2 text-sm">{execution === 'vorOrt' ? 'Vor Ort' : 'Digital'}</div>
            ) : (
              <select className={inputCls} value={execution} onChange={e => setExecution(e.target.value as 'vorOrt' | 'digital')} disabled={isDeleted}>
                <option value="digital">Digital</option>
                <option value="vorOrt">Vor Ort</option>
              </select>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Budget min</label>
            {!editing ? (
              <div className="rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm">{toEuro(parseEuroInput(budgetMin))}</div>
            ) : (
              <input className={inputCls} value={budgetMin} onChange={e => setBudgetMin(e.target.value)} placeholder="z. B. 1.200" disabled={isDeleted} />
            )}
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Budget max</label>
            {!editing ? (
              <div className="rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm">{toEuro(parseEuroInput(budgetMax))}</div>
            ) : (
              <input className={inputCls} value={budgetMax} onChange={e => setBudgetMax(e.target.value)} placeholder="z. B. 3.000" disabled={isDeleted} />
            )}
          </div>
        </div>
      </div>

      {/* Anfrage-Text */}
      <div className={card}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg font-medium text-slate-900">Anfrage-Text</div>
          {editing && !isDeleted && (
            !isEditingText ? (
              <button type="button" onClick={() => setIsEditingText(true)} className="text-xs underline hover:no-underline hover:opacity-90">Bearbeiten</button>
            ) : (
              <button type="button" onClick={() => setIsEditingText(false)} className="text-xs underline hover:no-underline hover:opacity-90">Fertig</button>
            )
          )}
        </div>

        {!isEditingText ? (
          <div className="mt-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4">
            <RequestRenderer text={requestText} />
          </div>
        ) : (
          <textarea className={`${inputCls} mt-3 min-h-[200px]`} value={requestText} onChange={(e) => setRequestText(e.target.value)} disabled={isDeleted} />
        )}
      </div>

      {/* Bewerber – Kurz (mit Count) */}
      <div className={card}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg font-medium text-slate-900">Bewerber (Kurz)</div>
          <div className="text-xs text-slate-600">{shortApplicantsCount} Bewerber</div>
        </div>

        <div className="mt-3">
          <ApplicationsList
            requestId={initial.id}
            limit={5}
            onLoaded={(cnt) => setShortApplicantsCount(cnt)}
          />
        </div>
      </div>

      {/* Sticky Save */}
      {editing && !isDeleted && (
        <div className="lg:hidden fixed left-0 right-0 bottom-4 px-6">
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-900/10 bg-white/90 shadow-lg backdrop-blur-xl p-3 flex items-center justify-between">
            <span className="text-sm text-slate-800">Änderungen noch nicht gespeichert</span>
            <button
              disabled={saving}
              className={`rounded-xl bg-slate-900 px-4 py-2 text-sm text-white ${saving ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'}`}
              onClick={(e) => onSubmit(e as any)}
            >
              {saving ? 'Speichere…' : 'Speichern'}
            </button>
          </div>
        </div>
      )}
    </form>
  )
}

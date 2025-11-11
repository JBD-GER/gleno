'use client'

import { useState } from 'react'

type PartnerLite = {
  id: string
  display_name: string | null
  company_name: string | null
  city: string | null
  website: string | null
  logo_path: string | null
} | null

export default function RightPanel({
  requestId,
  activePartner,
  createdAt,
  updatedAt,
}: {
  requestId: string
  activePartner: PartnerLite
  createdAt: string
  updatedAt: string
}) {
  const [showForm, setShowForm] = useState(false)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [toast, setToast] = useState<string>('')

  async function submitProblem() {
    if (!note || note.trim().length < 5) {
      setToast('Bitte beschreibe das Problem (mind. 5 Zeichen).')
      setTimeout(() => setToast(''), 2000)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/markt/leads/${requestId}/problem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'failed')

      setSubmitted(true)
      setShowForm(false)
      setToast('Problem gemeldet ✅ – wir melden uns zeitnah.')
      setTimeout(() => setToast(''), 2500)

      // Optional: Badge oben sofort aktualisieren
      setTimeout(() => { if (typeof window !== 'undefined') window.location.reload() }, 800)
    } catch {
      setToast('Fehler beim Melden ❌')
      setTimeout(() => setToast(''), 2200)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {toast && (
        <div className="rounded-xl bg-emerald-600 text-white text-sm px-4 py-2 shadow">{toast}</div>
      )}

      {/* Aktiver Partner */}
      <div className="rounded-3xl border border-white/60 bg-white/70 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-[0_10px_34px_rgba(2,6,23,0.07)]">
        <div className="text-sm font-semibold text-slate-900">Aktiver Partner</div>
        {!activePartner ? (
          <div className="mt-2 text-sm text-slate-600">
            Noch kein Partner aktiv. Akzeptiere zuerst einen Bewerber – danach wird der aktive Partner hier angezeigt.
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/80 border border-white/60 overflow-hidden flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {activePartner.logo_path ? (
                <img alt="" src={activePartner.logo_path} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-slate-500">Logo</span>
              )}
            </div>
            <div className="text-sm">
              <div className="font-medium text-slate-900">
                {activePartner.display_name || activePartner.company_name || 'Partner'}
              </div>
              <div className="text-slate-600">{activePartner.city || '—'}</div>
              {activePartner.website && (
                <a href={activePartner.website} target="_blank" rel="noreferrer" className="text-xs underline text-slate-700">
                  Website
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Problem melden (Inline statt Popup) */}
      <div className="rounded-3xl border border-white/60 bg-white/70 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-[0_10px_34px_rgba(2,6,23,0.07)]">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">Problem melden</div>
          {!showForm && !submitted && (
            <button
              onClick={() => setShowForm(true)}
              className="rounded-xl border border-slate-900/20 bg-white px-3 py-1.5 text-sm text-slate-900 hover:border-slate-900/35"
            >
              Problem melden
            </button>
          )}
        </div>

        {/* Beschreibung */}
        {!showForm && !submitted && (
          <p className="mt-2 text-sm text-slate-600">
            Beschreibe kurz, was nicht passt. Wir setzen uns mit dem Partner in Verbindung
            und vereinbaren im Nachgang ein gemeinsames Klärungsgespräch (Zoom-Meeting).
          </p>
        )}

        {/* Inline-Form */}
        {showForm && (
          <div className="mt-3">
            <textarea
              className="w-full min-h-[140px] rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
              placeholder="Beschreibe hier dein Problem…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:justify-end">
              <button
                onClick={() => { setShowForm(false); setNote('') }}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:shadow"
                disabled={submitting}
              >
                Abbrechen
              </button>
              <button
                onClick={submitProblem}
                disabled={submitting}
                className={`rounded-xl bg-slate-900 px-4 py-2 text-sm text-white ${submitting ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'}`}
              >
                {submitting ? 'Sende…' : 'Senden'}
              </button>
            </div>
          </div>
        )}

        {/* Erfolgszustand */}
        {submitted && !showForm && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-900">
            Problem wurde gemeldet. Wir setzen uns mit dem Partner in Verbindung und melden uns
            mit einem Zoom-Termin zur Klärung.
          </div>
        )}
      </div>

      {/* System-Info */}
      <div className="rounded-3xl border border-white/60 bg-white/70 p-4 backdrop-blur-xl ring-1 ring-white/60 text-xs text-slate-600">
        ID: <span className="font-mono">{requestId}</span><br/>
        Erstellt: {new Date(createdAt).toLocaleString('de-DE')}<br/>
        Geändert: {new Date(updatedAt).toLocaleString('de-DE')}
      </div>
    </>
  )
}

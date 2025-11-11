'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  requestId: string
  partnerId?: string
  /** Wird nach erfolgreichem Absenden (nach dem POST + ggf. Upload) aufgerufen */
  onSuccess?: () => void
}

type MyPartner = {
  id: string
  status: string
  display_name: string | null
  company_name: string | null
  city: string | null
  branch_id: string | null
}

/* ---------- UI Tokens ---------- */
const overlay =
  'fixed inset-0 z-[100] bg-slate-900/55 backdrop-blur-sm flex items-center justify-center p-4'
const panel =
  'w-full max-w-xl md:max-w-2xl rounded-2xl border border-white/60 bg-white/95 ring-1 ring-white/60 shadow-[0_24px_72px_rgba(2,6,23,0.35)] overflow-hidden'
const header =
  'px-5 py-4 border-b border-white/60 bg-white/70 backdrop-blur flex items-center justify-between'
const body =
  'px-5 py-4 max-h-[70vh] overflow-auto'
const footer =
  'px-5 py-4 border-t border-white/60 bg-white/70 backdrop-blur flex items-center justify-between'

const btnGhost =
  'inline-flex items-center gap-2 rounded-xl border border-white/60 bg-white/85 backdrop-blur px-3 py-2 text-sm text-slate-900 shadow-sm hover:shadow transition'
const btnPrimary =
  'inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-3 py-2 text-sm shadow hover:opacity-90 disabled:opacity-50'
const chip =
  'inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border border-slate-200/70 bg-white/80 text-xs text-slate-800'

export default function ApplyModal({ open, onClose, requestId, partnerId, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [partnersLoading, setPartnersLoading] = useState(false)
  const [partners, setPartners] = useState<MyPartner[]>([])
  const [activePartnerId, setActivePartnerId] = useState<string>('')

  const [message, setMessage] = useState<string>('')
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>('')

  // ===== helpers for multi-file UX =====
  const MAX_MB_PER_FILE = 15
  const ACCEPTED = ['application/pdf','image/png','image/jpeg']

  function fmtSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024*1024) return `${Math.round(bytes/1024)} KB`
    return `${(bytes/1024/1024).toFixed(1)} MB`
  }

  function addFiles(list: File[]) {
    const filtered = list.filter(f => ACCEPTED.includes(f.type))
    const tooBig = filtered.find(f => f.size > MAX_MB_PER_FILE*1024*1024)
    if (tooBig) {
      setError(`Datei zu groß: ${tooBig.name} (> ${MAX_MB_PER_FILE} MB)`)
      return
    }
    // Anhängen statt ersetzen; Duplikate nach Name+Size herausfiltern
    setFiles(prev => {
      const map = new Map(prev.map(f => [f.name + '|' + f.size, f]))
      for (const f of filtered) map.set(f.name + '|' + f.size, f)
      return Array.from(map.values())
    })
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files || []))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    addFiles(Array.from(e.dataTransfer.files || []))
  }

  // Scroll-Lock & ESC
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onEsc)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onEsc) }
  }, [open, onClose])

  // Reset & Partner laden
  useEffect(() => {
    if (!open) return
    setStep(1); setMessage(''); setFiles([]); setError('')

    let canceled = false
    ;(async () => {
      if (partnerId) setActivePartnerId(partnerId)
      try {
        setPartnersLoading(true)
        const res = await fetch('/api/partners/mine', { cache: 'no-store' })
        const j = await res.json()
        if (!res.ok) throw new Error(j?.error || 'load_failed')
        if (canceled) return
        const list = (j?.partners || []) as MyPartner[]
        setPartners(list)
        if (partnerId && list.some(p => p.id === partnerId)) setActivePartnerId(partnerId)
        else if (!partnerId) setActivePartnerId(list[0]?.id ?? '')
        else if (partnerId && !list.some(p => p.id === partnerId)) setActivePartnerId(list[0]?.id ?? '')
      } catch (e: any) {
        if (!canceled) setError(e?.message || 'Konnte Partner nicht laden')
      } finally {
        if (!canceled) setPartnersLoading(false)
      }
    })()
    return () => { canceled = true }
  }, [open, partnerId])

  useEffect(() => { if (open && partnerId) setActivePartnerId(partnerId) }, [open, partnerId])

  const activePartner = useMemo(
    () => partners.find(p => p.id === activePartnerId) || null,
    [partners, activePartnerId]
  )

  const canStep1 = Boolean(activePartnerId) && !partnersLoading
  const totalBytes = files.reduce((a,f)=>a+f.size,0)

  async function handleSubmit() {
    if (!activePartnerId) { setError('Bitte wähle einen Partner.'); return }
    setSubmitting(true); setError('')
    try {
      // Bewerbung anlegen (deutscher Status wird in der API gesetzt)
      const res = await fetch('/api/partners/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          partner_id: activePartnerId,
          // Du sendest HTML – API akzeptiert message_html (ansonsten message_text senden)
          message_html: message || null
        })
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'submit_failed')
      const applicationId: string = j.id

      // Dateien hochladen (optional)
      if (files.length > 0) {
        const form = new FormData()
        // (application_id wird serverseitig aus der URL gelesen, hier optional)
        form.set('application_id', applicationId)
        files.forEach(f => form.append('files', f))
        const up = await fetch(`/api/partners/applications/${applicationId}/upload`, { method: 'POST', body: form })
        const uj = await up.json()
        if (!up.ok) throw new Error(uj?.error || 'upload_failed')
      }

      // Erfolg
      setStep(4)
      onSuccess?.()
    } catch (e: any) {
      setError(e?.message || 'Fehler beim Absenden')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className={overlay} onClick={onClose}>
      <div className={panel} onClick={e => e.stopPropagation()}>
        <div className={header}>
          <h3 className="text-sm md:text-base font-semibold text-slate-900">Auf diese Anfrage bewerben</h3>
          <button onClick={onClose} className={btnGhost}>Schließen</button>
        </div>

        <div className={body}>
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200/70 bg-white/75 p-4 text-sm text-slate-800">
                <p className="font-medium mb-1">So funktioniert’s kurz & knapp:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Schreibe kurz, warum du passt. Lade relevante Unterlagen hoch (PDF/PNG/JPG).</li>
                  <li>Nach der Annahme empfehlen wir, <b>einen Termin</b> zu vereinbaren.</li>
                  <li>Kommunikation läuft zentral im Projekt-Chat.</li>
                  <li>Nach Abschluss kann der Kunde dich bewerten.</li>
                </ul>
              </div>

              {partnersLoading && <div className="text-sm text-slate-600">Lade Partnerprofil …</div>}

              {(partners.length > 0 && (!partnerId || partners.length > 1)) && (
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Als welcher Partner bewirbst du dich?</label>
                  <select
                    className="w-full rounded-lg border border-slate-200/70 bg-white/70 px-3 py-2 text-sm"
                    value={activePartnerId}
                    onChange={e => setActivePartnerId(e.target.value)}
                  >
                    {partners.map(p => (
                      <option key={p.id} value={p.id}>
                        {(p.display_name || p.company_name || 'Partner') + (p.city ? ` · ${p.city}` : '')}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!partnersLoading && partners.length === 0 && !partnerId && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                  Kein Partnerprofil gefunden. Lege zuerst eines unter <b>Dashboard → Partner werden</b> an.
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <label className="block text-sm text-slate-700">Deine Nachricht (optional)</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={8}
                placeholder="Stelle dich kurz vor, nenne Erfahrung, Beispiele oder Vorgehen…"
                className="w-full rounded-lg border border-slate-200/70 bg-white/70 px-3 py-2 text-sm text-slate-900 placeholder-slate-400"
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <label className="block text-sm text-slate-700">Dokumente (optional)</label>

              {/* Dropzone */}
              <label
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                className="block w-full rounded-lg border-2 border-dashed border-slate-300 bg-white/70 px-4 py-6 text-center text-sm text-slate-600 cursor-pointer hover:border-slate-400"
              >
                Dateien hierher ziehen oder klicken, um weitere auszuwählen
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  multiple
                  onChange={onInputChange}
                  className="hidden"
                />
              </label>

              {/* Ausgewählte Dateien als Chips */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-500">
                    {files.length} Datei{files.length>1?'en':''} · {fmtSize(totalBytes)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {files.map((f, i) => (
                      <span key={i} className={chip}>
                        {f.name} · {fmtSize(f.size)}
                        <button
                          className="ml-1 rounded-md px-1 text-slate-500 hover:text-rose-700"
                          onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                          title="Entfernen"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-500">
                Erlaubt: PDF, PNG, JPG · max {MAX_MB_PER_FILE} MB pro Datei.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3 text-center py-8">
              <div className="text-xl font-semibold text-slate-900">Bewerbung gesendet 🎉</div>
              <p className="text-sm text-slate-600">
                Du findest deine Bewerbung in der Übersicht. Der Kunde wird benachrichtigt.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
        </div>

        <div className={footer}>
          <div className="text-xs text-slate-500">Schritt {step}/4</div>
          <div className="flex items-center gap-2">
            {step > 1 && step < 4 && (
              <button className={btnGhost} onClick={() => setStep((s) => (s - 1) as any)}>
                Zurück
              </button>
            )}
            {step < 4 && (
              <button
                className={btnPrimary}
                onClick={() => {
                  if (step === 1 && !canStep1) return
                  if (step === 3) handleSubmit()
                  else setStep((s) => (s + 1) as any)
                }}
                disabled={(step === 1 && !canStep1) || submitting}
              >
                {step === 3 ? (submitting ? 'Sende …' : 'Abschicken') : 'Weiter'}
              </button>
            )}
            {step === 4 && (
              <button className={btnPrimary} onClick={onClose}>Fertig</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

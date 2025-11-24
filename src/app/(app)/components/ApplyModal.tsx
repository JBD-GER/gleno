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
  'fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/55 backdrop-blur-sm px-2 py-4 sm:px-4'

const panel =
  'flex w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-[min(100vh-2rem,720px)] flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/95 ring-1 ring-white/60 shadow-[0_24px_72px_rgba(2,6,23,0.35)]'

const header =
  'px-4 sm:px-5 py-3 sm:py-4 border-b border-white/60 bg-white/80 backdrop-blur flex items-center justify-between gap-3'

const body =
  'flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4'

const footer =
  'px-4 sm:px-5 py-3 border-t border-white/60 bg-white/80 backdrop-blur flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between'

const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-white/60 bg-white/85 backdrop-blur px-3 py-2 text-sm text-slate-900 shadow-sm hover:bg-white hover:shadow transition disabled:opacity-50 disabled:cursor-not-allowed'

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-medium shadow hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed'

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
  const ACCEPTED = ['application/pdf', 'image/png', 'image/jpeg']

  function fmtSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  function addFiles(list: File[]) {
    const filtered = list.filter((f) => ACCEPTED.includes(f.type))
    const tooBig = filtered.find((f) => f.size > MAX_MB_PER_FILE * 1024 * 1024)
    if (tooBig) {
      setError(`Datei zu groß: ${tooBig.name} (> ${MAX_MB_PER_FILE} MB)`)
      return
    }
    // Anhängen statt ersetzen; Duplikate nach Name+Size herausfiltern
    setFiles((prev) => {
      const map = new Map(prev.map((f) => [f.name + '|' + f.size, f]))
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
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onEsc)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onEsc)
    }
  }, [open, onClose])

  // Reset & Partner laden
  useEffect(() => {
    if (!open) return
    setStep(1)
    setMessage('')
    setFiles([])
    setError('')

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

        if (partnerId && list.some((p) => p.id === partnerId)) {
          setActivePartnerId(partnerId)
        } else if (!partnerId) {
          setActivePartnerId(list[0]?.id ?? '')
        } else if (partnerId && !list.some((p) => p.id === partnerId)) {
          setActivePartnerId(list[0]?.id ?? '')
        }
      } catch (e: any) {
        if (!canceled) setError(e?.message || 'Konnte Partner nicht laden')
      } finally {
        if (!canceled) setPartnersLoading(false)
      }
    })()
    return () => {
      canceled = true
    }
  }, [open, partnerId])

  useEffect(() => {
    if (open && partnerId) setActivePartnerId(partnerId)
  }, [open, partnerId])

  const activePartner = useMemo(
    () => partners.find((p) => p.id === activePartnerId) || null,
    [partners, activePartnerId],
  )

  const canStep1 = Boolean(activePartnerId) && !partnersLoading
  const totalBytes = files.reduce((a, f) => a + f.size, 0)

  async function handleSubmit() {
    if (!activePartnerId) {
      setError('Bitte wähle einen Partner.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      // Bewerbung anlegen (deutscher Status wird in der API gesetzt)
      const res = await fetch('/api/partners/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          partner_id: activePartnerId,
          // Du sendest HTML – API akzeptiert message_html (ansonsten message_text senden)
          message_html: message || null,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'submit_failed')
      const applicationId: string = j.id

      // Dateien hochladen (optional)
      if (files.length > 0) {
        const form = new FormData()
        form.set('application_id', applicationId)
        files.forEach((f) => form.append('files', f))
        const up = await fetch(
          `/api/partners/applications/${applicationId}/upload`,
          { method: 'POST', body: form },
        )
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

  const steps = [
    { id: 1 as const, label: 'Überblick' },
    { id: 2 as const, label: 'Nachricht' },
    { id: 3 as const, label: 'Dokumente' },
    { id: 4 as const, label: 'Fertig' },
  ]

  return (
    <div
      className={overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Auf Anfrage bewerben"
    >
      <div
        className={panel}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={header}>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
              Auf diese Anfrage bewerben
            </h3>
            <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">
              In ein paar Schritten deine Bewerbung abschicken.
            </p>
          </div>
          <button
            onClick={onClose}
            className={btnGhost}
          >
            Schließen
          </button>
        </div>

        {/* Stepper (oben im Body, gut für Mobil) */}
        <div className="px-4 pt-3 sm:px-5">
          <ol className="flex items-center justify-between gap-1 text-[11px] sm:text-xs">
            {steps.map((s, idx) => {
              const isActive = s.id === step
              const isDone = s.id < step
              return (
                <li
                  key={s.id}
                  className="flex flex-1 items-center gap-1 sm:gap-2"
                >
                  <div
                    className={[
                      'inline-flex items-center gap-1 rounded-full border px-2 py-1',
                      isActive
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : isDone
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-600',
                    ].join(' ')}
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px]">
                      {isDone ? '✓' : s.id}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="hidden h-px flex-1 border-t border-dashed border-slate-200 sm:block" />
                  )}
                </li>
              )
            })}
          </ol>
        </div>

        {/* Body */}
        <div className={body}>
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-3 text-xs text-slate-800 sm:p-4 sm:text-sm">
                <p className="mb-1 font-medium text-slate-900">
                  So funktioniert’s kurz & knapp:
                </p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>
                    Schreibe kurz, warum du passt und nenne ggf. Referenzen oder
                    Beispiele.
                  </li>
                  <li>
                    Lade bei Bedarf Unterlagen hoch (
                    <b>PDF/PNG/JPG, je max. {MAX_MB_PER_FILE} MB</b>).
                  </li>
                  <li>Nach der Annahme könnt ihr direkt einen Termin vereinbaren.</li>
                  <li>Die gesamte Kommunikation läuft im Projekt-Chat.</li>
                </ul>
              </div>

              {partnersLoading && (
                <div className="text-sm text-slate-600">
                  Lade Partnerprofil …
                </div>
              )}

              {activePartner && (
                <div className="rounded-xl border border-slate-200/70 bg-white/80 p-3 text-xs text-slate-700 sm:text-sm">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Du bewirbst dich als
                    </span>
                    <span className={chip}>
                      {activePartner.display_name ||
                        activePartner.company_name ||
                        'Partner'}{' '}
                      {activePartner.city && (
                        <span className="text-slate-500">· {activePartner.city}</span>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {partners.length > 0 && (!partnerId || partners.length > 1) && (
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700 sm:text-sm">
                    Als welcher Partner bewirbst du dich?
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200/70 bg-white/80 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                    value={activePartnerId}
                    onChange={(e) => setActivePartnerId(e.target.value)}
                  >
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {(p.display_name || p.company_name || 'Partner') +
                          (p.city ? ` · ${p.city}` : '')}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!partnersLoading && partners.length === 0 && !partnerId && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900 sm:text-sm">
                  Kein Partnerprofil gefunden. Lege zuerst eines unter{' '}
                  <b>Dashboard → Partner werden</b> an, um dich auf Anfragen zu
                  bewerben.
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700 sm:text-sm">
                  Deine Nachricht an den Kunden (optional)
                </label>
                <p className="text-[11px] text-slate-500 sm:text-xs">
                  Kurz & konkret: Wer bist du, was bietest du an, warum passt du
                  besonders gut zu dieser Anfrage?
                </p>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder="Beispiel: 
Hallo, ich bin seit 10 Jahren in diesem Bereich tätig, habe bereits mehrere ähnliche Projekte umgesetzt und kann kurzfristig starten..."
                className="w-full rounded-lg border border-slate-200/70 bg-white/80 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700 sm:text-sm">
                  Dokumente anhängen (optional)
                </label>
                <p className="text-[11px] text-slate-500 sm:text-xs">
                  Z. B. Referenzen, Leistungsbeschreibung, Angebots-PDF, Bilder.
                </p>
              </div>

              {/* Dropzone */}
              <label
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                className="block w-full cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-white/80 px-4 py-6 text-center text-xs text-slate-600 transition hover:border-slate-400 sm:text-sm"
              >
                Dateien hierher ziehen
                <span className="hidden sm:inline"> oder klicken</span>, um weitere
                auszuwählen
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
                <div className="space-y-1.5">
                  <div className="text-[11px] text-slate-500 sm:text-xs">
                    {files.length} Datei{files.length > 1 ? 'en' : ''} ·{' '}
                    {fmtSize(totalBytes)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {files.map((f, i) => (
                      <span key={i} className={chip}>
                        <span className="truncate max-w-[10rem] sm:max-w-[14rem]">
                          {f.name}
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          {fmtSize(f.size)}
                        </span>
                        <button
                          className="ml-1 rounded-md px-1 text-slate-400 hover:text-rose-700"
                          onClick={() =>
                            setFiles((prev) => prev.filter((_, idx) => idx !== i))
                          }
                          title="Entfernen"
                          type="button"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-500 sm:text-xs">
                Erlaubt: PDF, PNG, JPG · max. {MAX_MB_PER_FILE} MB pro Datei.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3 py-6 text-center sm:py-8">
              <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 sm:h-12 sm:w-12">
                ✓
              </div>
              <div className="text-base font-semibold text-slate-900 sm:text-lg">
                Bewerbung gesendet 🎉
              </div>
              <p className="text-sm text-slate-600">
                Der Kunde wird benachrichtigt. Du findest deine Bewerbung jederzeit in
                deiner Übersicht.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 sm:text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer / Navigation */}
        <div className={footer}>
          <div className="text-[11px] text-slate-500 sm:text-xs">
            Schritt {step}/4
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {step > 1 && step < 4 && (
              <button
                className={btnGhost + ' w-full sm:w-auto'}
                type="button"
                onClick={() => setStep((s) => (s - 1) as any)}
                disabled={submitting}
              >
                Zurück
              </button>
            )}

            {step < 4 && (
              <button
                className={btnPrimary + ' w-full sm:w-auto'}
                type="button"
                onClick={() => {
                  if (step === 1 && !canStep1) return
                  if (step === 3) {
                    if (!submitting) handleSubmit()
                  } else {
                    setStep((s) => (s + 1) as any)
                  }
                }}
                disabled={(step === 1 && !canStep1) || submitting}
              >
                {step === 3 ? (submitting ? 'Sende …' : 'Abschicken') : 'Weiter'}
              </button>
            )}

            {step === 4 && (
              <button
                className={btnPrimary + ' w-full sm:w-auto'}
                type="button"
                onClick={onClose}
              >
                Schließen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

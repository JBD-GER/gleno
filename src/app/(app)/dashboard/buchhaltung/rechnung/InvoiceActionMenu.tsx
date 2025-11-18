'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'

type InvoiceStatus = 'Erstellt' | 'Verschickt' | 'Bezahlt' | string | null | undefined

type AutomationInterval =
  | 'weekly'
  | 'every_2_weeks'
  | 'monthly'
  | 'every_2_months'
  | 'quarterly'
  | 'every_6_months'
  | 'yearly'

function Portal({ children }: { children: React.ReactNode }) {
  if (typeof window === 'undefined') return null
  return createPortal(children, document.body)
}

function useGlobalPosition(
  btnRef: React.RefObject<HTMLElement | null>,
  panelRef: React.RefObject<HTMLElement | null>,
  open: boolean
) {
  const [style, setStyle] = useState<React.CSSProperties>({ display: 'none' })

  const compute = () => {
    const btn = btnRef.current
    const panel = panelRef.current
    if (!btn || !panel || !open) {
      setStyle({ display: 'none' })
      return
    }

    const prevVis = panel.style.visibility
    const prevDisp = panel.style.display
    panel.style.visibility = 'hidden'
    panel.style.display = 'block'

    const br = btn.getBoundingClientRect()
    const pr = panel.getBoundingClientRect()

    const margin = 8
    let top = br.bottom + margin
    let left = br.right - pr.width

    if (left < margin) left = margin
    if (left + pr.width > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - pr.width - margin)
    }

    const fitsBelow = window.innerHeight - br.bottom >= pr.height + margin
    if (!fitsBelow) {
      const upTop = br.top - pr.height - margin
      top = upTop >= margin ? upTop : Math.max(margin, window.innerHeight - pr.height - margin)
    }

    panel.style.visibility = prevVis
    panel.style.display = prevDisp

    setStyle({ position: 'fixed', top, left, zIndex: 9999, display: 'block' })
  }

  useLayoutEffect(() => {
    if (open) compute()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onScroll = () => compute()
    const onResize = () => compute()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return style
}

type AutomationModalProps = {
  invoiceNumber: string
  open: boolean
  onClose: () => void
  onChanged?: () => void
}

function AutomationModal({ invoiceNumber, open, onClose, onChanged }: AutomationModalProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [hasAutomation, setHasAutomation] = useState(false)
  const [active, setActive] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [unlimited, setUnlimited] = useState(true)
  const [interval, setInterval] = useState<AutomationInterval>('monthly')
  const [label, setLabel] = useState('')

  useEffect(() => {
    if (!open) return

    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(
          `/api/rechnung/automation?invoiceNumber=${encodeURIComponent(invoiceNumber)}`,
          { cache: 'no-store' }
        )
        const payload = await res.json().catch(() => ({} as any))
        if (!res.ok) throw new Error(payload?.message || 'Fehler beim Laden')

        if (cancelled) return

        const automation = payload.automation
        if (automation) {
          setHasAutomation(true)
          setActive(!!automation.active)
          setStartDate(automation.start_date ?? '')
          setEndDate(automation.end_date ?? '')
          setUnlimited(!automation.end_date)
          setInterval(
            (automation.interval as AutomationInterval) || 'monthly'
          )
          setLabel(automation.label ?? '')
        } else {
          setHasAutomation(false)
          setActive(false)
          setStartDate(new Date().toISOString().slice(0, 10))
          setEndDate('')
          setUnlimited(true)
          setInterval('monthly')
          setLabel('')
        }
      } catch (e: any) {
        console.error(e)
        if (!cancelled) setError(e?.message || 'Fehler beim Laden')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [open, invoiceNumber])

  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [open, onClose])

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      const res = await fetch('/api/rechnung/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber,
          startDate,
          endDate: unlimited ? null : endDate,
          interval,
          unlimited,
          label: label || null,
        }),
      })
      const payload = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(payload?.message || 'Speichern fehlgeschlagen')
      setHasAutomation(true)
      setActive(true)
      if (onChanged) onChanged()
      onClose()
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)
      setError(null)
      const res = await fetch('/api/rechnung/automation', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceNumber }),
      })
      const payload = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(payload?.message || 'Abbrechen fehlgeschlagen')
      setHasAutomation(false)
      setActive(false)
      if (onChanged) onChanged()
      onClose()
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Abbrechen fehlgeschlagen')
    } finally {
      setDeleting(false)
    }
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Rechnung automatisieren
            </h2>
            <p className="text-xs text-slate-500">
              Vorlage: <span className="font-mono text-[11px]">{invoiceNumber}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6 text-sm text-slate-500">
            Lädt …
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            )}

            {hasAutomation && (
              <div className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-700">
                Automatisierung ist aktuell{' '}
                <span className="font-semibold">
                  {active ? 'aktiv' : 'inaktiv'}
                </span>
                .
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Bezeichnung (optional)
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="z. B. Monatliche Wartung Küche"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Startdatum
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Enddatum
                  </label>
                  <input
                    type="date"
                    value={unlimited ? '' : endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={unlimited}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
                  />
                  <label className="mt-1 inline-flex items-center gap-2 text-[11px] text-slate-600">
                    <input
                      type="checkbox"
                      checked={unlimited}
                      onChange={(e) => setUnlimited(e.target.checked)}
                      className="h-3 w-3 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                    />
                    Unbegrenzt (kein Enddatum)
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Intervall
                </label>
                <select
                  value={interval}
                  onChange={(e) =>
                    setInterval(e.target.value as AutomationInterval)
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="weekly">Wöchentlich</option>
                  <option value="every_2_weeks">Alle 2 Wochen</option>
                  <option value="monthly">Monatlich</option>
                  <option value="every_2_months">Alle 2 Monate</option>
                  <option value="quarterly">Vierteljährlich</option>
                  <option value="every_6_months">Alle 6 Monate</option>
                  <option value="yearly">Jährlich</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  Die Cronjob-Logik erzeugt an diesen Terminen automatisch neue
                  Rechnungen auf Basis dieser Vorlage.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              {hasAutomation && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                  className="text-xs text-rose-600 hover:text-rose-700 disabled:opacity-60"
                >
                  {deleting ? 'Beende Automatisierung…' : 'Autom. abbrechen'}
                </button>
              )}
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving || deleting}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || deleting}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
                >
                  {saving
                    ? 'Speichert…'
                    : hasAutomation
                    ? 'Automatisierung aktualisieren'
                    : 'Automatisierung aktivieren'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

export default function InvoiceActionsMenu({
  invoiceNumber,
  currentStatus,
  downloadHref,
  editHref,
  inlineHref,
}: {
  invoiceNumber: string
  currentStatus?: InvoiceStatus
  downloadHref: string
  editHref: string
  inlineHref?: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<'sent' | 'reset' | 'paid' | null>(null)
  const [automationOpen, setAutomationOpen] = useState(false)

  const router = useRouter()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const btnRef = useRef<HTMLButtonElement | null>(null)

  const style = useGlobalPosition(
    btnRef as React.RefObject<HTMLElement | null>,
    panelRef as React.RefObject<HTMLElement | null>,
    open
  )

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!panelRef.current || !btnRef.current) return
      if (!panelRef.current.contains(t) && !btnRef.current.contains(t)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) =>
      e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const markStatus = async (status: 'Erstellt' | 'Verschickt' | 'Bezahlt') => {
    try {
      setLoading(
        status === 'Verschickt' ? 'sent' : status === 'Erstellt' ? 'reset' : 'paid'
      )
      const res = await fetch('/api/rechnung/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceNumber, status }),
      })
      const payload = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(payload?.message || 'Request failed')
      router.refresh()
    } catch (e: any) {
      console.error(e)
      alert(e?.message || 'Rechnungsstatus konnte nicht aktualisiert werden.')
    } finally {
      setLoading(null)
      setOpen(false)
    }
  }

  const s = (currentStatus ?? 'Erstellt').toString().toLowerCase()
  const isErstellt = s === 'erstellt'
  const isVerschickt = s === 'verschickt'
  const isBezahlt = s === 'bezahlt'

  return (
    <>
      <div className="relative inline-block text-left">
        <button
          ref={btnRef}
          onClick={() => setOpen((o) => !o)}
          disabled={!!loading}
          aria-haspopup="menu"
          aria-expanded={open}
          className={[
            'group inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition',
            'border border-slate-200 bg-white/80 text-slate-800 hover:bg-white',
            'focus:outline-none ring-offset-2 focus:ring-2 focus:ring-slate-200',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            'shadow',
          ].join(' ')}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="opacity-90"
                  d="M12 2a10 10 0 0 1 10 10h-3"
                  stroke="currentColor"
                  strokeWidth="3"
                />
              </svg>
              Bitte warten…
            </span>
          ) : (
            <>
              Aktionen
              <svg
                className={`h-4 w-4 text-slate-700 transition-transform ${
                  open ? 'rotate-180' : ''
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z" />
              </svg>
            </>
          )}
        </button>

        {open && (
          <Portal>
            <div
              ref={panelRef}
              role="menu"
              aria-label="Rechnung Aktionen"
              style={style}
              className={[
                'z-[9999] w-64 overflow-hidden rounded-2xl border border-slate-200',
                'bg-white/90 backdrop-blur shadow-[0_20px_50px_rgba(0,0,0,0.08)]',
              ].join(' ')}
            >
              <div className="border-b border-slate-200 bg-slate-50/70 px-3 py-2 text-[11px] uppercase tracking-wide text-slate-600">
                Rechnung{' '}
                <span className="font-semibold text-slate-800">{invoiceNumber}</span>
              </div>
              <ul className="py-1 text-sm text-slate-800">
                {inlineHref && (
                  <li>
                    <a
                      href={inlineHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      role="menuitem"
                      className="flex items-center gap-2 px-3 py-2 transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                      onClick={() => setOpen(false)}
                    >
                      <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M5 12h14M12 5l7 7-7 7"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      PDF anzeigen
                    </a>
                  </li>
                )}

                <li>
                  <a
                    href={downloadHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    role="menuitem"
                    className="flex items-center gap-2 px-3 py-2 transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                    onClick={() => setOpen(false)}
                  >
                    <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    PDF herunterladen
                  </a>
                </li>

                <li>
                  <a
                    href={editHref}
                    role="menuitem"
                    className="flex items-center gap-2 px-3 py-2 transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                    onClick={() => setOpen(false)}
                  >
                    <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M4 20h4l10-10-4-4L4 16v4z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Bearbeiten
                  </a>
                </li>

                {/* Neuer Menüpunkt: Automatisiert */}
                <li className="my-1 border-t border-slate-100" />

                <li>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false)
                      setAutomationOpen(true)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                  >
                    <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 13a7 7 0 1 0 2-4.9V5M5 5h2v2"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Automatisiert…
                  </button>
                </li>

                <li className="my-1 border-t border-slate-100" />

                {isErstellt && (
                  <>
                    <li>
                      <button
                        onClick={() => markStatus('Verschickt')}
                        disabled={!!loading}
                        role="menuitem"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-slate-50 focus:bg-slate-50 disabled:opacity-60"
                      >
                        <svg
                          className="h-4 w-4 text-indigo-600"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M5 12h14M12 5l7 7-7 7"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Als „Verschickt“ markieren
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => markStatus('Bezahlt')}
                        disabled={!!loading}
                        role="menuitem"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-slate-50 focus:bg-slate-50 disabled:opacity-60"
                      >
                        <svg
                          className="h-4 w-4 text-teal-600"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M5 13l4 4L19 7"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Als „Bezahlt“ markieren
                      </button>
                    </li>
                  </>
                )}

                {isVerschickt && (
                  <>
                    <li>
                      <button
                        onClick={() => markStatus('Erstellt')}
                        disabled={!!loading}
                        role="menuitem"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-slate-50 focus:bg-slate-50 disabled:opacity-60"
                      >
                        <svg
                          className="h-4 w-4 text-slate-600"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path d="M7 7h10v10H7z" stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                        Zurück auf „Erstellt“
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => markStatus('Bezahlt')}
                        disabled={!!loading}
                        role="menuitem"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-slate-50 focus:bg-slate-50 disabled:opacity-60"
                      >
                        <svg
                          className="h-4 w-4 text-teal-600"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M5 13l4 4L19 7"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Als „Bezahlt“ markieren
                      </button>
                    </li>
                  </>
                )}

                {isBezahlt && (
                  <>
                    <li>
                      <button
                        onClick={() => markStatus('Verschickt')}
                        disabled={!!loading}
                        role="menuitem"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-slate-50 focus:bg-slate-50 disabled:opacity-60"
                      >
                        <svg
                          className="h-4 w-4 text-indigo-600"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M5 12h14M12 5l7 7-7 7"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Zurück auf „Verschickt“
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => markStatus('Erstellt')}
                        disabled={!!loading}
                        role="menuitem"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-slate-50 focus:bg-slate-50 disabled:opacity-60"
                      >
                        <svg
                          className="h-4 w-4 text-slate-600"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path d="M7 7h10v10H7z" stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                        Zurück auf „Erstellt“
                      </button>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </Portal>
        )}
      </div>

      {/* Modal für Automatisierung */}
      <AutomationModal
        invoiceNumber={invoiceNumber}
        open={automationOpen}
        onClose={() => setAutomationOpen(false)}
        onChanged={() => router.refresh()}
      />
    </>
  )
}

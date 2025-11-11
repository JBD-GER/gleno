'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'

type OfferStatus =
  | 'Erstellt'
  | 'Verschickt'
  | 'Bestätigt'
  | 'Bestaetigt'
  | string
  | null
  | undefined

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

    // temporär sichtbar machen, um echte Größe zu messen
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

    // Restore
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

export default function OfferActionsMenu({
  offerNumber,
  currentStatus,
  downloadHref,
  editHref,
  redirectTo = '/dashboard/buchhaltung/auftrag',
}: {
  offerNumber: string
  currentStatus?: OfferStatus
  downloadHref: string
  editHref: string
  redirectTo?: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<'gen' | 'sent' | 'reset' | null>(null)
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const btnRef = useRef<HTMLButtonElement | null>(null)

  const style = useGlobalPosition(btnRef as React.RefObject<HTMLElement | null>, panelRef as React.RefObject<HTMLElement | null>, open)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!panelRef.current || !btnRef.current) return
      if (!panelRef.current.contains(t) && !btnRef.current.contains(t)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const markStatus = async (status: 'Erstellt' | 'Verschickt') => {
    try {
      setLoading(status === 'Verschickt' ? 'sent' : 'reset')
      const res = await fetch('/api/angebot/set-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerNumber, status }),
      })
      if (!res.ok) throw new Error(await res.text().catch(() => 'Request failed'))
      router.refresh()
    } catch (e) {
      console.error(e)
      alert('Status konnte nicht aktualisiert werden.')
    } finally {
      setLoading(null)
      setOpen(false)
    }
  }

  const genOrderConfirmation = async () => {
    try {
      setLoading('gen')
      const res = await fetch('/api/auftrag/generate-from-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerNumber }),
      })
      if (!res.ok) throw new Error(await res.text())

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const cd = res.headers.get('Content-Disposition') || ''
      const m = cd.match(/filename="([^"]+)"/i)
      const filename = m?.[1] || `Auftragsbestaetigung_${offerNumber}.pdf`

      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      router.push(redirectTo)
    } catch (e) {
      console.error(e)
      alert('Konnte Auftragsbestätigung nicht erzeugen.')
    } finally {
      setLoading(null)
      setOpen(false)
    }
  }

  const isErstellt = (currentStatus ?? 'Erstellt').toString().toLowerCase() === 'erstellt'
  const isVerschickt = (currentStatus ?? '').toString().toLowerCase() === 'verschickt'

  return (
    <div className="relative inline-block text-left">
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        disabled={!!loading}
        aria-haspopup="menu"
        aria-expanded={open}
        className={[
          'group inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition',
          'border border-white/60 bg-white/80 text-slate-900 shadow hover:bg-white',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          'relative',
        ].join(' ')}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-0.5 -z-10 rounded-lg bg-[radial-gradient(400px_120px_at_120%_-20%,rgba(88,101,242,0.18),transparent_60%)]"
        />
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-90" d="M12 2a10 10 0 0 1 10 10h-3" stroke="currentColor" strokeWidth="3" />
            </svg>
            Bitte warten…
          </span>
        ) : (
          <>
            Aktionen
            <svg className="h-4 w-4 transition-transform data-[open=true]:rotate-180" data-open={open} viewBox="0 0 20 20" fill="currentColor">
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
            aria-label="Angebot Aktionen"
            style={style}
            className={[
              'z-[9999] mt-2 w-64 overflow-hidden rounded-2xl',
              'border border-white/60 bg-white/90 backdrop-blur shadow-[0_20px_50px_rgba(2,6,23,0.10)]',
            ].join(' ')}
          >
            <div className="border-b border-white/60 bg-white/70 px-3 py-2 text-[11px] uppercase tracking-wide text-slate-700">
              Angebot <span className="font-semibold text-slate-900">{offerNumber}</span>
            </div>
            <ul className="py-1 text-sm text-slate-800">
              <li>
                <a
                  href={downloadHref}
                  rel="noopener noreferrer"
                  role="menuitem"
                  className="flex items-center gap-2 px-3 py-2 transition hover:bg-white"
                  onClick={() => setOpen(false)}
                >
                  <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  PDF herunterladen
                </a>
              </li>
              <li>
                <a
                  href={editHref}
                  role="menuitem"
                  className="flex items-center gap-2 px-3 py-2 transition hover:bg-white"
                  onClick={() => setOpen(false)}
                >
                  <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none">
                    <path d="M4 20h4l10-10-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  </svg>
                  Bearbeiten
                </a>
              </li>

              <li className="my-1 border-t border-white/60" />

              {isErstellt && (
                <li>
                  <button
                    onClick={() => markStatus('Verschickt')}
                    disabled={!!loading}
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-white disabled:opacity-60"
                  >
                    <svg className="h-4 w-4 text-indigo-600" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Als „Verschickt“ markieren
                  </button>
                </li>
              )}
              {isVerschickt && (
                <li>
                  <button
                    onClick={() => markStatus('Erstellt')}
                    disabled={!!loading}
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-white disabled:opacity-60"
                  >
                    <svg className="h-4 w-4 text-slate-600" viewBox="0 0 24 24" fill="none">
                      <path d="M7 7h10v10H7z" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                    Zurück auf „Erstellt“
                  </button>
                </li>
              )}

              <li className="my-1 border-t border-white/60" />
              <li>
                <button
                  onClick={genOrderConfirmation}
                  disabled={!!loading}
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-white disabled:opacity-60"
                >
                  <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none">
                    <path d="M6 12h12M6 8h8M6 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  Auftragsbest. erzeugen
                </button>
              </li>
            </ul>
          </div>
        </Portal>
      )}
    </div>
  )
}

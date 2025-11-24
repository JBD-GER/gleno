'use client'

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'

type OrderStatus =
  | 'Erstellt'
  | 'Verschickt'
  | 'Abgerechnet'
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
  const [style, setStyle] = useState<CSSProperties>({ display: 'none' })

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
      top =
        upTop >= margin
          ? upTop
          : Math.max(margin, window.innerHeight - pr.height - margin)
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

export default function OrderActionsMenu({
  orderConfirmationNumber,
  pdfPath,
  currentStatus,
  redirectAfter = '/dashboard/buchhaltung/rechnung',
}: {
  orderConfirmationNumber: string
  pdfPath: string
  currentStatus?: OrderStatus
  redirectAfter?: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<'gen' | 'sent' | 'reset' | null>(null)
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
      if (!panelRef.current.contains(t) && !btnRef.current.contains(t)) {
        setOpen(false)
      }
    }
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const genInvoice = async () => {
    try {
      setLoading('gen')
      const res = await fetch('/api/rechnung/generate-from-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderConfirmationNumber }),
      })
      if (!res.ok) throw new Error(await res.text())

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const cd = res.headers.get('Content-Disposition') || ''
      const m = cd.match(/filename="([^"]+)"/i)
      const filename = m?.[1] || `Rechnung_${orderConfirmationNumber}.pdf`

      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      router.push(redirectAfter)
    } catch (e) {
      console.error(e)
      alert('Konnte Rechnung nicht erzeugen.')
    } finally {
      setLoading(null)
      setOpen(false)
    }
  }

  const markStatus = async (status: 'Erstellt' | 'Verschickt') => {
    try {
      setLoading(status === 'Verschickt' ? 'sent' : 'reset')
      const res = await fetch('/api/auftrag/set-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderConfirmationNumber, status }),
      })
      if (!res.ok) throw new Error(await res.text())
      router.refresh()
    } catch (e) {
      console.error(e)
      alert('Status konnte nicht aktualisiert werden.')
    } finally {
      setLoading(null)
      setOpen(false)
    }
  }

  const viewHref = `/api/auftrag/generate-from-offer/download?path=${encodeURIComponent(
    pdfPath
  )}&disposition=inline`

  const isErstellt =
    (currentStatus ?? 'Erstellt').toString().toLowerCase() === 'erstellt'
  const isVerschickt =
    (currentStatus ?? '').toString().toLowerCase() === 'verschickt'
  const isAbgerechnet =
    (currentStatus ?? '').toString().toLowerCase() === 'abgerechnet'

  return (
    <div className="relative inline-block text-left">
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        disabled={!!loading}
        aria-haspopup="menu"
        aria-expanded={open}
        className={[
          'group inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium',
          'border border-slate-200/70 bg-white text-slate-800 hover:bg-white',
          'shadow transition',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-0',
          'disabled:opacity-60 disabled:cursor-not-allowed',
        ].join(' ')}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
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
            aria-label="Auftrag Aktionen"
            style={style}
            className={[
              'z-[9999] w-64 overflow-hidden rounded-2xl border border-slate-200',
              'bg-white/90 backdrop-blur shadow-[0_20px_50px_rgba(0,0,0,0.08)]',
            ].join(' ')}
          >
            <div className="border-b border-slate-200 bg-slate-50/70 px-3 py-2 text-[11px] uppercase tracking-wide text-slate-600">
              Auftrag{' '}
              <span className="font-semibold text-slate-800">
                {orderConfirmationNumber}
              </span>
            </div>
            <ul className="py-1 text-sm text-slate-800">
              <li>
                <a
                  href={viewHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  role="menuitem"
                  className="flex items-center gap-2 px-3 py-2 transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                  onClick={() => setOpen(false)}
                >
                  <svg
                    className="h-4 w-4 text-slate-500"
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
                  PDF anzeigen
                </a>
              </li>

              <li className="my-1 border-t border-slate-100" />

              {!isAbgerechnet && isErstellt && (
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
              )}

              {!isAbgerechnet && isVerschickt && (
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
                      <path
                        d="M7 7h10v10H7z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                    </svg>
                    Zurück auf „Erstellt“
                  </button>
                </li>
              )}

              <li className="my-1 border-t border-slate-100" />

              <li>
                <button
                  onClick={genInvoice}
                  disabled={!!loading}
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-slate-50 focus:bg-slate-50 disabled:opacity-60"
                >
                  <svg
                    className="h-4 w-4 text-slate-500"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M6 12h12M6 8h8M6 16h6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                  {loading === 'gen' ? 'Erzeuge…' : 'Rechnung erzeugen'}
                </button>
              </li>
            </ul>
          </div>
        </Portal>
      )}
    </div>
  )
}

// src/app/(public)/components/PublicMobileHeader.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

type MenuItem = { id: string; label: string }
type Props = {
  base: string
  logoUrl?: string | null
  title?: string | null
  menu: MenuItem[]
}

export default function PublicMobileHeader({ base, logoUrl, title, menu }: Props) {
  const [open, setOpen] = useState(false)

  // ESC schließt Overlay
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const close = useCallback(() => setOpen(false), [])

  return (
    <>
      {/* MOBILE TOP BAR: Logo links | Kontakt zentriert | Burger rechts */}
      <div className="md:hidden mx-auto max-w-6xl px-4 py-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          {/* Logo / Titel (links) */}
          <div className="min-w-0">
            {logoUrl ? (
              <div className="relative h-9 w-28">
                <Image
                  src={logoUrl}
                  alt="Logo"
                  fill
                  className="object-contain"
                  sizes="112px"
                  priority
                />
              </div>
            ) : (
              <span className="font-medium line-clamp-1 text-slate-900">
                {title || 'Fliesenleger Meisterbetrieb'}
              </span>
            )}
          </div>

          {/* Kontakt (zentriert) – wie Desktop CTA: rounded-xl */}
          <div className="justify-self-center">
            <a
              href={`${base}#kontakt`}
              className="
                px-3 py-2 rounded-xl
                bg-white/60 hover:bg-white/85
                border border-white/60
                backdrop-blur-md
                transition
                text-slate-900 text-sm shadow-sm hover:shadow
              "
            >
              Kontakt
            </a>
          </div>

          {/* Burger (rechts) – ebenfalls rounded-xl für Button-Konsistenz */}
          <div className="justify-self-end">
            <button
              aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen(s => !s)}
              className="
                inline-flex items-center justify-center w-11 h-11 rounded-xl
                bg-white/60 hover:bg-white/85
                border border-white/60
                backdrop-blur-md
                transition
                text-slate-900 shadow-sm hover:shadow
              "
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                   className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                {open ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay-Menü */}
      {open && (
        <div id="mobile-menu" role="dialog" aria-modal="true" className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={close} />
          <div className="absolute left-0 right-0 top-0 bg-white/95 backdrop-blur-xl border-b border-white/60 rounded-b-2xl shadow-lg">
            <div className="mx-auto max-w-6xl px-4 pt-4 pb-5">
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <div className="relative h-9 w-28">
                    <Image src={logoUrl} alt="Logo" fill className="object-contain" sizes="112px" />
                  </div>
                ) : (
                  <span className="font-medium text-slate-900">
                    {title || 'Fliesenleger Meisterbetrieb'}
                  </span>
                )}
                {/* Close – rounded-xl */}
                <button
                  aria-label="Menü schließen"
                  onClick={close}
                  className="
                    ml-auto inline-flex items-center justify-center w-10 h-10 rounded-xl
                    bg-white/60 hover:bg-white/85
                    border border-white/60
                    backdrop-blur-md
                    transition
                    text-slate-900 shadow-sm hover:shadow
                  "
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24"
                       fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <nav className="mt-4">
                <ul className="space-y-1">
                  {menu.map(item => (
                    <li key={item.id}>
                      <a
                        href={`${base}#${item.id}`}
                        onClick={close}
                        className="
                          block px-3 py-2 rounded-lg
                          hover:bg-white/70
                          border border-white/60
                          bg-white/50
                          backdrop-blur-md
                          transition
                          text-slate-900
                        "
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                  <li className="pt-2">
                    <a
                      href={`${base}#kontakt`}
                      onClick={close}
                      className="
                        block text-center px-4 py-2 rounded-xl
                        bg-white/70 hover:bg-white/85
                        border border-white/60
                        backdrop-blur-md
                        transition
                        text-slate-900 shadow-sm hover:shadow
                      "
                    >
                      Kontakt
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'

export default function DownloadFromStorageButton({
  path, // z.B. "auftrag/Auftragsbestaetigung_AC_1004T_K_00002.pdf"
  label = 'PDF',
  title = 'PDF herunterladen',
  disposition = 'attachment', // oder 'inline'
}: {
  path: string
  label?: string
  title?: string
  disposition?: 'attachment' | 'inline'
}) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [])

  const onClick = async () => {
    try {
      setLoading(true)

      const url = `/api/auftrag/generate-from-offer/download?path=${encodeURIComponent(
        path
      )}&disposition=${disposition}`
      const res = await fetch(url)
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || `Download fehlgeschlagen (${res.status})`)
      }

      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)

      if (disposition === 'inline') {
        window.open(objectUrl, '_blank', 'noopener,noreferrer')
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000 * 10)
      } else {
        const a = document.createElement('a')
        a.href = objectUrl
        const cd = res.headers.get('Content-Disposition') || ''
        const m = cd.match(/filename="([^"]+)"/i)
        a.download = m?.[1] || path.split('/').pop() || 'download.pdf'
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
      }
    } catch (e) {
      console.error(e)
      alert(
        'Konnte Datei nicht herunterladen. Prüfe, ob der gespeicherte Pfad exakt mit dem Objekt im Bucket übereinstimmt.'
      )
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={onClick}
        disabled={loading}
        aria-label={title}
        title={title}
        className={[
          'group inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold transition',
          'bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          'shadow-[0_6px_20px_rgba(0,0,0,0.06)]',
          'relative',
        ].join(' ')}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-0.5 -z-10 hidden rounded-xl bg-gradient-to-r from-indigo-500/15 to-teal-400/15 blur group-hover:block"
        />
        {loading ? (
          <>
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
            Lädt…
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4 text-slate-600"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {label}
          </>
        )}
      </button>

      {open && !loading && (
        <div
          role="tooltip"
          className={[
            'absolute left-1/2 z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg',
            'border border-slate-200 bg-white/90 px-2.5 py-1 text-xs text-slate-700 shadow-lg backdrop-blur',
          ].join(' ')}
        >
          {disposition === 'inline'
            ? 'Im neuen Tab anzeigen'
            : 'Als Datei herunterladen'}
        </div>
      )}
    </div>
  )
}

// src/app/(public)/w/components/SubmissionCelebration.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type Props = {
  primary?: string
  secondary?: string
}

export default function SubmissionCelebration({
  primary = '#0a1b40',
  secondary = '#f59e0b',
}: Props) {
  const [show, setShow] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const close = () => setShow(false)

  const outlineStyle = '1px solid ' + primary + '22'

  const sent = useMemo(() => {
    if (typeof window === 'undefined') return false
    const sp = new URLSearchParams(window.location.search)
    return sp.get('sent') === '1'
  }, [])

  useEffect(() => {
    if (!sent) return
    setShow(true)

    const el = document.getElementById('kontakt')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })

    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('sent')
      window.history.replaceState({}, '', url.toString())
    } catch {}

    shootConfetti()

    const t = setTimeout(() => setShow(false), 6000)
    return () => clearTimeout(t)
  }, [sent])

  function shootConfetti() {
    const canvas = canvasRef.current
    if (!canvas) return

    // ✅ Non-null assertion für TS
    const ctx = canvas.getContext('2d')!
    if (!ctx) return

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
    const W = (canvas.width = Math.floor(window.innerWidth * dpr))
    const H = (canvas.height = Math.floor(window.innerHeight * dpr))

    const colors = [secondary, primary, '#10b981', '#3b82f6', '#ef4444']
    const N = 160
    const g = 0.08 * dpr
    const particles = Array.from({ length: N }).map(() => {
      const angle = Math.random() * Math.PI - Math.PI / 2
      const speed = (6 + Math.random() * 8) * dpr
      const x = W / 2 + (Math.random() * 120 - 60) * dpr
      const y = H / 3
      return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2 * dpr,
        r: 2 + Math.random() * 4,
        c: colors[Math.floor(Math.random() * colors.length)],
        a: 1,
        spin: (Math.random() - 0.5) * 0.2,
      }
    })

    const maxMs = 1500

    function frame() {
      ctx.clearRect(0, 0, W, H)

      particles.forEach((p) => {
        p.vy += g
        p.x += p.vx
        p.y += p.vy
        p.a *= 0.985
        p.r *= 0.997

        ctx.save()
        ctx.globalAlpha = Math.max(0, p.a)
        ctx.translate(p.x, p.y)
        ctx.rotate((p.spin += 0.05))
        ctx.fillStyle = p.c as string
        ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2)
        ctx.restore()
      })

      if (particles.some((p) => p.a > 0.05 && p.y < H + 40 * dpr)) {
        requestAnimationFrame(frame)
      } else {
        ctx.clearRect(0, 0, W, H)
        if (canvasRef.current) canvasRef.current.style.opacity = '0'
      }
    }

    canvas.style.opacity = '1'
    requestAnimationFrame(frame)
  }

  if (!show) return null

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="fixed inset-0 pointer-events-none z-[70] transition-opacity duration-500"
        style={{ opacity: 0 }}
      />

      <div className="fixed inset-0 z-[80] grid place-items-center">
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in"
          onClick={close}
        />
        <div
          role="status"
          aria-live="polite"
          className="
            relative mx-4 w-full max-w-md
            rounded-3xl border border-white/60 bg-white/80 backdrop-blur-2xl
            shadow-[0_30px_80px_rgba(0,0,0,0.18)]
            p-6 sm:p-7
            animate-pop-in
          "
          style={{ outline: outlineStyle }}
        >
          <button
            onClick={close}
            aria-label="Schließen"
            className="absolute right-3 top-3 rounded-full p-2 hover:bg-white/60 active:scale-95 transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          <div className="mx-auto mb-4 grid place-items-center">
            <span
              className="grid place-items-center rounded-full h-16 w-16 shadow"
              style={{
                background: 'conic-gradient(from 0deg, ' + secondary + '33, ' + secondary + '99)',
                boxShadow: '0 10px 30px ' + secondary + '33',
              }}
            >
              <svg viewBox="0 0 52 52" width="40" height="40">
                <circle cx="26" cy="26" r="24" fill="white" stroke={primary} strokeWidth="2" opacity="0.15" />
                <path
                  d="M14 28 l8 8 l16 -20"
                  fill="none"
                  stroke={primary}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>

          <h3 className="text-xl font-semibold text-slate-900 text-center">Anfrage eingegangen!</h3>
          <p className="mt-2 text-center text-slate-700">
            Vielen Dank – wir melden uns schnellstmöglich bei Ihnen.
          </p>

          <div className="mt-5 flex justify-center">
            <button
              onClick={close}
              className="inline-flex items-center gap-2 rounded-xl border border-white/60 bg-white/80 px-4 py-2 text-slate-900 shadow-sm hover:shadow transition"
            >
              Okay
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: secondary }} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

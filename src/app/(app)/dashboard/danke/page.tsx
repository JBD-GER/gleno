'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircleIcon,
  TrophyIcon,
  ArrowRightIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

const COUNTDOWN_START = 5

export default function DankePage() {
  const router = useRouter()
  const [seconds, setSeconds] = useState(COUNTDOWN_START)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)

  // Confetti (ohne Library)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const onResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

    const palette = ['#fde68a', '#a7f3d0', '#fbcfe8', '#bfdbfe', '#ddd6fe'] // Pastell-Konfetti
    type P = { x: number; y: number; r: number; c: string; vx: number; vy: number; rot: number; vr: number }
    const N = 180
    const ps: P[] = Array.from({ length: N }, () => ({
      x: Math.random() * width,
      y: -20 - Math.random() * height * 0.5,
      r: 4 + Math.random() * 6,
      c: palette[Math.floor(Math.random() * palette.length)],
      vx: -1 + Math.random() * 2,
      vy: 1 + Math.random() * 3.5,
      rot: Math.random() * Math.PI,
      vr: -0.05 + Math.random() * 0.1,
    }))

    const start = performance.now()
    const DURATION = 5200 // ms

    const draw = (t: number) => {
      const elapsed = t - start
      ctx.clearRect(0, 0, width, height)
      ps.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        if (p.y > height + 20) {
          p.y = -20
          p.x = Math.random() * width
        }
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.c
        ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2)
        ctx.restore()
      })
      if (elapsed < DURATION) {
        rafRef.current = requestAnimationFrame(draw)
      }
    }
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', onResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // Countdown + Auto-Redirect
  useEffect(() => {
    const int = setInterval(() => setSeconds(s => (s > 0 ? s - 1 : 0)), 1000)
    const to = setTimeout(() => router.push('/dashboard'), COUNTDOWN_START * 1000)
    return () => { clearInterval(int); clearTimeout(to) }
  }, [router])

  return (
    <main className="relative flex min-h-[calc(100dvh)] items-center justify-center overflow-hidden">
      {/* zarter Radial-Glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_50%_-200px,rgba(255,255,255,0.7),transparent)]" />
      {/* Konfetti-Canvas */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 -z-10" />

      <div className="mx-4 w-full max-w-2xl rounded-3xl border border-white/60 bg-white/80 p-8 backdrop-blur-xl shadow-[0_20px_60px_rgba(2,6,23,0.12)]">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/60 bg-white/70 shadow-sm">
            <CheckCircleIcon className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-medium tracking-tight">
              Erfolg! Ihre Buchung war erfolgreich 🎉
            </h1>
            <p className="mt-2 text-slate-700">
              Danke für Ihr Vertrauen – Sie haben jetzt **vollen Zugriff** auf alle Funktionen.
            </p>
          </div>
          <div className="hidden sm:block">
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/60 bg-white/70 px-3 py-1.5 text-sm text-slate-700">
              <SparklesIcon className="h-4 w-4" /> Premium freigeschaltet
            </div>
          </div>
        </div>

        {/* Achievement / Trophäe */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/60 bg-white/70 p-5">
            <div className="flex items-center gap-3">
              <TrophyIcon className="h-6 w-6" />
              <div className="text-base font-medium">Willkommen im Starter-Plan</div>
            </div>
            <p className="mt-2 text-sm text-slate-700">
              Monatlich kündbar, Rechnung per E-Mail & priorisierte Updates.
            </p>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/70 p-5">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="h-6 w-6" />
              <div className="text-base font-medium">Alles bereit</div>
            </div>
            <p className="mt-2 text-sm text-slate-700">
              Ihr Konto ist aktiviert. Wir leiten Sie gleich automatisch weiter.
            </p>
          </div>
        </div>

        {/* Progress / Countdown */}
        <div className="mt-8">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-700">
            <span>Weiterleitung in</span>
            <span className="tabular-nums">{seconds}s</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full border border-white/60 bg-white/70">
            <div
              className="h-full bg-slate-900 transition-all"
              style={{ width: `${(seconds / COUNTDOWN_START) * 100}%` }}
            />
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-900/25 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:border-slate-900/40"
            >
              Direkt zum Dashboard
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mini-Fußnote */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Sichere Zahlung über Stripe · Danke für Ihre Unterstützung 💙
        </p>
      </div>
    </main>
  )
}

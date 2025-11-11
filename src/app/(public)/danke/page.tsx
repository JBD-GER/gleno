// src/app/(public)/danke/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircleIcon,
  ArrowRightIcon,
  SparklesIcon,
  EnvelopeIcon,
  UserCircleIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline'

const COUNTDOWN_START = 7 // Sekunden bis Auto-Weiterleitung zum Login
const BRAND_DARK = '#0a1b40'
const BRAND_PRIMARY = '#5865f2'

type Piece = {
  x: number; y: number; r: number; w: number; h: number
  c: string; alpha: number
  vx: number; vy: number; rot: number; vr: number
  type: 'rect' | 'circle' | 'tri'
}

export default function DankePage() {
  const router = useRouter()
  const [seconds, setSeconds] = useState(COUNTDOWN_START)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)

  // 🎉 Blaue Konfetti-Hintergrundanimation (loopend, ohne externe Lib)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return // <- harter Guard, ab hier ist context sicher

    // respektiere Reduced Motion
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const onResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

    // kühle Blau/Violett-Palette
    const palette = [
      '#e0e7ff', // indigo-100
      '#c7d2fe', // indigo-200
      '#a5b4fc', // indigo-300
      '#93c5fd', // blue-300
      '#60a5fa', // blue-400
      '#3b82f6', // blue-500
      '#6366f1', // indigo-500
    ]

    const N = Math.min(220, Math.floor((width * height) / 15000)) // adaptiv
    const pieces: Piece[] = Array.from({ length: N }, () => spawn(width, height, palette))

    function spawn(w: number, h: number, pal: string[]): Piece {
      const r = 3 + Math.random() * 7
      const t: Piece['type'] = Math.random() < 0.34 ? 'rect' : Math.random() < 0.67 ? 'circle' : 'tri'
      return {
        x: Math.random() * w,
        y: -20 - Math.random() * h * 0.6,
        r,
        w: r * (0.8 + Math.random() * 1.6),
        h: r * (0.6 + Math.random() * 1.4),
        c: pal[Math.floor(Math.random() * pal.length)],
        alpha: 0.5 + Math.random() * 0.5,
        vx: -0.8 + Math.random() * 1.6,
        vy: 0.8 + Math.random() * 2.6,
        rot: Math.random() * Math.PI,
        vr: -0.04 + Math.random() * 0.08,
        type: t,
      }
    }

    function drawPiece(ctx: CanvasRenderingContext2D, p: Piece) {
      ctx.save()
      ctx.globalAlpha = p.alpha
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.c

      switch (p.type) {
        case 'rect':
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
          break
        case 'circle':
          ctx.beginPath()
          ctx.arc(0, 0, p.r, 0, Math.PI * 2)
          ctx.fill()
          break
        case 'tri':
          ctx.beginPath()
          ctx.moveTo(0, -p.r)
          ctx.lineTo(p.r * 0.9, p.r)
          ctx.lineTo(-p.r * 0.9, p.r)
          ctx.closePath()
          ctx.fill()
          break
      }
      ctx.restore()
    }

    // sanfter, kontinuierlicher Loop
    const draw = (ctx: CanvasRenderingContext2D) => {
      // zarter vertikaler Verlauf für mehr Tiefe
      const g = ctx.createLinearGradient(0, 0, 0, height)
      g.addColorStop(0, 'rgba(88,101,242,0.12)')
      g.addColorStop(1, 'rgba(10,27,64,0.08)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, width, height)

      // Partikel updaten/zeichnen
      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i]
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr

        // leichte Seitendrift
        p.vx += Math.sin((p.y + i) * 0.002) * 0.001

        if (p.y > height + 24) {
          pieces[i] = spawn(width, height, palette)
          pieces[i].y = -24
          pieces[i].x = Math.random() * width
        }
        drawPiece(ctx, p)
      }

      rafRef.current = requestAnimationFrame(() => draw(ctx))
    }

    rafRef.current = requestAnimationFrame(() => draw(context))

    return () => {
      window.removeEventListener('resize', onResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // ⏱️ Countdown + Auto-Redirect → /login
  useEffect(() => {
    const int = setInterval(() => setSeconds(s => (s > 0 ? s - 1 : 0)), 1000)
    const to = setTimeout(() => router.push('/login'), COUNTDOWN_START * 1000)
    return () => { clearInterval(int); clearTimeout(to) }
  }, [router])

  return (
    <main
      className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-6"
      style={{
        background:
          'radial-gradient(1200px 600px at 50% -200px, rgba(88,101,242,0.20), transparent),' +
          'radial-gradient(900px 480px at 85% 10%, rgba(99,102,241,0.14), transparent),' +
          'radial-gradient(900px 480px at 15% 0%, rgba(59,130,246,0.12), transparent)',
      }}
    >
      {/* Hintergrund-Konfetti */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 -z-10" />

      {/* breiteres, ruhiges Card-Layout */}
      <div className="w-full max-w-4xl rounded-3xl border border-white/50 bg-white/75 p-8 backdrop-blur-xl shadow-[0_30px_120px_rgba(2,6,23,0.18)] sm:p-10">
        {/* Header */}
        <div className="flex flex-wrap items-start gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/60 bg-white/80 shadow-sm">
            <CheckCircleIcon className="h-9 w-9 text-slate-800" />
          </div>
          <div className="min-w-[240px] flex-1">
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/60 bg-white/80 px-3 py-1.5 text-sm text-slate-700">
              <SparklesIcon className="h-4 w-4" /> Willkommen!
            </div>
            <h1 className="mt-3 text-3xl font-medium leading-tight tracking-tight text-slate-900">
              Fast geschafft! 🎉
            </h1>
            <p className="mt-2 text-slate-700">
              Wir haben dir soeben eine <strong>Bestätigungs-E-Mail</strong> geschickt.
              Klicke auf den Link, um dein Konto zu aktivieren. Danach kannst du dich
              einloggen und direkt loslegen.
            </p>
          </div>
        </div>

        {/* 3-Schritte-Checkliste */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/60 bg-white/80 p-5">
            <div className="flex items-center gap-3">
              <EnvelopeIcon className="h-6 w-6 text-slate-900" />
              <div className="text-base font-medium text-slate-900">1) E-Mail bestätigen</div>
            </div>
            <p className="mt-2 text-sm text-slate-700">
              Posteingang & ggf. Spam prüfen. Auf „E-Mail bestätigen“ tippen.
            </p>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/80 p-5">
            <div className="flex items-center gap-3">
              <UserCircleIcon className="h-6 w-6 text-slate-900" />
              <div className="text-base font-medium text-slate-900">2) Einloggen</div>
            </div>
            <p className="mt-2 text-sm text-slate-700">
              Nach der Aktivierung mit deiner E-Mail im Portal anmelden.
            </p>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/80 p-5">
            <div className="flex items-center gap-3">
              <RocketLaunchIcon className="h-6 w-6 text-slate-900" />
              <div className="text-base font-medium text-slate-900">3) Loslegen</div>
            </div>
            <p className="mt-2 text-sm text-slate-700">
              Angebote, Material, Team & Termine – alles an einem Ort.
            </p>
          </div>
        </div>

        {/* Progress / Countdown */}
        <div className="mt-10">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-700">
            <span>Weiterleitung zum Login</span>
            <span className="tabular-nums">{seconds}s</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full border border-white/70 bg-white/70">
            <div
              className="h-full transition-all"
              style={{
                width: `${(seconds / COUNTDOWN_START) * 100}%`,
                background: `linear-gradient(90deg, ${BRAND_PRIMARY}, ${BRAND_DARK})`,
              }}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-900/20 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:border-slate-900/35"
            >
              Direkt zum Login
              <ArrowRightIcon className="h-4 w-4" />
            </button>

            <p className="text-xs text-slate-500">
              Keine E-Mail erhalten? Prüfe Spam/Unbekannt oder warte 1–2 Minuten.
            </p>
          </div>
        </div>

        {/* Fußnote */}
        <p className="mt-8 text-center text-xs text-slate-500">
          Support: kontakt@software-fliesenleger.de · +49 5035 3169991
        </p>
      </div>
    </main>
  )
}

// src/components/CustomerLogoMarquee.tsx
'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'

type Logo = { src: string; alt: string }

// Geschwindigkeit in Pixel pro Sekunde
const SPEED_DESKTOP = 45
const SPEED_MOBILE = 35

export function CustomerLogoMarquee({ logos }: { logos: Logo[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    if (!track.children.length) return

    let offset = 0
    let lastTime = performance.now()
    let frameId: number

    const isMobile = window.innerWidth < 768
    const speed = isMobile ? SPEED_MOBILE : SPEED_DESKTOP

    const step = (time: number) => {
      const dt = (time - lastTime) / 1000
      lastTime = time

      const first = track.children[0] as HTMLElement | undefined
      if (!first) return

      offset -= speed * dt

      const firstWidth = first.offsetWidth

      // Sobald das erste Logo komplett draußen ist, nach hinten anhängen
      if (Math.abs(offset) >= firstWidth) {
        offset += firstWidth
        track.appendChild(first)
      }

      track.style.transform = `translate3d(${offset}px, 0, 0)`
      frameId = requestAnimationFrame(step)
    }

    frameId = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(frameId)
    }
  }, [])

  // Logos zwei Mal hintereinander, damit immer genug Material da ist
  const repeated = [...logos, ...logos]

  return (
    <section className="border-y border-slate-100">
      <div className="px-6 py-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
            Mehr Ruhe im Alltag mit GLENO
          </p>
          <h2 className="mt-2 text-sm font-semibold text-slate-900 sm:text-base">
            Über 1.000 Unternehmen organisieren ihre Aufträge, Projekte &amp;
            Rechnungen mit GLENO.
          </h2>
        </div>

        <div className="relative mt-6 -mx-6 overflow-hidden">
          <div
            ref={trackRef}
            className="flex items-center px-6"
            style={{ willChange: 'transform' }}
          >
            {repeated.map((logo, idx) => (
              <div
                key={`${logo.alt}-${idx}`}
                className="flex flex-shrink-0 items-center justify-center px-8 opacity-90 grayscale contrast-125 sm:px-10 md:px-14"
              >
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={220}
                  height={88}
                  className="h-8 w-auto sm:h-10 lg:h-12"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

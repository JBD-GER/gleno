// src/app/(app)/dashboard/buchhaltung/angebot/angebot-erstellen/Summary.tsx
'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAngebot } from './AngebotContext'

// Gleiche Logik wie bei den Toggles / Einstellungen
function labelFromTemplateName(fileName: string | null): string {
  if (!fileName) return 'Keine Auswahl'
  const n = fileName.toLowerCase()

  if (/(weiss|weiß|white)/.test(n)) return 'Standard'
  if (/beige/.test(n)) return 'Beige'
  if (/clean/.test(n)) return 'Clean'
  if (/modern/.test(n)) return 'Modern'
  if (/kompakt/.test(n)) return 'Kompakt'
  if (/premium/.test(n)) return 'Premium'
  if (/klassisch/.test(n)) return 'Klassisch'

  // Fallback: Dateiname ohne .pdf
  return fileName.replace(/\.pdf$/i, '')
}

export default function Summary({ onBack }: { onBack: () => void }) {
  const router = useRouter()

  const {
    selectedCustomer,
    offerId,
    offerNumber,
    date,
    validUntil,
    title,
    intro,
    positions,
    taxRate,
    billingSettings,
    discount,
  } = useAngebot()

  // ------- Anzeige-/Dateiname (stabil memoisieren) -------
  const displayName = useMemo(() => {
    const first = (selectedCustomer?.first_name ?? '').trim()
    const last = (selectedCustomer?.last_name ?? '').trim()
    const company = (selectedCustomer?.company as string | undefined)?.trim() ?? ''
    return company || `${first} ${last}`.trim()
  }, [selectedCustomer?.first_name, selectedCustomer?.last_name, selectedCustomer?.company])

  const safe = (s: string) =>
    (s || '').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '')

  const fallbackFilename = useMemo(() => {
    return (
      [
        safe(displayName),
        offerNumber || '',
        safe(selectedCustomer?.customer_number || ''),
      ]
        .filter(Boolean)
        .join('_') + '.pdf'
    )
  }, [displayName, offerNumber, selectedCustomer?.customer_number])

  // Menschlich lesbares Vorlagen-Label
  const templateLabel = useMemo(
    () => labelFromTemplateName(billingSettings?.template ?? null),
    [billingSettings?.template]
  )

  // ------- STABILE Abhängigkeit für den Fetch bauen -------
  const previewKey = useMemo(() => {
    return JSON.stringify({
      // Kunde
      customerId: selectedCustomer?.id ?? null,
      custFirst: selectedCustomer?.first_name ?? '',
      custLast: selectedCustomer?.last_name ?? '',
      custCompany: selectedCustomer?.company ?? '',
      custNo: selectedCustomer?.customer_number ?? '',
      // Meta
      offerNumber: offerNumber ?? '',
      offerId: offerId ?? null,
      date: date ?? '',
      validUntil: validUntil ?? '',
      title: title ?? '',
      intro: intro ?? '',
      taxRate: Number(taxRate ?? 0),
      template: billingSettings?.template ?? '',
      // Positionen/Discount
      positions: (positions || []).map(p => ({
        type: p.type,
        description: p.description ?? '',
        quantity: Number(p.quantity ?? 0),
        unitPrice: Number(p.unitPrice ?? 0),
        unit: p.unit ?? '',
      })),
      discount: {
        enabled: !!discount?.enabled,
        label: discount?.label ?? 'Rabatt',
        type: discount?.type ?? 'percent',
        base: discount?.base ?? 'net',
        value: Number(discount?.value ?? 0),
      },
    })
  }, [
    selectedCustomer?.id,
    selectedCustomer?.first_name,
    selectedCustomer?.last_name,
    selectedCustomer?.company,
    selectedCustomer?.customer_number,
    offerNumber,
    offerId,
    date,
    validUntil,
    title,
    intro,
    taxRate,
    billingSettings?.template,
    positions,
    discount,
  ])

  // ------- PDF Preview State -------
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [serverFilename, setServerFilename] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const lastUrlRef = useRef<string | null>(null)

  // ------- Preview abrufen -------
  useEffect(() => {
    let aborted = false

    async function fetchPdf() {
      // Guard: keine Anfrage ohne Kunde oder ohne offerNumber
      if (!selectedCustomer || !offerNumber) {
        setPdfUrl(null)
        setServerFilename(null)
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const payload = {
          customer: selectedCustomer,
          positions,
          meta: {
            title: title ?? '',
            intro: intro ?? '',
            commit: false, // Preview
            date: date ?? '',
            validUntil: validUntil ?? '',
            taxRate: Number(taxRate ?? 0),
            billingSettings: { template: billingSettings?.template ?? '' },
            offerNumber: offerNumber,
            offerId: offerId || undefined,
            discount: {
              enabled: !!discount?.enabled,
              label: discount?.label ?? 'Rabatt',
              type: discount?.type ?? 'percent',
              base: discount?.base ?? 'net',
              value: Number(discount?.value ?? 0),
            },
          },
        }

        const res = await fetch('/api/angebot/generate-offer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          console.error('Fehler beim Generieren des PDFs:', await res.text())
          if (!aborted) {
            setPdfUrl(null)
            setServerFilename(null)
          }
          return
        }

        const cd = res.headers.get('Content-Disposition') || ''
        let fnMatch =
          cd.match(/filename\*?=(?:UTF-8'')?"?([^"]+)"?/i)?.[1] ?? null
        if (fnMatch) {
          try {
            fnMatch = decodeURIComponent(fnMatch)
          } catch {}
        }

        const blob = await res.blob()
        const objUrl = URL.createObjectURL(blob)
        if (aborted) {
          URL.revokeObjectURL(objUrl)
          return
        }
        if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current)
        lastUrlRef.current = objUrl
        setPdfUrl(objUrl)
        setServerFilename(fnMatch ?? null)
      } finally {
        if (!aborted) setLoading(false)
      }
    }

    fetchPdf()
    return () => {
      aborted = true
    }
  }, [previewKey, selectedCustomer, offerNumber])

  // URL aufräumen beim Unmount
  useEffect(() => {
    return () => {
      if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current)
    }
  }, [])

  const handleDownload = () => {
    if (!pdfUrl) return
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = serverFilename || fallbackFilename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
        3. PDF-Vorschau
      </h2>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          ← Zurück
        </button>

        {/* NEU: Direkt zur Angebots-Übersicht */}
        <button
          onClick={() => router.push('/dashboard/buchhaltung/angebot')}
          className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          Zur Übersicht
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Vorschau für</p>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                {offerNumber || '—'} <span className="text-gray-400">•</span>{' '}
                <span className="text-gray-700">{displayName}</span>
              </h3>
              {serverFilename && (
                <p className="mt-1 text-xs text-gray-500">
                  Dateiname:{' '}
                  <span className="font-medium text-gray-700">
                    {serverFilename}
                  </span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!loading && pdfUrl && (
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-xs sm:text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Herunterladen
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-56 animate-pulse rounded bg-gray-200" />
              <div className="h-[480px] w-full animate-pulse rounded border border-dashed border-gray-200 bg-gray-50 sm:h-[640px] lg:h-[900px]" />
            </div>
          ) : pdfUrl ? (
            <div className="rounded-lg border border-gray-200">
              <iframe
                src={pdfUrl}
                className="h-[480px] w-full sm:h-[640px] lg:h-[900px]"
                title="Angebot PDF Vorschau"
              />
            </div>
          ) : (
            <p className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
              PDF wird geladen.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-gray-500">Titel</div>
            <div className="font-medium text-gray-900">{title || '—'}</div>
          </div>
          <div>
            <div className="text-gray-500">Zeitraum</div>
            <div className="font-medium text-gray-900">
              {date || '—'} {validUntil ? `bis ${validUntil}` : ''}
            </div>
          </div>
          <div>
            <div className="text-gray-500">USt</div>
            <div className="font-medium text-gray-900">{taxRate}%</div>
          </div>
          <div>
            <div className="text-gray-500">Vorlage</div>
            <div className="font-medium text-gray-900">
              {/* Lesbares Label + optional technischer Dateiname */}
              {templateLabel}
              {billingSettings?.template && (
                <span className="ml-2 text-xs text-gray-400 break-all">
                  ({billingSettings.template})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// src/app/(app)/dashboard/buchhaltung/rechnung/rechnung-erstellen/Summary.tsx
'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRechnung } from './RechnungContext'

type EInvState =
  | { status: 'idle' }
  | { status: 'working' }
  | { status: 'ready'; filename: string; downloadUrl: string; storagePath: string }
  | { status: 'error'; message: string }

export default function Summary({ onBack }: { onBack: () => void }) {
  const {
    selectedCustomer,
    invoiceNumber,          // aus Context (kann leer sein im Create-Flow)
    date,
    validUntil,
    title,
    intro,
    positions,
    taxRate,
    billingSettings,
    discount,
  } = useRechnung()

  // ------- Anzeige-/Dateiname (stabil) -------
  const displayName = useMemo(() => {
    const first = (selectedCustomer?.first_name ?? '').trim()
    const last  = (selectedCustomer?.last_name ?? '').trim()
    const company = (selectedCustomer?.company as string | undefined)?.trim() ?? ''
    return (company || `${first} ${last}`.trim()).trim()
  }, [selectedCustomer?.first_name, selectedCustomer?.last_name, selectedCustomer?.company])

  const safe = (s: string) =>
    (s || '').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '')

  const fallbackFilename = useMemo(() => {
    return [
      safe(displayName),
      invoiceNumber || 'Entwurf',
      safe(selectedCustomer?.customer_number || ''),
    ].filter(Boolean).join('_') + '.pdf'
  }, [displayName, invoiceNumber, selectedCustomer?.customer_number])

  // ------- stabiler previewKey wie beim Angebot -------
  const previewKey = useMemo(() => {
    return JSON.stringify({
      // Kunde
      customerId: selectedCustomer?.id ?? null,
      custFirst: selectedCustomer?.first_name ?? '',
      custLast: selectedCustomer?.last_name ?? '',
      custCompany: selectedCustomer?.company ?? '',
      custNo: selectedCustomer?.customer_number ?? '',
      // Meta
      invoiceNumber: invoiceNumber ?? '',
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
        unit: p.unit ?? ''
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
    invoiceNumber,
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

  // ------- E-Rechnung State -------
  const [eInv, setEInv] = useState<EInvState>({ status: 'idle' })

  // ------- Preview abrufen (ohne AbortController) -------
  useEffect(() => {
    let ignore = false

    async function fetchPdf() {
      // Guard: ohne Kunde oder ohne Template keine Anfrage
      if (!selectedCustomer || !billingSettings?.template) {
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
            commit: false,                 // << Preview
            date: date ?? '',
            validUntil: validUntil ?? '',
            taxRate: Number(taxRate ?? 0),
            billingSettings: { template: billingSettings.template },
            // Wenn invoiceNumber existiert (Edit), mitschicken:
            invoiceNumber: invoiceNumber || undefined,
            discount: {
              enabled: !!discount?.enabled,
              label: discount?.label ?? 'Rabatt',
              type: discount?.type ?? 'percent',
              base: discount?.base ?? 'net',
              value: Number(discount?.value ?? 0),
            },
          },
        }

        const res = await fetch('/api/rechnung/generate-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          console.error('Fehler beim Generieren des PDFs:', await res.text())
          if (!ignore) {
            setPdfUrl(null)
            setServerFilename(null)
          }
          return
        }

        // Dateiname aus Header
        const cd = res.headers.get('Content-Disposition') || ''
        let fnMatch = cd.match(/filename\*?=(?:UTF-8'')?"?([^"]+)"?/i)?.[1] ?? null
        if (fnMatch) { try { fnMatch = decodeURIComponent(fnMatch) } catch {} }

        const blob = await res.blob()
        const objUrl = URL.createObjectURL(blob)
        if (ignore) {
          URL.revokeObjectURL(objUrl)
          return
        }
        if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current)
        lastUrlRef.current = objUrl
        setPdfUrl(objUrl)
        setServerFilename(fnMatch ?? null)
      } catch (e) {
        if (!ignore) {
          console.warn('Preview fehlgeschlagen:', e)
          setPdfUrl(null)
          setServerFilename(null)
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    fetchPdf()
    return () => { ignore = true }
  }, [previewKey, selectedCustomer, billingSettings?.template])

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

  // ----------- E-Rechnung: erzeugen -----------
  const createEInvoice = async () => {
    if (!selectedCustomer) return
    setEInv({ status: 'working' })
    try {
      const payload = {
        customer: selectedCustomer,
        positions,
        meta: {
          // gleiche Meta wie PDF – wichtig für Konsistenz
          invoiceNumber: invoiceNumber || undefined,
          date: date ?? '',
          validUntil: validUntil ?? '',
          title: title ?? '',
          intro: intro ?? '',
          taxRate: Number(taxRate ?? 0),
          discount: {
            enabled: !!discount?.enabled,
            label: discount?.label ?? 'Rabatt',
            type: discount?.type ?? 'percent',
            base: discount?.base ?? 'net',
            value: Number(discount?.value ?? 0),
          },
          currency: 'EUR', // XRechnung üblich
          // optional route fields (Leitweg-ID etc.) werden serverseitig aus Customer/DB gelesen
        },
      }

      const res = await fetch('/api/rechnung/e-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const txt = await res.text().catch(()=> '')
        throw new Error(txt || 'E-Rechnung konnte nicht erzeugt werden.')
      }

      const json = await res.json() as {
        filename: string
        storagePath: string
        downloadUrl: string
      }

      setEInv({ status: 'ready', filename: json.filename, downloadUrl: json.downloadUrl, storagePath: json.storagePath })
    } catch (e: any) {
      setEInv({ status: 'error', message: e?.message || 'Fehler beim Erzeugen der E-Rechnung.' })
    }
  }

  // ----------- E-Rechnung: **direkt herunterladen** (ohne neue Seite) -----------
  const downloadEInvoice = async () => {
    if (eInv.status !== 'ready') return
    try {
      // 1) Datei als Blob holen (verhindert Inline-Ansicht, selbst wenn der Server "inline" antwortet)
      const res = await fetch(eInv.downloadUrl, { cache: 'no-store' })
      if (!res.ok) throw new Error('Download fehlgeschlagen.')
      const blob = await res.blob()

      // 2) ObjectURL erstellen und als "attachment" speichern
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = eInv.filename || 'rechnung.xml'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // 3) Aufräumen (kleine Verzögerung, damit der Browser den Download starten kann)
      setTimeout(() => URL.revokeObjectURL(url), 1500)
    } catch (err) {
      console.error('XML-Download-Fehler:', err)
      setEInv({ status: 'error', message: 'Download der E-Rechnung fehlgeschlagen.' })
    }
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
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500">Vorschau für</p>
              <h3 className="text-base font-semibold text-gray-900">
                {(invoiceNumber || 'Entwurf')} <span className="text-gray-400">•</span>{' '}
                <span className="text-gray-700">{displayName || '—'}</span>
              </h3>
              {(serverFilename || fallbackFilename) && (
                <p className="mt-1 text-xs text-gray-500">
                  Dateiname:{' '}
                  <span className="font-medium text-gray-700">
                    {serverFilename || fallbackFilename}
                  </span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!loading && pdfUrl && (
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
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
              <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-64 animate-pulse rounded bg-gray-200" />
              <div className="h-[800px] w-full animate-pulse rounded border border-dashed border-gray-200 bg-gray-50" />
            </div>
          ) : pdfUrl ? (
            <div className="rounded-lg border border-gray-200">
              <iframe
                src={pdfUrl}
                className="h-[800px] w-full"
                title="Rechnung PDF Vorschau"
              />
            </div>
          ) : (
            <p className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
              PDF wird geladen.
            </p>
          )}
        </div>
      </div>

      {/* ---------- Neue Box: E-Rechnung (DIN/EN 16931, XRechnung-DE) ---------- */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-[680px]">
            <h3 className="text-base font-semibold text-gray-900">
              E-Rechnung <span className="text-gray-500">(EN 16931 / XRechnung-DE)</span>
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Erzeugt eine maschinenlesbare XML-Rechnung nach EN 16931 (deutsche CIUS „XRechnung“) – geeignet für
              die elektronische Rechnungsstellung an öffentliche Auftraggeber gemäß EU-Vergaberichtlinie.
            </p>

            {/* kleine technische Zusammenfassung */}
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-600">
              <li>Profil: <span className="font-medium text-gray-800">XRechnung</span> (UBL&nbsp;2.1)</li>
              <li>Währung: EUR • Steuersatz: {Number(taxRate ?? 0)}%</li>
              <li>Dateiname bei Export: <code className="rounded bg-gray-50 px-1 py-0.5">{(invoiceNumber || 'Rechnung') + '.xml'}</code></li>
            </ul>

            {/* Status */}
            <div className="mt-3 text-sm">
              {eInv.status === 'idle' && (
                <p className="text-gray-500">Noch nicht erzeugt.</p>
              )}
              {eInv.status === 'working' && (
                <p className="text-gray-700">Erzeuge E-Rechnung …</p>
              )}
              {eInv.status === 'ready' && (
                <p className="text-emerald-700">
                  E-Rechnung gespeichert unter <span className="font-medium">{eInv.filename}</span>. Du kannst sie jetzt herunterladen.
                </p>
              )}
              {eInv.status === 'error' && (
                <p className="text-rose-700">Fehler: {eInv.message}</p>
              )}
            </div>
          </div>

          <div className="shrink-0 space-y-2">
            <button
              onClick={createEInvoice}
              disabled={eInv.status === 'working' || !selectedCustomer}
              className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-black disabled:opacity-50"
            >
              {eInv.status === 'working' ? 'Erzeuge …' : 'E-Rechnung erzeugen'}
            </button>
            {eInv.status === 'ready' && (
              <button
                onClick={downloadEInvoice}
                className="inline-flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
              >
                XML herunterladen
              </button>
            )}
          </div>
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
              {billingSettings?.template || '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

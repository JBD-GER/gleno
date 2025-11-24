'use client'

// src/app/(app)/dashboard/buchhaltung/rechnung/rechnung-erstellen/Summary.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRechnung } from './RechnungContext'

type EInvState =
  | { status: 'idle' }
  | { status: 'working' }
  | { status: 'ready'; filename: string; downloadUrl: string; storagePath: string }
  | { status: 'error'; message: string }

// Mapped Label für Template-Namen (wie in den Einstellungen)
function labelFromTemplateName(fileName: string | null | undefined): string {
  if (!fileName) return 'Standard'
  const n = fileName.toLowerCase()

  if (/(weiss|weiß|white|standard)/.test(n)) return 'Standard'
  if (/beige/.test(n)) return 'Beige'
  if (/clean/.test(n)) return 'Clean'
  if (/modern/.test(n)) return 'Modern'
  if (/kompakt/.test(n)) return 'Kompakt'
  if (/premium/.test(n)) return 'Premium'
  if (/klassisch/.test(n)) return 'Klassisch'
  return 'Eigene Vorlage'
}

export default function Summary({ onBack }: { onBack: () => void }) {
  const router = useRouter()
  const {
    selectedCustomer,
    invoiceNumber,
    date,
    validUntil,
    title,
    intro,
    positions,
    taxRate,
    billingSettings,
    discount,
  } = useRechnung()

  /* ---------- Dateinamen & Anzeige ---------- */
  const displayName = useMemo(() => {
    const first = (selectedCustomer?.first_name ?? '').trim()
    const last = (selectedCustomer?.last_name ?? '').trim()
    const company = (selectedCustomer?.company as string | undefined)?.trim() ?? ''
    return (company || `${first} ${last}`.trim()).trim()
  }, [selectedCustomer?.first_name, selectedCustomer?.last_name, selectedCustomer?.company])

  const safe = (s: string) =>
    (s || '').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '')

  const fallbackFilename = useMemo(
    () =>
      [
        safe(displayName),
        invoiceNumber || 'Entwurf',
        safe(selectedCustomer?.customer_number || ''),
      ]
        .filter(Boolean)
        .join('_') + '.pdf',
    [displayName, invoiceNumber, selectedCustomer?.customer_number]
  )

  const previewKey = useMemo(
    () =>
      JSON.stringify({
        customerId: selectedCustomer?.id ?? null,
        custFirst: selectedCustomer?.first_name ?? '',
        custLast: selectedCustomer?.last_name ?? '',
        custCompany: selectedCustomer?.company ?? '',
        custNo: selectedCustomer?.customer_number ?? '',
        invoiceNumber: invoiceNumber ?? '',
        date: date ?? '',
        validUntil: validUntil ?? '',
        title: title ?? '',
        intro: intro ?? '',
        taxRate: Number(taxRate ?? 0),
        template: billingSettings?.template ?? '',
        positions: (positions || []).map((p) => ({
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
      }),
    [
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
    ]
  )

  /* ---------- PDF Preview State ---------- */
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [serverFilename, setServerFilename] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const lastUrlRef = useRef<string | null>(null)

  /* ---------- E-Rechnung State ---------- */
  const [eInv, setEInv] = useState<EInvState>({ status: 'idle' })

  /* ---------- Preview abrufen ---------- */
  useEffect(() => {
    let ignore = false

    async function fetchPdf() {
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
            commit: false,
            date: date ?? '',
            validUntil: validUntil ?? '',
            taxRate: Number(taxRate ?? 0),
            billingSettings: { template: billingSettings.template },
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
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
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
    return () => {
      ignore = true
    }
  }, [previewKey, selectedCustomer, billingSettings?.template])

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

  /* ---------- E-Rechnung erzeugen ---------- */
  const createEInvoice = async () => {
    if (!selectedCustomer) return
    setEInv({ status: 'working' })
    try {
      const payload = {
        customer: selectedCustomer,
        positions,
        meta: {
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
          currency: 'EUR',
        },
      }

      const res = await fetch('/api/rechnung/e-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(txt || 'E-Rechnung konnte nicht erzeugt werden.')
      }

      const json = (await res.json()) as {
        filename: string
        storagePath: string
        downloadUrl: string
      }

      setEInv({
        status: 'ready',
        filename: json.filename,
        storagePath: json.storagePath,
        downloadUrl: json.downloadUrl,
      })
    } catch (e: any) {
      setEInv({
        status: 'error',
        message: e?.message || 'Fehler beim Erzeugen der E-Rechnung.',
      })
    }
  }

  const downloadEInvoice = async () => {
    if (eInv.status !== 'ready') return
    try {
      const res = await fetch(eInv.downloadUrl, { cache: 'no-store' })
      if (!res.ok) throw new Error('Download fehlgeschlagen.')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = eInv.filename || 'rechnung.xml'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1500)
    } catch (err) {
      console.error('XML-Download-Fehler:', err)
      setEInv({
        status: 'error',
        message: 'Download der E-Rechnung fehlgeschlagen.',
      })
    }
  }

  const templateLabel = labelFromTemplateName(billingSettings?.template || null)
  const autoRefreshEnabled = true // nur Anzeige-Status für Toggle-Optik

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
        3. PDF-Vorschau
      </h2>

      {/* Navigation Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
        >
          ← Zurück
        </button>
        <button
          onClick={() => router.push('/dashboard/buchhaltung/rechnung')}
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
        >
          Zur Übersicht
        </button>
      </div>

      {/* PDF-Card */}
      <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Vorschau für</p>
              <h3 className="text-sm font-semibold text-slate-900 sm:text-base">
                {invoiceNumber || 'Entwurf'}{' '}
                <span className="text-slate-400">•</span>{' '}
                <span className="text-slate-700">{displayName || '—'}</span>
              </h3>
              {(serverFilename || fallbackFilename) && (
                <p className="text-[11px] text-slate-500">
                  Dateiname:{' '}
                  <span className="font-medium text-slate-800">
                    {serverFilename || fallbackFilename}
                  </span>
                </p>
              )}
            </div>

            {/* Rechts: Template + Toggle-Optik + Download */}
            <div className="flex flex-col items-end gap-2 text-xs">
              <div className="flex items-center gap-2">
                
              </div>

              <div className="flex flex-col items-end text-[11px] text-slate-600">
                <span className="uppercase tracking-wide text-slate-400">
                  Vorlage
                </span>
                <span className="font-medium text-slate-900">
                  {templateLabel}
                </span>
              </div>

              {!loading && pdfUrl && (
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  PDF herunterladen
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
              <div className="h-[420px] w-full animate-pulse rounded-xl border border-dashed border-slate-200 bg-slate-50 sm:h-[620px] lg:h-[860px]" />
            </div>
          ) : pdfUrl ? (
            <div className="rounded-xl border border-slate-200">
              <iframe
                src={pdfUrl}
                className="h-[420px] w-full sm:h-[620px] lg:h-[860px]"
                title="Rechnung PDF Vorschau"
              />
            </div>
          ) : (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              PDF wird geladen.
            </p>
          )}
        </div>
      </div>

      {/* E-Rechnung Box */}
      <div className="rounded-2xl border border-white/70 bg-white/95 p-4 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-[680px] space-y-2 text-sm">
            <h3 className="text-base font-semibold text-slate-900">
              E-Rechnung{' '}
              <span className="text-xs font-normal text-slate-500">
                (EN 16931 / XRechnung-DE)
              </span>
            </h3>
            <p className="text-slate-600">
              Erzeugt eine maschinenlesbare XML-Rechnung nach EN 16931 (deutsche CIUS
              „XRechnung“) – ideal für öffentliche Auftraggeber und Unternehmen mit
              E-Invoicing-Pflicht.
            </p>

            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
              <li>
                Profil: <span className="font-medium text-slate-800">XRechnung (UBL 2.1)</span>
              </li>
              <li>
                Währung: EUR • USt: {Number(taxRate ?? 0)}%
              </li>
              <li>
                Vorgeschlagener Dateiname:{' '}
                <code className="rounded bg-slate-50 px-1 py-0.5">
                  {(invoiceNumber || 'Rechnung') + '.xml'}
                </code>
              </li>
            </ul>

            <div className="mt-2 text-xs">
              {eInv.status === 'idle' && (
                <p className="text-slate-500">Noch keine E-Rechnung erzeugt.</p>
              )}
              {eInv.status === 'working' && (
                <p className="text-slate-700">E-Rechnung wird erzeugt…</p>
              )}
              {eInv.status === 'ready' && (
                <p className="text-emerald-700">
                  E-Rechnung gespeichert als{' '}
                  <span className="font-medium">{eInv.filename}</span>. Sie kann jetzt
                  heruntergeladen werden.
                </p>
              )}
              {eInv.status === 'error' && (
                <p className="text-rose-700">Fehler: {eInv.message}</p>
              )}
            </div>
          </div>

          <div className="flex w-full max-w-xs flex-col gap-2 sm:w-auto">
            <button
              onClick={createEInvoice}
              disabled={eInv.status === 'working' || !selectedCustomer}
              className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {eInv.status === 'working' ? 'Erzeuge …' : 'E-Rechnung erzeugen'}
            </button>
            {eInv.status === 'ready' && (
              <button
                onClick={downloadEInvoice}
                className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
              >
                XML herunterladen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Meta-Infos unten */}
      <div className="rounded-2xl border border-white/70 bg-white/95 p-4 text-sm text-slate-600 shadow-sm backdrop-blur-xl">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Titel
            </div>
            <div className="font-medium text-slate-900">{title || '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Zeitraum
            </div>
            <div className="font-medium text-slate-900">
              {date || '—'} {validUntil ? `bis ${validUntil}` : ''}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">
              USt-Satz
            </div>
            <div className="font-medium text-slate-900">{taxRate}%</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Vorlage
            </div>
            <div className="font-medium text-slate-900">
              {templateLabel}{' '}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

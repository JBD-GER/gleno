'use client'

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useAngebot } from './AngebotContext'
import type { Position } from './AngebotContext'
import { normalizeDraft, replacePlaceholders, type AIDraft } from '@/lib/ai-draft'

type OfferTemplate = {
  id: string
  name: string
  title: string | null
  intro: string | null
  tax_rate: number
  positions: any[]
  updated_at?: string
}

// ---- Utils ----
function norm(s: string) {
  return (s || '')
    .toString()
    .normalize('NFD')
    // @ts-ignore
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}
function tokens(q: string) {
  return norm(q).split(/\s+/).filter(Boolean)
}

// Anzeigename: Firma bevorzugen, sonst Vor- & Nachname
function displayNameOf(c: any) {
  const company = (c?.company ?? '').toString().trim()
  const first = (c?.first_name ?? '').toString().trim()
  const last = (c?.last_name ?? '').toString().trim()
  return company || `${first} ${last}`.trim()
}

// NEU: Draft -> Positions Normalisierung ins Angebots-Format
function draftToPositions(d: AIDraft, customer: any): Position[] {
  return (d.positions ?? []).map((p) => {
    const desc = replacePlaceholders(String(p.description ?? ''), customer)
    return {
      type: p.type,
      description: desc,
      quantity: Number.isFinite(p.quantity) ? Number(p.quantity) : undefined,
      unit: p.unit,
      unitPrice: Number.isFinite(p.unitPrice) ? Number(p.unitPrice) : undefined,
    }
  })
}

export default function CustomerSelect({ onNext }: { onNext?: () => void }) {
  const {
    customers,
    selectedCustomer,
    setSelectedCustomer,
    setTitle,
    setIntro,
    setTaxRate,
    setPositions,
    setDiscount,
  } = useAngebot()

  // ── Kunde suchen
  const [query, setQuery] = useState('')
  const [showCustomerResults, setShowCustomerResults] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState<number>(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredCustomers = useMemo(() => {
    const qs = tokens(query)
    if (!qs.length) return []
    return customers.filter((c) => {
      const company = (c as any)?.company ?? ''
      const hay = [
        norm(company),
        norm(c.first_name),
        norm(c.last_name),
        norm(c.email || ''),
        norm(c.customer_number || ''),
        norm(`${c.first_name} ${c.last_name}`),
        norm(`${c.last_name} ${c.first_name}`),
        norm(`${company} ${c.first_name} ${c.last_name}`),
        norm(`${c.first_name} ${c.last_name} ${company}`),
      ].join(' | ')
      return qs.every((t) => hay.includes(t))
    })
  }, [query, customers])

  const pickCustomer = useCallback((c: (typeof customers)[number]) => {
    setSelectedCustomer(c)
    setQuery(displayNameOf(c))
    setShowCustomerResults(false)
  }, [setSelectedCustomer])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showCustomerResults || !filteredCustomers.length) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightIdx((i) => (i + 1) % filteredCustomers.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightIdx((i) => (i <= 0 ? filteredCustomers.length - 1 : i - 1))
      } else if (e.key === 'Enter' && highlightIdx >= 0) {
        e.preventDefault()
        pickCustomer(filteredCustomers[highlightIdx])
      }
    },
    [filteredCustomers, highlightIdx, pickCustomer, showCustomerResults]
  )

  useEffect(() => { setHighlightIdx(-1) }, [query])

  // ── Templates laden (wie gehabt)
  const [tpls, setTpls] = useState<OfferTemplate[]>([])
  const [tplLoading, setTplLoading] = useState(false)
  const [tplErr, setTplErr] = useState<string | null>(null)
  const [tplQuery, setTplQuery] = useState('')
  const [appliedTplId, setAppliedTplId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setTplLoading(true)
      setTplErr(null)
      try {
        const res = await fetch('/api/angebot/templates', { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.message || 'Fehler beim Laden')
        if (!cancelled) setTpls(Array.isArray(data) ? data : [])
      } catch (e: any) {
        if (!cancelled) setTplErr(e?.message || 'Konnte Templates nicht laden.')
      } finally {
        if (!cancelled) setTplLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filteredTpls = useMemo(() => {
    const q = tokens(tplQuery)
    if (!q.length) return tpls
    return tpls.filter((t) => {
      const hay = norm(`${t.title ?? ''} ${t.name}`)
      return q.every((tok) => hay.includes(tok))
    })
  }, [tplQuery, tpls])

  function normalizePositions(raw: any[]): Position[] {
    return (raw ?? []).map((p: any) => {
      const type = ['item', 'heading', 'description', 'subtotal', 'separator'].includes(p?.type)
        ? p.type
        : 'item'
      return {
        type,
        description: String(p?.description ?? ''),
        quantity: Number.isFinite(p?.quantity) ? Number(p.quantity) : undefined,
        unit: p?.unit ?? undefined,
        unitPrice: Number.isFinite(p?.unitPrice) ? Number(p.unitPrice) : undefined,
      }
    })
  }

  const applyTemplate = (tpl: OfferTemplate) => {
    if (!selectedCustomer) return
    setTitle(tpl.title ?? '')
    setIntro(tpl.intro ?? '')
    setTaxRate(Number.isFinite(tpl.tax_rate) ? tpl.tax_rate : 19)
    setPositions(normalizePositions(tpl.positions || []))
    setAppliedTplId(tpl.id)
  }

  const handleNext = () => {
    if (!selectedCustomer) return
    onNext?.()
  }

  // ─────────────────────────────────────────────────────────────
  // NEU: KI-Entwurf aus sessionStorage anbieten (minimal-invasiv)
  // ─────────────────────────────────────────────────────────────
  const [aiDraftAvailable, setAiDraftAvailable] = useState(false)
  const [aiApplied, setAiApplied] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('ai_offer_draft')
      setAiDraftAvailable(!!raw)
    } catch {}
  }, [])

  const applyAIDraft = () => {
    if (!selectedCustomer) return
    try {
      const raw = sessionStorage.getItem('ai_offer_draft')
      if (!raw) return
      const parsed = normalizeDraft(JSON.parse(raw))

      // Platzhalter im Titel/Intro ersetzen
      const title = parsed.title ? replacePlaceholders(parsed.title, selectedCustomer) : ''
      const intro = parsed.intro ? replacePlaceholders(parsed.intro, selectedCustomer) : ''

      setTitle(title)
      setIntro(intro)
      setTaxRate(Number.isFinite(parsed.tax_rate) ? Number(parsed.tax_rate) : 19)
      setPositions(draftToPositions(parsed, selectedCustomer))
      if (parsed.discount) {
        setDiscount({
          enabled: !!parsed.discount.enabled,
          label: parsed.discount.label || 'Rabatt',
          type: parsed.discount.type === 'amount' ? 'amount' : 'percent',
          base: parsed.discount.base === 'gross' ? 'gross' : 'net',
          value: Number.isFinite(parsed.discount.value) ? Number(parsed.discount.value) : 0,
        })
      }
      setAiApplied(true)
      // Draft optional nach Übernahme löschen, damit er nicht erneut angezeigt wird:
      // sessionStorage.removeItem('ai_offer_draft')
    } catch {}
  }
  // ─────────────────────────────────────────────────────────────

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold tracking-tight text-gray-900">1. Kunde wählen</h2>

      {/* NEU: KI-Entwurf-Leiste – erscheint nur, wenn Draft vorhanden */}
      {aiDraftAvailable && (
        <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50/70 p-3 text-sm text-indigo-900">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="font-medium">KI-Entwurf gefunden</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { sessionStorage.removeItem('ai_offer_draft'); setAiDraftAvailable(false) }}
                className="rounded-md border border-indigo-200 bg-white px-3 py-1 hover:bg-indigo-50"
                title="Entwurf verwerfen"
              >
                Verwerfen
              </button>
              <button
                onClick={applyAIDraft}
                disabled={!selectedCustomer}
                className={`rounded-md px-3 py-1 text-white ${selectedCustomer ? 'bg-slate-900 hover:bg-slate-800' : 'bg-slate-400'}`}
                title={!selectedCustomer ? 'Bitte zuerst einen Kunden wählen' : 'Entwurf übernehmen'}
              >
                KI-Entwurf anwenden
              </button>
            </div>
          </div>
          {aiApplied && <div className="mt-2 text-xs text-indigo-700">Entwurf übernommen – prüfe Titel, Intro und Positionen.</div>}
        </div>
      )}

      {/* Kundensuche (unverändert) */}
      <div className="mb-3 relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Firma, Vorname, Nachname, E-Mail oder Kundennr. suchen…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowCustomerResults(!!e.target.value.trim()) }}
          onFocus={() => setShowCustomerResults(!!query.trim())}
          onKeyDown={onKeyDown}
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 pr-9 text-gray-900 outline-none ring-indigo-200/60 focus:ring-4"
        />
        {query && (
          <button
            type="button"
            aria-label="Suche leeren"
            title="Suche leeren"
            onClick={() => { setQuery(''); setShowCustomerResults(false); setHighlightIdx(-1) }}
            className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
          >
            ×
          </button>
        )}

        {showCustomerResults && (
          <div className="absolute z-10 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
            {filteredCustomers.length > 0 ? (
              <ul className="max-h-60 overflow-auto">
                {filteredCustomers.map((c, idx) => {
                  const isActive = selectedCustomer?.id === c.id
                  const isHighlight = idx === highlightIdx
                  const company = (c as any)?.company?.toString().trim()
                  const person = `${c.first_name} ${c.last_name}`.trim()
                  const name = displayNameOf(c)
                  return (
                    <li
                      key={c.id}
                      className={[
                        'flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors',
                        isActive ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-gray-50',
                        isHighlight && !isActive ? 'bg-slate-50' : '',
                      ].join(' ')}
                      onMouseEnter={() => setHighlightIdx(idx)}
                      onMouseLeave={() => setHighlightIdx(-1)}
                      onClick={() => pickCustomer(c)}
                      title="Kunde auswählen"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-gray-900">{name}</div>
                        <div className="truncate text-xs text-gray-500">
                          {company ? person : null}
                          {company && c.email ? ' • ' : ''}{c.email}
                          {c.customer_number ? ` • ${c.customer_number}` : ''}
                        </div>
                      </div>
                      {isActive && (
                        <span className="ml-2 shrink-0 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                          gewählt
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="p-3 text-sm text-gray-500">Keine Kunden gefunden.</div>
            )}
          </div>
        )}
      </div>

      {/* Templates (wie gehabt) */}
      <div className="mt-8">
        <h3 className="mb-3 text-lg font-semibold text-gray-900">Optional: Template auswählen &amp; übernehmen</h3>

        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="text"
            placeholder="Templates nach Titel oder Name suchen…"
            value={tplQuery}
            onChange={(e) => setTplQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-900 outline-none ring-indigo-200/60 focus:ring-4 sm:max-w-md"
          />
          <div className="text-sm text-gray-500">
            {tplLoading
              ? 'Lade Templates…'
              : tplErr
                ? <span className="text-rose-600">{tplErr}</span>
                : (tplQuery.trim() ? `${filteredTpls.length} Treffer` : `${tpls.length} Templates`)}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200">
          {tplLoading ? (
            <div className="p-4 text-sm text-gray-600">Lade…</div>
          ) : filteredTpls.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">Keine Templates gefunden.</div>
          ) : (
            <ul className="max-h-72 overflow-auto divide-y divide-gray-100">
              {filteredTpls.map((t) => {
                const picked = appliedTplId === t.id
                return (
                  <li key={t.id} className="flex items-start gap-3 px-3 py-3 hover:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium text-gray-900">{t.name}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                          {t.tax_rate}% USt
                        </span>
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-100">
                          {Array.isArray(t.positions) ? t.positions.length : 0} Pos.
                        </span>
                      </div>
                      {(t.title || t.intro) && (
                        <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                          {t.title ?? ''}{t.title && t.intro ? ' — ' : ''}{t.intro ?? ''}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      <button
                        onClick={() => applyTemplate(t)}
                        disabled={!selectedCustomer}
                        title={!selectedCustomer ? 'Bitte zuerst einen Kunden wählen' : (picked ? 'Template ausgewählt' : 'Template übernehmen')}
                        className={[
                          'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                          picked
                            ? 'bg-indigo-600 text-white'
                            : selectedCustomer
                              ? 'border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50'
                              : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400',
                        ].join(' ')}
                      >
                        {picked ? '✓ Ausgewählt' : 'Übernehmen'}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {onNext && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleNext}
            disabled={!selectedCustomer}
            className={`rounded-lg px-4 py-2 text-white ${
              selectedCustomer ? 'bg-primary hover:bg-primary-dark' : 'bg-slate-300'
            }`}
            title={!selectedCustomer ? 'Bitte zuerst einen Kunden wählen' : 'Weiter'}
          >
            Weiter
          </button>
        </div>
      )}
    </div>
  )
}

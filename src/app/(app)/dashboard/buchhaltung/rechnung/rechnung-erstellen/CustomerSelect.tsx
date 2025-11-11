'use client'

// src/app/(app)/dashboard/buchhaltung/rechnung-erstellen/CustomerSelect.tsx
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useRechnung } from './RechnungContext'

// ---- Utils (wie im Angebot) ----
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

export default function CustomerSelect() {
  const { customers, selectedCustomer, setSelectedCustomer } = useRechnung()

  // Suche / Dropdown / Keyboard
  const [query, setQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState<number>(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  // Gefilterte Kunden (token-basiert, sucht Firma/Name/Email/Kundennr.)
  const filtered = useMemo(() => {
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

  // Auswahl übernehmen
  const pickCustomer = useCallback((c: (typeof customers)[number]) => {
    setSelectedCustomer(c)
    setQuery(displayNameOf(c))      // Eingabefeld mit Display-Name (Firma bevorzugt) füllen
    setShowResults(false)
  }, [setSelectedCustomer])

  // Keyboard-Steuerung in der Liste
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showResults || !filtered.length) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightIdx((i) => (i + 1) % filtered.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightIdx((i) => (i <= 0 ? filtered.length - 1 : i - 1))
      } else if (e.key === 'Enter' && highlightIdx >= 0) {
        e.preventDefault()
        pickCustomer(filtered[highlightIdx])
      }
    },
    [filtered, highlightIdx, pickCustomer, showResults]
  )

  useEffect(() => { setHighlightIdx(-1) }, [query])

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold tracking-tight text-gray-900">
        1. Kunde wählen
      </h2>

      <div className="relative mb-6">
        <input
          ref={inputRef}
          type="text"
          placeholder="Firma, Vorname, Nachname, E-Mail oder Kundennummer suchen…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowResults(!!e.target.value.trim()) }}
          onFocus={() => setShowResults(!!query.trim())}
          onKeyDown={onKeyDown}
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 pr-9 text-gray-900 outline-none ring-indigo-200/60 focus:ring-4"
        />
        {query && (
          <button
            type="button"
            aria-label="Suche leeren"
            title="Suche leeren"
            onClick={() => { setQuery(''); setShowResults(false); setHighlightIdx(-1) }}
            className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
          >
            ×
          </button>
        )}

        {showResults && (
          <div className="absolute z-10 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
            {filtered.length > 0 ? (
              <ul className="max-h-60 overflow-auto">
                {filtered.map((c, idx) => {
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
                          {company && c.email ? ' • ' : ''}
                          {c.email}
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
    </div>
  )
}

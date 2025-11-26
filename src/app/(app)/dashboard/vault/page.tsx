'use client'

import { useState, useRef, FormEvent } from 'react'
import {
  LockClosedIcon,
  ShieldCheckIcon,
  KeyIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import CredentialsModule from './CredentialsModule'
import LicensesModule from './LicensesModule'
import ContractsModule from './ContractsModule'

const pillButtonBase =
  'inline-flex items-center justify-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap'

type TabKey = 'credentials' | 'licenses' | 'contracts'

export default function VaultPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('credentials')

  // Suchfeld-States
  const [search, setSearch] = useState('')
  const [searchMessage, setSearchMessage] = useState<string | null>(null)

  // Container-Refs für alle drei Tabs
  const credentialsRef = useRef<HTMLDivElement | null>(null)
  const licensesRef = useRef<HTMLDivElement | null>(null)
  const contractsRef = useRef<HTMLDivElement | null>(null)

  const tabLabel = (tab: TabKey) =>
    tab === 'credentials'
      ? 'Zugangsdaten'
      : tab === 'licenses'
      ? 'Lizenzen'
      : 'Verträge'

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault()
    const query = search.trim().toLowerCase()
    setSearchMessage(null)

    if (!query) return

    // Map der Bereiche
    const containers: { key: TabKey; root: HTMLElement | null }[] = [
      { key: 'credentials', root: credentialsRef.current },
      { key: 'licenses', root: licensesRef.current },
      { key: 'contracts', root: contractsRef.current },
    ]

    let foundTab: TabKey | null = null
    let target: HTMLElement | null = null

    // Über alle Tabs iterieren, bis ein Treffer gefunden ist
    for (const { key, root } of containers) {
      if (!root) continue

      const all = Array.from(
        root.querySelectorAll<HTMLElement>(
          'article,div,section,li,tr,td,span,p,h1,h2,h3,h4,h5,h6,a,button',
        ),
      )

      for (const el of all) {
        const text = (el.textContent || '').toLowerCase()
        if (text.includes(query)) {
          foundTab = key
          target = el
          break
        }
      }

      if (foundTab && target) break
    }

    if (!foundTab || !target) {
      setSearchMessage(`Keinen Treffer für „${search}“ im Tresor gefunden.`)
      return
    }

    // Korrekte Tab aktivieren
    setActiveTab(foundTab)

    // nach dem Rendern scrollen & highlighten
    setTimeout(() => {
      if (!target) return
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      target.classList.add(
        'ring-2',
        'ring-indigo-300',
        'bg-indigo-50/60',
        'transition-colors',
      )
      setTimeout(() => {
        target?.classList.remove(
          'ring-2',
          'ring-indigo-300',
          'bg-indigo-50/60',
          'transition-colors',
        )
      }, 1500)
    }, 150)

    setSearchMessage(
      `Erster Treffer für „${search}“ im Bereich ${tabLabel(foundTab)} hervorgehoben.`,
    )
  }

  return (
    <div className="w-full space-y-6 px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
      {/* Header-Box */}
      <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-4 shadow-sm backdrop-blur-xl sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm">
              <LockClosedIcon className="h-4 w-4 text-slate-900" />
              <span>Blockchain · Tresor</span>
            </div>
            <h1 className="text-lg font-semibold text-slate-900 sm:text-xl md:text-2xl">
              Sicherer Tresor für Zugänge, Lizenzen &amp; Verträge
            </h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Sammle alle Zugangsdaten, Software-Lizenzen und Verträge deines
              Unternehmens an einem Ort. Klar strukturiert, jederzeit
              auffindbar – direkt in GLENO.
            </p>
          </div>

          <div className="flex w-full justify-start sm:justify-end md:w-auto">
            <div className="inline-flex max-w-full items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-[11px] text-slate-100 shadow-md sm:text-xs">
              <ShieldCheckIcon className="h-4 w-4 flex-shrink-0 text-emerald-400" />
              <span className="line-clamp-2 text-left">
                Sensible Daten bleiben in deinem GLENO-Workspace.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs + Content */}
      <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-3 shadow-sm backdrop-blur-xl sm:p-4">
        <div className="flex flex-col gap-3">
          {/* Tabs + Suche */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Scrollbare Tab-Leiste auf kleinen Screens */}
            <div className="w-full overflow-x-auto">
              <div className="inline-flex min-w-max items-center gap-1 rounded-full bg-slate-50 p-1 sm:min-w-0 sm:flex-nowrap">
                <button
                  type="button"
                  onClick={() => setActiveTab('credentials')}
                  className={[
                    pillButtonBase,
                    'min-w-[120px]',
                    activeTab === 'credentials'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-transparent text-slate-600 hover:bg-white',
                  ].join(' ')}
                >
                  <KeyIcon className="h-4 w-4" />
                  <span>Zugangsdaten</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('licenses')}
                  className={[
                    pillButtonBase,
                    'min-w-[120px]',
                    activeTab === 'licenses'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-transparent text-slate-600 hover:bg-white',
                  ].join(' ')}
                >
                  <ClipboardDocumentCheckIcon className="h-4 w-4" />
                  <span>Lizenzen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('contracts')}
                  className={[
                    pillButtonBase,
                    'min-w-[120px]',
                    activeTab === 'contracts'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-transparent text-slate-600 hover:bg-white',
                  ].join(' ')}
                >
                  <DocumentTextIcon className="h-4 w-4" />
                  <span>Verträge</span>
                </button>
              </div>
            </div>

            {/* Suchfeld */}
            <form
              onSubmit={handleSearchSubmit}
              className="w-full sm:w-56 md:w-64"
            >
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Im Tresor suchen …"
                  className="w-full rounded-full border border-slate-200 bg-white/80 pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                Enter zum Suchen in Zugangsdaten, Lizenzen &amp; Verträgen.
              </p>
              {searchMessage && (
                <p className="mt-1 text-[10px] text-slate-500">
                  {searchMessage}
                </p>
              )}
            </form>
          </div>

          {/* Content – alle drei Tabs im DOM, nur jeweils einer sichtbar */}
          <div className="mt-2 border-t border-slate-100 pt-3 space-y-4">
            <div
              ref={credentialsRef}
              className={activeTab === 'credentials' ? 'block' : 'hidden'}
            >
              <CredentialsModule />
            </div>
            <div
              ref={licensesRef}
              className={activeTab === 'licenses' ? 'block' : 'hidden'}
            >
              <LicensesModule />
            </div>
            <div
              ref={contractsRef}
              className={activeTab === 'contracts' ? 'block' : 'hidden'}
            >
              <ContractsModule />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

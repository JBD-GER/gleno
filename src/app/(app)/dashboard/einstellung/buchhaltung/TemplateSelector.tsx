'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createPortal } from 'react-dom'

interface Template {
  name: string
  publicUrl: string | null
}

type LabeledTemplate = Template & {
  label: string
  isStandard: boolean
}

type TemplateSelectorProps = {
  current: string
  /** Wird nach erfolgreichem Speichern aufgerufen */
  onSaved?: (newTemplate: string) => void
}

/** Feste Zuordnung Datei → Label */
function mapTemplateToLabel(
  name: string
): { label: string; isStandard: boolean } {
  const base = name.split('/').pop() ?? name

  switch (base) {
    case 'Rechnung_Vorlage_Standard_weiss.pdf':
      return { label: 'Standard', isStandard: true }
    case 'Rechnung_Vorlage_2_Beige.pdf':
      return { label: 'Beige', isStandard: false }
    case 'Rechnung_Vorlage_1_Welle_Standard.pdf':
      return { label: 'Welle', isStandard: false }
    case 'Rechnung_Vorlage_3_Schwarz.pdf':
      return { label: 'Schwarz', isStandard: false }
    case 'Rechnung_Vorlage_4_Blau.pdf':
      return { label: 'Blau', isStandard: false }
    case 'Rechnung_Vorlage_6_Modern.pdf':
      return { label: 'Modern', isStandard: false }
    default:
      return { label: 'Layout', isStandard: false }
  }
}

export default function TemplateSelector({
  current,
  onSaved,
}: TemplateSelectorProps) {
  const supabase = createClientComponentClient()

  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [templates, setTemplates] = useState<LabeledTemplate[]>([])
  const [selected, setSelected] = useState<string>(current)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // für SSR-Mismatch
  useEffect(() => setMounted(true), [])

  // selected synchron zu current halten
  useEffect(() => {
    if (!open) setSelected(current)
  }, [current, open])

  // Body-Scroll sperren + ESC
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onEsc)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onEsc)
    }
  }, [open])

  // Templates laden, sobald geöffnet
  useEffect(() => {
    if (!open) return

    ;(async () => {
      const res = await fetch('/api/billing-settings')
      if (!res.ok) return
      const { files } = await res.json()

      const baseList: Template[] = (files || []).map((name: string) => {
        const { data } = supabase.storage
          .from('rechnungvorlagen')
          .getPublicUrl(name)
        return { name, publicUrl: data.publicUrl }
      })

      if (!baseList.length) {
        setTemplates([])
        setPreviewUrl(null)
        return
      }

      const labeled: LabeledTemplate[] = baseList.map((t) => {
        const mapped = mapTemplateToLabel(t.name)
        return { ...t, ...mapped }
      })

      // Standard immer ans Ende
      const nonStandard = labeled.filter((t) => !t.isStandard)
      const standard = labeled.filter((t) => t.isStandard)
      const ordered = [...nonStandard, ...standard]

      setTemplates(ordered)

      const currentItem =
        ordered.find((t) => t.name === current) ?? ordered[0]

      setPreviewUrl(currentItem?.publicUrl ?? null)
      setSelected(currentItem?.name ?? current)
    })()
  }, [open, current, supabase])

  // Preview updaten, wenn Auswahl sich ändert
  useEffect(() => {
    const found = templates.find((t) => t.name === selected)
    setPreviewUrl(found?.publicUrl ?? null)
  }, [selected, templates])

  const save = async () => {
    const res = await fetch('/api/billing-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template: selected }),
    })
    if (!res.ok) {
      const { message } = await res
        .json()
        .catch(() => ({ message: res.statusText }))
      alert(message)
      return
    }

    setOpen(false)
    onSaved?.(selected)
  }

  const activeTemplate = templates.find((t) => t.name === selected)
  const activeLabel = activeTemplate?.label ?? 'Standard'
  const isActiveStandard = activeTemplate?.isStandard ?? false

  return (
    <>
      {/* Button ist jetzt IM HEADER-BEREICH sichtbar */}
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
        onClick={() => setOpen(true)}
      >
        Vorlage auswählen
      </button>

      {mounted &&
        open &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[1000] bg-black/45"
              onClick={() => setOpen(false)}
            />

            {/* Dialog */}
            <div
              role="dialog"
              aria-modal="true"
              className="fixed left-1/2 top-1/2 z-[1001] w-[min(960px,96vw)] max-h-[92vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-[0_30px_80px_rgba(2,6,23,0.25)] backdrop-blur-xl"
            >
              {/* Header */}
              <div className="flex flex-col gap-2 border-b border-white/70 bg-white/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                    Rechnungsvorlage wählen
                  </h2>
                  <p className="text-xs text-slate-500 sm:text-sm">
                    Wähle ein Layout und prüfe die PDF-Vorschau in Echtzeit.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 text-sm text-slate-800 shadow-sm transition hover:bg-slate-50"
                  >
                    Schließen
                  </button>
                  <button
                    onClick={save}
                    className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-black"
                  >
                    Speichern
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 sm:py-5">
                {/* Toggles */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-slate-500 sm:text-sm">
                      Layout-Auswahl
                    </p>
                    {isActiveStandard && (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        Standard-Vorlage
                      </span>
                    )}
                  </div>

                  {templates.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:flex md:flex-wrap md:gap-2">
                      {templates.map((tpl) => (
                        <button
                          key={tpl.name}
                          type="button"
                          onClick={() => setSelected(tpl.name)}
                          className={[
                            'rounded-full border px-3 py-1.5 text-xs sm:text-sm transition text-left',
                            selected === tpl.name
                              ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                              : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
                          ].join(' ')}
                        >
                          {tpl.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Keine Vorlagen gefunden.
                    </p>
                  )}
                </div>

                {/* Preview */}
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 sm:text-sm">
                    Aktuelle Auswahl:{' '}
                    <span className="font-medium text-slate-900">
                      {activeLabel}
                    </span>
                    {isActiveStandard && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        Empfohlen
                      </span>
                    )}
                  </div>

                  {previewUrl ? (
                    <div className="h-[55vh] w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <embed
                        src={previewUrl}
                        type="application/pdf"
                        className="h-full w-full"
                      />
                    </div>
                  ) : (
                    <div className="grid h-[220px] w-full place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500 sm:text-sm">
                      Keine Vorschau möglich
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 sm:text-xs">
                    Hinweis: Die Änderung wirkt sich auf neue Angebote,
                    Auftragsbestätigungen und Rechnungen aus. Bereits erzeugte
                    PDFs bleiben unverändert.
                  </p>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  )
}

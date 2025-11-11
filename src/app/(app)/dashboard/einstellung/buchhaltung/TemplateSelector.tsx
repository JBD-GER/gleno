'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'

interface Template {
  name: string
  publicUrl: string | null
}

export default function TemplateSelector({ current }: { current: string }) {
  const supabase = createClientComponentClient()
  const router   = useRouter()

  const [open, setOpen]             = useState(false)
  const [mounted, setMounted]       = useState(false) // for portal
  const [templates, setTemplates]   = useState<Template[]>([])
  const [selected, setSelected]     = useState<string>(current)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // avoid SSR portal mismatch
  useEffect(() => setMounted(true), [])

  // body scroll lock + esc close
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

  // fetch list when opened
  useEffect(() => {
    if (!open) return
    ;(async () => {
      const res = await fetch('/api/billing-settings')
      if (!res.ok) return
      const { files } = await res.json()

      const list: Template[] = files.map((name: string) => {
        const { data } = supabase.storage.from('rechnungvorlagen').getPublicUrl(name)
        return { name, publicUrl: data.publicUrl }
      })
      setTemplates(list)

      const currentItem = list.find(t => t.name === current) ?? list[0]
      setPreviewUrl(currentItem?.publicUrl ?? null)
      setSelected(currentItem?.name ?? current)
    })()
  }, [open, current, supabase])

  useEffect(() => {
    const found = templates.find(t => t.name === selected)
    setPreviewUrl(found?.publicUrl ?? null)
  }, [selected, templates])

  const save = async () => {
    const res = await fetch('/api/billing-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template: selected }),
    })
    if (!res.ok) {
      const { message } = await res.json().catch(() => ({ message: res.statusText }))
      alert(message); return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        className="rounded-lg border border-white/60 bg-white/80 px-4 py-2 text-sm font-medium text-slate-800 shadow hover:bg-white"
        onClick={() => setOpen(true)}
      >
        Vorlage auswählen
      </button>

      {mounted && open && createPortal(
        <>
          {/* Backdrop – FULL viewport */}
          <div
            className="fixed inset-0 z-[1000] bg-black/45"
            onClick={() => setOpen(false)}
          />

          {/* Dialog – centered, full-width responsive, never clipped */}
          <div
            role="dialog"
            aria-modal="true"
            className="fixed z-[1001] left-1/2 top-1/2 w-[min(1200px,96vw)] max-h-[92vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-[0_30px_80px_rgba(2,6,23,0.25)] backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/60 bg-white/80">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">Rechnungsvorlage wählen</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-sm text-slate-800 shadow hover:bg-white"
                >
                  Schließen
                </button>
                <button
                  onClick={save}
                  className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white shadow hover:bg-black"
                >
                  Speichern
                </button>
              </div>
            </div>

            {/* Content area – split: preview + list */}
            <div className="grid grid-rows-[auto_1fr_auto] gap-4 p-4 sm:grid-rows-[auto_1fr_auto]">
              {/* Preview */}
              {previewUrl ? (
                <div className="h-[min(60vh,600px)] overflow-hidden rounded-xl border border-white/60 bg-white/80">
                  <embed src={previewUrl} type="application/pdf" className="h-full w-full" />
                </div>
              ) : (
                <div className="grid h-[200px] place-items-center rounded-xl border border-white/60 bg-white/70 text-slate-500">
                  Keine Vorschau möglich
                </div>
              )}

              {/* Auswahl – scrollt unabhängig, bleibt im Dialog */}
              <div className="grid max-h-[28vh] grid-cols-1 gap-3 overflow-auto sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {templates.map(({ name }) => (
                  <label
                    key={name}
                    className={[
                      'flex cursor-pointer items-center gap-2 rounded-xl border p-2 shadow-sm',
                      selected === name
                        ? 'border-slate-900 bg-white'
                        : 'border-white/60 bg-white/80 hover:bg-white'
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="template"
                      value={name}
                      checked={selected === name}
                      onChange={() => setSelected(name)}
                    />
                    <span className="truncate text-sm text-slate-800">{name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}

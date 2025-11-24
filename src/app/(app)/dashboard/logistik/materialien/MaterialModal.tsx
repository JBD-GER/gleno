'use client'

import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'

type Material = {
  id: string
  name: string
  unit: string
  quantity: number
  critical_quantity: number
  category: string
  article_number: string
  color: string
  pattern: string
}

type FormData = Omit<Material, 'id'>

interface MaterialModalProps {
  showModal: boolean
  onClose: () => void
  onSave: (data: FormData) => void
  editing: Material | null
  categories: string[]
  patterns: string[]
  colorOptions: { name: string; value: string }[]
}

const inputGlass =
  'w-full rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none ring-offset-2 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 backdrop-blur'
const btnPrimary =
  'inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2'
const btnGlass =
  'rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-white backdrop-blur'

export default function MaterialModal({
  showModal,
  onClose,
  onSave,
  editing,
  categories,
  patterns,
  colorOptions,
}: MaterialModalProps) {
  const defaultForm: FormData = {
    name: '',
    unit: 'Stück',
    quantity: 0,
    critical_quantity: 0,
    category: '',
    article_number: '',
    color: '#000000',
    pattern: '',
  }

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const [form, setForm] = useState({
    ...defaultForm,
    categorySelect: '' as string,
    patternSelect: '' as string,
    colorSelect: '' as string,
    customColor: '#000000',
    quantityText: '' as string,
    criticalText: '' as string,
  })

  useEffect(() => {
    if (editing) {
      const foundColor = colorOptions.find((c) => c.value === editing.color)
      setForm({
        name: editing.name,
        unit: editing.unit,
        quantity: editing.quantity,
        critical_quantity: editing.critical_quantity,
        category: editing.category,
        categorySelect: editing.category || '',
        article_number: editing.article_number,
        pattern: editing.pattern,
        patternSelect: editing.pattern || '',
        color: editing.color,
        colorSelect: foundColor ? foundColor.value : '__custom',
        customColor: foundColor ? foundColor.value : editing.color,
        quantityText: editing.quantity === 0 ? '' : String(editing.quantity),
        criticalText:
          editing.critical_quantity === 0
            ? ''
            : String(editing.critical_quantity),
      } as any)
    } else {
      setForm({
        ...defaultForm,
        categorySelect: '',
        patternSelect: '',
        colorSelect: '',
        customColor: '#000000',
        quantityText: '',
        criticalText: '',
      } as any)
    }
  }, [editing, colorOptions])

  const overlayRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (showModal) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showModal, onClose])

  if (!showModal || !mounted) return null

  const previewColor =
    form.colorSelect === '__custom' ? form.customColor : form.colorSelect
  const previewName =
    colorOptions.find((c) => c.value === previewColor)?.name || previewColor

  const parseNonNegative = (v: string) => {
    if (v.trim() === '') return 0
    const n = Number(v.replace(',', '.'))
    return isNaN(n) ? 0 : Math.max(0, n)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const finalColor =
      form.colorSelect === '__custom' ? form.customColor : form.colorSelect

    onSave({
      name: form.name,
      unit: form.unit,
      quantity: parseNonNegative(form.quantityText),
      critical_quantity: parseNonNegative(form.criticalText),
      category: form.category,
      article_number: form.article_number,
      pattern: form.pattern,
      color: finalColor || '#000000',
    })
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[1000]">
      <div
        ref={overlayRef}
        onClick={handleOverlayClick}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <form
          onSubmit={handleSubmit}
          className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-[0_20px_80px_rgba(2,6,23,0.25)] backdrop-blur-xl"
          style={{
            backgroundImage:
              'radial-gradient(1000px 400px at 110% -30%, rgba(30,64,175,0.08), transparent)',
          }}
        >
          {/* Header */}
          <div className="relative border-b border-white/60 bg-white/70 px-5 py-4 backdrop-blur">
            <h3 className="text-lg font-semibold text-slate-900">
              {editing ? 'Material bearbeiten' : 'Neues Material'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg border border-white/60 bg-white/80 p-1 text-slate-600 shadow-sm hover:bg-white"
              aria-label="Schließen"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Name */}
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-800">Name</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className={inputGlass}
                  placeholder="z. B. Feinsteinzeug 60×60"
                  required
                />
              </label>

              {/* Artikelnummer */}
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-800">
                  Artikel-Nr.
                </span>
                <input
                  type="text"
                  value={form.article_number}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, article_number: e.target.value }))
                  }
                  className={inputGlass}
                  placeholder="Optional"
                />
              </label>

              {/* Einheit */}
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-800">
                  Einheit
                </span>
                <select
                  value={form.unit}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, unit: e.target.value }))
                  }
                  className={inputGlass}
                >
                  <option>Stück</option>
                  <option>Paket</option>
                  <option>Palette</option>
                </select>
              </label>

              {/* Menge */}
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-800">
                  Menge im Bestand
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="z. B. 10"
                  value={form.quantityText}
                  onChange={(e) => {
                    const v = e.target.value
                    if (/^\d*([.,]\d*)?$/.test(v) || v === '') {
                      setForm((f) => ({ ...f, quantityText: v }))
                    }
                  }}
                  onBlur={(e) => {
                    const v = e.target.value
                    if (v === '') return
                    const normalized = String(
                      Number(v.replace(',', '.')),
                    )
                    setForm((f) => ({ ...f, quantityText: normalized }))
                  }}
                  className={inputGlass}
                />
              </label>

              {/* Kritische Menge */}
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-800">
                  Kritische Menge
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="z. B. 2"
                  value={form.criticalText}
                  onChange={(e) => {
                    const v = e.target.value
                    if (/^\d*([.,]\d*)?$/.test(v) || v === '') {
                      setForm((f) => ({ ...f, criticalText: v }))
                    }
                  }}
                  onBlur={(e) => {
                    const v = e.target.value
                    if (v === '') return
                    const normalized = String(
                      Number(v.replace(',', '.')),
                    )
                    setForm((f) => ({ ...f, criticalText: normalized }))
                  }}
                  className={inputGlass}
                />
              </label>

              {/* Kategorie */}
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-800">
                  Kategorie
                </span>
                <select
                  value={form.categorySelect}
                  onChange={(e) => {
                    const v = e.target.value
                    setForm((f) => ({
                      ...f,
                      categorySelect: v,
                      category: v === '__new' ? '' : v,
                    }))
                  }}
                  className={inputGlass}
                >
                  <option value="">— bitte wählen —</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__new">+ Neue Kategorie</option>
                </select>
              </label>
              {form.categorySelect === '__new' && (
                <label className="flex flex-col gap-1 md:col-span-1">
                  <span className="text-sm font-medium text-slate-800">
                    Neue Kategorie
                  </span>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value }))
                    }
                    className={inputGlass}
                    placeholder="Name der neuen Kategorie"
                    required
                  />
                </label>
              )}

              {/* Musterung */}
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-800">
                  Musterung
                </span>
                <select
                  value={form.patternSelect}
                  onChange={(e) => {
                    const v = e.target.value
                    setForm((f) => ({
                      ...f,
                      patternSelect: v,
                      pattern: v === '__new' ? '' : v,
                    }))
                  }}
                  className={inputGlass}
                >
                  <option value="">— bitte wählen —</option>
                  {patterns.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value="__new">+ Neue Musterung</option>
                </select>
              </label>
              {form.patternSelect === '__new' && (
                <label className="flex flex-col gap-1 md:col-span-1">
                  <span className="text-sm font-medium text-slate-800">
                    Neue Musterung
                  </span>
                  <input
                    type="text"
                    value={form.pattern}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, pattern: e.target.value }))
                    }
                    className={inputGlass}
                    placeholder="Name der neuen Musterung"
                    required
                  />
                </label>
              )}

              {/* Farbe */}
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-800">
                  Farbe
                </span>
                <select
                  value={form.colorSelect}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, colorSelect: e.target.value }))
                  }
                  className={inputGlass}
                >
                  <option value="">— bitte wählen —</option>
                  {colorOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.name}
                    </option>
                  ))}
                  <option value="__custom">+ Eigene Farbe</option>
                </select>
              </label>

              {form.colorSelect === '__custom' && (
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-slate-800">
                    Eigene Farbe
                  </span>
                  <input
                    type="color"
                    value={form.customColor}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, customColor: e.target.value }))
                    }
                    className="h-10 w-full rounded-lg border border-white/60 p-0"
                  />
                </label>
              )}

              {/* Vorschau */}
              <div className="col-span-full mt-1 flex items-center gap-2">
                <div
                  className="h-6 w-6 rounded-md border border-white/60 shadow-inner"
                  style={{
                    backgroundColor:
                      form.colorSelect === '__custom'
                        ? form.customColor
                        : form.colorSelect,
                  }}
                />
                <span className="text-sm text-slate-700">
                  {previewName || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-white/60 bg-white/70 px-5 py-3 backdrop-blur">
            <button type="button" onClick={onClose} className={btnGlass}>
              Abbrechen
            </button>
            <button type="submit" className={btnPrimary}>
              {editing ? 'Speichern' : 'Anlegen'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  KeyIcon,
  PencilSquareIcon,
  TrashIcon,
  LinkIcon,
  GlobeAltIcon,
  PlusIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline'

const inputBase =
  'w-full rounded-lg border border-slate-200/80 bg-white/95 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-indigo-200/60 transition'

type Credential = {
  id: string
  label: string
  system: string
  url: string
  username: string
  password: string
  notes: string | null
  tags?: string[] | null
}

export default function CredentialsModule() {
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [loading, setLoading] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editCredential, setEditCredential] = useState<Credential | null>(null)

  const [form, setForm] = useState({
    label: '',
    system: '',
    url: '',
    username: '',
    password: '',
    notes: '',
    tagsRaw: '',
  })

  const [visible, setVisible] = useState<Record<string, boolean>>({})

  const toggleVisible = (id: string) => {
    setVisible((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const fetchAll = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/vault/credentials')
      if (!res.ok) throw new Error('Fehler beim Laden der Zugangsdaten')
      const data = await res.json()
      setCredentials(data ?? [])
    } catch (err: any) {
      alert(err?.message ?? 'Laden fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    if (editCredential) {
      setForm({
        label: editCredential.label ?? '',
        system: editCredential.system ?? '',
        url: editCredential.url ?? '',
        username: editCredential.username ?? '',
        password: editCredential.password ?? '',
        notes: editCredential.notes ?? '',
        tagsRaw: (editCredential.tags ?? []).join(', '),
      })
    } else {
      setForm({
        label: '',
        system: '',
        url: '',
        username: '',
        password: '',
        notes: '',
        tagsRaw: '',
      })
    }
  }, [editCredential, modalOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      ...form,
      tags: form.tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    }

    try {
      const res = await fetch(
        editCredential
          ? `/api/vault/credentials/${editCredential.id}`
          : '/api/vault/credentials',
        {
          method: editCredential ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error ?? 'Speichern fehlgeschlagen')
      }

      setModalOpen(false)
      setEditCredential(null)
      fetchAll()
    } catch (err: any) {
      alert(err?.message ?? 'Speichern fehlgeschlagen')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Zugangsdaten wirklich löschen?')) return
    try {
      const res = await fetch(`/api/vault/credentials/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error ?? 'Löschen fehlgeschlagen')
      }
      fetchAll()
    } catch (err: any) {
      alert(err?.message ?? 'Löschen fehlgeschlagen')
    }
  }

  const copyToClipboard = (value: string) => {
    if (!value) return
    navigator.clipboard
      .writeText(value)
      .catch(() => alert('Konnte nicht in die Zwischenablage kopieren.'))
  }

  const masked = '••••••••••'

  return (
    <div className="space-y-3">
      {/* Top-Leiste für dieses Modul */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <KeyIcon className="h-4 w-4 text-slate-700" />
          <span>Zugangsdaten für E-Mail, Hosting, CRM & Co.</span>
          {loading && <span>· lädt …</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={fetchAll}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Aktualisieren
          </button>
          <button
            type="button"
            onClick={() => {
              setEditCredential(null)
              setModalOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-full border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-50 shadow-sm hover:bg-slate-950"
          >
            <PlusIcon className="h-4 w-4" />
            Zugang hinzufügen
          </button>
        </div>
      </div>

      {/* Liste */}
      {credentials.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center text-sm text-slate-500">
          <KeyIcon className="h-6 w-6 text-slate-400" />
          <p>
            Noch keine Zugangsdaten gespeichert. Lege deinen ersten Eintrag an,
            z.&nbsp;B. für E-Mail, Hosting oder CRM.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {credentials.map((cred) => {
            const isVisible = !!visible[cred.id]
            return (
              <article
                key={cred.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-sm backdrop-blur-sm sm:p-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-50 shadow-sm">
                        <KeyIcon className="h-3.5 w-3.5" />
                        <span>{cred.system || 'SYSTEM'}</span>
                      </div>
                      <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">
                        {cred.label || 'Ohne Bezeichnung'}
                      </h3>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => toggleVisible(cred.id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      >
                        {isVisible ? (
                          <EyeSlashIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditCredential(cred)
                          setModalOpen(true)
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cred.id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {cred.url && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <GlobeAltIcon className="h-3.5 w-3.5" />
                      <a
                        href={cred.url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate underline-offset-2 hover:underline"
                      >
                        {cred.url}
                      </a>
                    </div>
                  )}

                  <div className="mt-2 grid grid-cols-1 gap-1.5 text-[11px] text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="w-18 shrink-0 font-medium">
                        Benutzer:
                      </span>
                      <span className="truncate">
                        {cred.username
                          ? isVisible
                            ? cred.username
                            : masked
                          : '—'}
                      </span>
                      {cred.username && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(cred.username)}
                          className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        >
                          <LinkIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-18 shrink-0 font-medium">
                        Passwort:
                      </span>
                      <span className="truncate font-mono text-[11px] text-slate-800">
                        {cred.password
                          ? isVisible
                            ? cred.password
                            : masked
                          : '—'}
                      </span>
                      {cred.password && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(cred.password)}
                          className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        >
                          <LinkIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {cred.notes && (
                    <p className="mt-2 line-clamp-3 text-[11px] text-slate-500">
                      {cred.notes}
                    </p>
                  )}

                  {!!(cred.tags && cred.tags.length) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {cred.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600 ring-1 ring-slate-100"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <VaultModal
          onClose={() => {
            setModalOpen(false)
            setEditCredential(null)
          }}
        >
          <form
            onSubmit={handleSubmit}
            className="space-y-4 pt-4"
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                (e.target as HTMLElement).tagName !== 'TEXTAREA'
              ) {
                e.preventDefault()
              }
            }}
          >
            <h2 className="text-base font-semibold text-slate-900">
              {editCredential
                ? 'Zugangsdaten bearbeiten'
                : 'Neue Zugangsdaten'}
            </h2>
            <p className="text-xs text-slate-500">
              Speichere Zugänge z.&nbsp;B. für E-Mail, Hosting, CRM oder andere
              Tools.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Bezeichnung
                </label>
                <input
                  className={inputBase}
                  value={form.label}
                  onChange={(e) =>
                    setForm({ ...form, label: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  System / Kategorie
                </label>
                <input
                  className={inputBase}
                  value={form.system}
                  onChange={(e) =>
                    setForm({ ...form, system: e.target.value })
                  }
                  placeholder="E-Mail, Hosting, CRM, …"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-slate-600">
                  URL (Login-Seite)
                </label>
                <input
                  className={inputBase}
                  value={form.url}
                  onChange={(e) =>
                    setForm({ ...form, url: e.target.value })
                  }
                  placeholder="https://…"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Benutzername / E-Mail
                </label>
                <input
                  className={inputBase}
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Passwort
                </label>
                <input
                  className={inputBase}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-slate-600">
                  Tags (kommagetrennt)
                </label>
                <input
                  className={inputBase}
                  value={form.tagsRaw}
                  onChange={(e) =>
                    setForm({ ...form, tagsRaw: e.target.value })
                  }
                  placeholder="z.B. Finanzen, Team, Geschäftsführer"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-slate-600">
                  Notizen
                </label>
                <textarea
                  rows={3}
                  className={inputBase}
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm hover:bg-slate-950"
              >
                Speichern
              </button>
            </div>
          </form>
        </VaultModal>
      )}
    </div>
  )
}

/** Modal via Portal – überdeckt die komplette Page */
function VaultModal({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Vollflächiger Overlay-Hintergrund */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Popup-Panel */}
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-auto rounded-3xl border border-slate-200/70 bg-white/95 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.4)] sm:p-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
        >
          <span className="text-base">×</span>
        </button>
        {children}
      </div>
    </div>,
    document.body,
  )
}

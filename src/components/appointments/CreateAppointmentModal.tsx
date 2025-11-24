// src/components/appointments/CreateAppointmentModal.tsx
'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'

type Props = {
  open: boolean
  onClose: () => void
  requestId: string
}

type Kind = 'vor_ort' | 'video' | 'telefonie'

function cls(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(' ')
}

function Row({ children }: React.PropsWithChildren) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {children}
    </div>
  )
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  className = '',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  className?: string
}) {
  return (
    <label className={cls('block text-sm', className)}>
      <span className="block text-xs font-medium text-slate-600">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-[13px]
                   shadow-sm outline-none focus:ring-2 focus:ring-indigo-200 focus:border-transparent"
      />
    </label>
  )
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <label className="block text-sm">
      <span className="block text-xs font-medium text-slate-600">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="mt-1 w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-[13px]
                   shadow-sm outline-none focus:ring-2 focus:ring-indigo-200 focus:border-transparent"
      />
    </label>
  )
}

export default function CreateAppointmentModal({
  open,
  onClose,
  requestId,
}: Props) {
  const [busy, setBusy] = React.useState(false)

  const [title, setTitle] = React.useState('')
  const [note, setNote] = React.useState('')
  const [kind, setKind] = React.useState<Kind>('vor_ort')

  const [date, setDate] = React.useState('')
  const [time, setTime] = React.useState('')
  const [duration, setDuration] = React.useState('60')

  const [location, setLocation] = React.useState('')
  const [videoUrl, setVideoUrl] = React.useState('')
  const [phoneCustomer, setPhoneCustomer] = React.useState('')
  const [phonePartner, setPhonePartner] = React.useState('')

  // ESC + Body Scroll Lock
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)

    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return

    if (!date || !time || !duration) {
      alert('Bitte Datum, Uhrzeit und Dauer angeben.')
      return
    }

    const startLocal = new Date(`${date}T${time}`)
    if (isNaN(startLocal.getTime())) {
      alert('Ungültiges Datum/Uhrzeit.')
      return
    }

    const payload: any = {
      title: title || null,
      note: note || null,
      kind,
      start_at: startLocal.toISOString(),
      duration_min: parseInt(duration, 10) || 60,
      location: null,
      video_url: null,
      phone_customer: null,
      phone_partner: null,
    }

    if (kind === 'vor_ort') {
      payload.location = location || null
    } else if (kind === 'video') {
      payload.video_url = videoUrl || null
    } else if (kind === 'telefonie') {
      payload.phone_customer = phoneCustomer || null
      payload.phone_partner = phonePartner || null
    }

    setBusy(true)
    try {
      const res = await fetch(
        `/api/chat/${requestId}/appointment/create`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || res.statusText)

      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            kind: 'success',
            text: 'Termin angelegt und an Konsument:in gesendet.',
          },
        }),
      )
      onClose()
    } catch (err: any) {
      alert(err.message || 'Fehler beim Anlegen des Termins.')
    } finally {
      setBusy(false)
    }
  }

  const node = (
    <div className="fixed inset-0 z-[100000] flex items-start justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-900/25 backdrop-blur-xl"
        onClick={() => !busy && onClose()}
      />

      {/* Card */}
      <form
        onSubmit={submit}
        className={cls(
          'relative z-10 mt-8 w-full max-w-3xl',
          'max-h-[92vh] overflow-y-auto',
          'rounded-3xl border border-white/60 bg-white/90',
          'backdrop-blur-xl p-4 sm:p-6',
          'shadow-[0_10px_34px_rgba(2,6,23,0.12)] ring-1 ring-white/60',
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="pr-4">
            <h3 className="text-base sm:text-lg font-medium text-slate-900">
              Termin anlegen
            </h3>
            <p className="mt-1 text-[11px] sm:text-xs text-slate-500">
              Art wählen, Datum/Uhrzeit setzen, optionale Notiz und je nach Art Ort, Link oder Telefonnummern ergänzen.
            </p>
          </div>

          {/* X oben rechts */}
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/95 shadow-sm
                       hover:bg-slate-50 disabled:opacity-60 shrink-0"
            disabled={busy}
            aria-label="Schließen"
          >
            <XMarkIcon className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <div className="mt-4 space-y-4">
          <Input
            label="Überschrift / Termingrund"
            value={title}
            onChange={setTitle}
            placeholder="z. B. Erstgespräch, Vor-Ort-Besichtigung"
          />

          <Textarea
            label="Notiz (optional)"
            value={note}
            onChange={setNote}
            placeholder="Kurzinfo zum Ablauf oder zur Vorbereitung"
          />

          {/* Art */}
          <div className="text-sm">
            <div className="mb-1 text-xs font-medium text-slate-600">
              Art
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { k: 'vor_ort', label: 'Vor Ort' },
                { k: 'video', label: 'Video-Call' },
                { k: 'telefonie', label: 'Telefonat' },
              ].map((o) => (
                <button
                  key={o.k}
                  type="button"
                  onClick={() => setKind(o.k as Kind)}
                  className={cls(
                    'rounded-2xl border px-3 py-1.5 text-xs md:text-sm transition-shadow',
                    kind === o.k
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white/90 border-white/60 text-slate-800 hover:shadow-sm',
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Datum, Uhrzeit, Dauer */}
          <Row>
            <Input
              label="Datum"
              type="date"
              value={date}
              onChange={setDate}
            />
            <Input
              label="Uhrzeit"
              type="time"
              value={time}
              onChange={setTime}
            />
          </Row>
          <Row>
            <Input
              label="Dauer (Minuten)"
              type="number"
              value={duration}
              onChange={setDuration}
            />
            <div className="hidden md:block" />
          </Row>

          {/* Spezifische Felder */}
          {kind === 'vor_ort' && (
            <Input
              label="Ort (Adresse)"
              value={location}
              onChange={setLocation}
              placeholder="Straße, Nr., PLZ, Ort"
            />
          )}

          {kind === 'video' && (
            <Input
              label="Meeting-Link"
              value={videoUrl}
              onChange={setVideoUrl}
              placeholder="https://…"
            />
          )}

          {kind === 'telefonie' && (
            <Row>
              <Input
                label="Telefon (Kund:in)"
                value={phoneCustomer}
                onChange={setPhoneCustomer}
                placeholder="+49…"
              />
              <Input
                label="Telefon (Unternehmen)"
                value={phonePartner}
                onChange={setPhonePartner}
                placeholder="+49…"
              />
            </Row>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:flex-wrap sm:items-center sm:justify-end gap-2">
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="w-full sm:w-auto rounded-xl border border-white/60 bg-white px-4 py-2 text-sm hover:shadow-sm disabled:opacity-60"
            disabled={busy}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={busy}
            className={cls(
              'w-full sm:w-auto rounded-xl px-4 py-2 text-sm text-white',
              'bg-slate-900 hover:opacity-90',
              busy && 'opacity-60 cursor-default',
            )}
          >
            {busy ? 'Speichere…' : 'Termin anlegen'}
          </button>
        </div>
      </form>
    </div>
  )

  return typeof document !== 'undefined'
    ? createPortal(node, document.body)
    : node
}

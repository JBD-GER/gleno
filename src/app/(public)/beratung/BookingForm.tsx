// src/app/(public)/beratung/BookingForm.tsx
'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'

type SlotDef = {
  label: string // z.B. "09:00"
  from: string  // "09:00"
  to: string    // "09:30"
}

const SLOT_DEFS: SlotDef[] = [
  { label: '09:00', from: '09:00', to: '09:30' },
  { label: '09:30', from: '09:30', to: '10:00' },
  { label: '10:00', from: '10:00', to: '10:30' },
  { label: '10:30', from: '10:30', to: '11:00' },
  { label: '13:00', from: '13:00', to: '13:30' },
  { label: '13:30', from: '13:30', to: '14:00' },
  { label: '14:00', from: '14:00', to: '14:30' },
  { label: '14:30', from: '14:30', to: '15:00' },
]

/**
 * Normalisiert einen beliebigen ISO-ähnlichen String zu:
 *   "YYYY-MM-DDTHH:MM:SSZ"
 * egal ob aus Supabase "…Z" oder "…+00:00" kommt.
 */
function normalizeIsoString(iso: string) {
  const m = iso.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/)
  return m ? `${m[1]}Z` : iso
}

// Hilfsfunktion: ISO immer ohne Millisekunden, mit 'Z'
function normalizeIsoFromDate(d: Date) {
  return normalizeIsoString(d.toISOString())
}

/** Lokales Datum -> "YYYY-MM-DD" (ohne UTC-Shift) */
function formatDateParamLocal(d: Date) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getNextConsultingDays(count = 4): Date[] {
  const result: Date[] = []
  const d = new Date()
  d.setHours(0, 0, 0, 0)

  while (result.length < count) {
    const weekday = d.getDay() // 0=So,1=Mo,...,2=Di
    if (weekday === 2 || weekday === 3 || weekday === 4) {
      result.push(new Date(d))
    }
    d.setDate(d.getDate() + 1)
  }
  return result
}

function formatWeekday(date: Date) {
  const wd = date.getDay()
  const map: Record<number, string> = {
    1: 'Mo.',
    2: 'Di.',
    3: 'Mi.',
    4: 'Do.',
    5: 'Fr.',
    6: 'Sa.',
    0: 'So.',
  }
  return map[wd] ?? ''
}

function formatDateShort(date: Date) {
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
  })
}

function formatHeadingDate(date: Date) {
  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Lokalen Slot (z. B. 09:00 in Europe/Berlin) in normalisierte ISO wandeln
function toLocalIsoForSlot(date: Date, hhmm: string) {
  const [h, m] = hhmm.split(':').map((v) => parseInt(v, 10))
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  return normalizeIsoFromDate(d)
}

export default function BookingForm() {
  const [days] = useState<Date[]>(() => getNextConsultingDays(4))
  const [selectedDayIndex, setSelectedDayIndex] = useState(0)
  const selectedDay = days[selectedDayIndex]

  const [selectedSlotLabel, setSelectedSlotLabel] = useState<string | null>(null)

  const [bookedIso, setBookedIso] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Set mit bereits gebuchten Slot-Keys
  const bookedSet = useMemo(
    () => new Set(bookedIso.map(normalizeIsoString)),
    [bookedIso],
  )

  // Belegte Slots vom Server laden
  useEffect(() => {
    async function loadBooked() {
      try {
        setLoadingSlots(true)
        setBookedIso([])

        // WICHTIG: lokales Datum, nicht via toISOString() (UTC-Shift!)
        const dateParam = formatDateParamLocal(selectedDay) // YYYY-MM-DD

        const res = await fetch(`/api/zoom/book?date=${dateParam}`, {
          method: 'GET',
        })

        if (!res.ok) {
          console.error(
            'Fehler beim Laden der belegten Slots',
            await res.text(),
          )
          return
        }

        const data = (await res.json()) as { booked?: string[] }

        const normalized = (data.booked ?? []).map((s) => normalizeIsoString(s))
        setBookedIso(normalized)

        // Debug-Log, falls du mal checken willst:
        // console.log('[ZoomSlots][Frontend]', { dateParam, raw: data.booked, normalized })
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingSlots(false)
      }
    }

    loadBooked()
    setSelectedSlotLabel(null)
  }, [selectedDay])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSuccessMsg(null)
    setErrorMsg(null)

    if (!email) {
      setErrorMsg('Bitte geben Sie Ihre E-Mail-Adresse an.')
      return
    }
    if (!selectedSlotLabel) {
      setErrorMsg('Bitte wählen Sie einen freien Zeitslot aus.')
      return
    }

    const slotIso = toLocalIsoForSlot(selectedDay, selectedSlotLabel)

    // Falls Slot währenddessen belegt wurde
    if (bookedSet.has(slotIso)) {
      setErrorMsg(
        'Dieser Slot wurde soeben gebucht. Bitte wählen Sie einen anderen Zeitpunkt.',
      )
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/zoom/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          note,
          startTime: slotIso,
          durationMinutes: 30,
        }),
      })

      if (res.status === 409) {
        setErrorMsg(
          'Dieser Slot wurde gerade bereits gebucht. Bitte wählen Sie einen anderen Termin.',
        )
        // Slots neu laden
        const dateParam = formatDateParamLocal(selectedDay)
        const reload = await fetch(`/api/zoom/book?date=${dateParam}`)
        if (reload.ok) {
          const data = (await reload.json()) as { booked?: string[] }
          const normalized = (data.booked ?? []).map((s) =>
            normalizeIsoString(s),
          )
          setBookedIso(normalized)
        }
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setErrorMsg(
          data?.error ??
            'Der Termin konnte nicht gebucht werden. Bitte später erneut versuchen.',
        )
        return
      }

      setSuccessMsg(
        'Vielen Dank! Ihr Zoom-Termin wurde gebucht. Der Link zum Gespräch und ein Kalendereintrag wurden Ihnen per E-Mail zugeschickt.',
      )
      setErrorMsg(null)
    } catch (err) {
      console.error(err)
      setErrorMsg('Unbekannter Fehler. Bitte versuchen Sie es später erneut.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-full flex-col rounded-3xl border border-white/70 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.22)] backdrop-blur-xl ring-1 ring-white/60 sm:p-6"
    >
      <div className="flex-1 space-y-5">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">
            Zoom-Beratung buchen
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Termine aktuell{' '}
            <span className="font-medium">Dienstag bis Donnerstag</span>{' '}
            jeweils von <span className="font-medium">09:00–11:00</span> und{' '}
            <span className="font-medium">13:00–15:00 Uhr</span>. Jeder Slot
            dauert 30 Minuten.
          </p>
        </div>

        {/* Datumsauswahl */}
        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Datum auswählen
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {days.map((day, idx) => {
              const isActive = idx === selectedDayIndex
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => setSelectedDayIndex(idx)}
                  className={`flex min-w-[86px] flex-col items-center rounded-2xl border px-3 py-2 text-xs transition ${
                    isActive
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white/80 text-slate-800 hover:border-slate-400'
                  }`}
                >
                  <span className="text-[11px] uppercase tracking-wide">
                    {formatWeekday(day)}
                  </span>
                  <span className="text-sm font-semibold">
                    {formatDateShort(day)}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="text-[11px] text-slate-400">
            Ausgewählt: {formatHeadingDate(selectedDay)}
          </div>
        </div>

        {/* Slots */}
        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Uhrzeit auswählen
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SLOT_DEFS.map((slot) => {
              const iso = toLocalIsoForSlot(selectedDay, slot.from)
              const isBooked = bookedSet.has(iso)
              const isSelected =
                !isBooked && selectedSlotLabel === slot.label

              const baseStyles =
                'flex flex-col items-center justify-center rounded-2xl border px-2 py-3 text-xs sm:text-[13px] transition'

              let styles = baseStyles
              if (isBooked) {
                styles +=
                  ' cursor-not-allowed border-slate-300 bg-slate-100 text-slate-400 line-through opacity-70'
              } else if (isSelected) {
                styles +=
                  ' cursor-pointer border-slate-900 bg-slate-900 text-white shadow-[0_10px_30px_rgba(15,23,42,0.35)]'
              } else {
                styles +=
                  ' cursor-pointer border-slate-200 bg-white/80 text-slate-800 hover:border-slate-400'
              }

              return (
                <button
                  key={slot.label}
                  type="button"
                  disabled={isBooked || loadingSlots}
                  onClick={() => !isBooked && setSelectedSlotLabel(slot.label)}
                  className={styles}
                >
                  <span className="font-medium">{slot.from} Uhr</span>
                  <span className="mt-0.5 text-[11px] text-slate-500">
                    bis {slot.to} Uhr
                  </span>
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-slate-400">
            Bereits gebuchte Zeiten sind durchgestrichen, grau hinterlegt und
            nicht auswählbar.
          </p>
        </div>

        {/* Formularfelder */}
        <div className="space-y-3 pt-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Vorname <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                placeholder="Max"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Nachname <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                placeholder="Mustermann"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              E-Mail-Adresse <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              placeholder="ihr.name@firma.de"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Telefonnummer <span className="text-slate-400">(optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              placeholder="+49 ..."
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Kurz: Worum geht es?{' '}
              <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-slate-300 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              placeholder="z. B. Struktur in Angebote & Rechnungen bringen, Zeiterfassung fürs Team, Umstieg von anderer Software ..."
            />
          </div>
        </div>

        {(errorMsg || successMsg) && (
          <div className="text-xs">
            {errorMsg && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
                {successMsg}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 space-y-3">
        <button
          type="submit"
          disabled={submitting || loadingSlots}
          className="flex w-full items-center justify-center rounded-full border border-slate-900 bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(15,23,42,0.5)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? 'Buchen …' : 'Zoom-Termin jetzt buchen'}
        </button>
        <p className="text-[10px] leading-relaxed text-slate-400">
          Mit dem Absenden stimmen Sie zu, dass wir Ihre Angaben zur
          Vorbereitung des Gesprächs und zur Durchführung des Zoom-Meetings
          verwenden. Es gelten unsere{' '}
          <a
            href="/datenschutz"
            className="text-slate-500 underline decoration-slate-300 underline-offset-2"
          >
            Datenschutzhinweise
          </a>
          .
        </p>
      </div>
    </form>
  )
}

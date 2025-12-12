// src/app/kaltakquise/verbindung/page.tsx
'use client'

import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react'
import {
  PhoneIcon,
  KeyIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'

type ConnectionStatus = 'unknown' | 'ok' | 'error' | 'not_configured'

type SettingsResponse = {
  accountSid?: string | null
  voiceAppSid?: string | null
  callerId?: string | null
  status?: ConnectionStatus
  statusMessage?: string | null
}

type FormState = {
  accountSid: string
  authToken: string
  voiceAppSid: string
  callerId: string
}

export default function TelephonyConnectionPage() {
  const [form, setForm] = useState<FormState>({
    accountSid: '',
    authToken: '',
    voiceAppSid: '',
    callerId: '',
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState<ConnectionStatus>('unknown')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  /* ----------------- Settings initial laden ----------------- */

  useEffect(() => {
    let cancelled = false

    async function loadSettings() {
      try {
        setLoading(true)
        const res = await fetch('/api/telephony/settings', { cache: 'no-store' })

        if (!res.ok) {
          throw new Error((await res.text().catch(() => 'Fehler beim Laden')) ?? 'Fehler beim Laden')
        }

        const data = (await res.json()) as SettingsResponse
        if (cancelled) return

        setForm((prev) => ({
          ...prev,
          accountSid: data.accountSid ?? '',
          authToken: '', // bewusst nicht vorbefüllen
          voiceAppSid: data.voiceAppSid ?? '',
          callerId: data.callerId ?? '',
        }))

        setStatus(data.status ?? 'unknown')
        setStatusMessage(data.statusMessage ?? null)
      } catch (err: any) {
        if (cancelled) return
        console.error(err)
        setStatus('error')
        setStatusMessage('Einstellungen konnten nicht geladen werden.')
        setErrorMessage(err?.message ?? 'Fehler beim Laden der Einstellungen.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSettings()
    return () => {
      cancelled = true
    }
  }, [])

  /* ----------------- Form-Handling ----------------- */

  const onChange = (field: keyof FormState) => (e: ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setSaveMessage(null)
    setErrorMessage(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage(null)
    setErrorMessage(null)
    try {
      const res = await fetch('/api/telephony/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        throw new Error((await res.text().catch(() => 'Fehler beim Speichern')) ?? 'Fehler beim Speichern')
      }

      const data = (await res.json().catch(() => ({}))) as SettingsResponse

      setStatus(data.status ?? 'ok')
      setStatusMessage(data.statusMessage ?? 'Verbindung erfolgreich gespeichert.')
      setSaveMessage('Einstellungen wurden gespeichert.')
    } catch (err: any) {
      console.error(err)
      setErrorMessage(err?.message ?? 'Einstellungen konnten nicht gespeichert werden.')
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setErrorMessage(null)
    setSaveMessage(null)
    try {
      const res = await fetch('/api/telephony/settings/test', { method: 'POST' })

      if (!res.ok) {
        throw new Error((await res.text().catch(() => 'Test fehlgeschlagen')) ?? 'Test fehlgeschlagen')
      }

      const data = (await res.json().catch(() => ({}))) as SettingsResponse
      setStatus(data.status ?? 'ok')
      setStatusMessage(data.statusMessage ?? 'Verbindung erfolgreich getestet.')
    } catch (err: any) {
      console.error(err)
      setStatus('error')
      setStatusMessage('Verbindungstest fehlgeschlagen.')
      setErrorMessage(err?.message ?? 'Verbindungstest fehlgeschlagen.')
    } finally {
      setTesting(false)
    }
  }

  const statusTone =
    status === 'ok'
      ? 'bg-emerald-100 text-emerald-900 ring-emerald-200'
      : status === 'error'
      ? 'bg-rose-100 text-rose-900 ring-rose-200'
      : status === 'not_configured'
      ? 'bg-amber-50 text-amber-900 ring-amber-200'
      : 'bg-slate-100 text-slate-900 ring-slate-200'

  const StatusIcon =
    status === 'ok' ? CheckCircleIcon : status === 'error' ? ExclamationTriangleIcon : ShieldCheckIcon

  /* ----------------- UI ----------------- */

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(1200px_350px_at_-10%_-30%,rgba(15,23,42,0.05),transparent_60%),radial-gradient(1200px_350px_at_110%_130%,rgba(88,101,242,0.08),transparent_60%),#e8edf5] p-4 text-slate-700 sm:p-6">
      {/* HERO */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_10px_40px_rgba(2,6,23,0.12)] backdrop-blur-xl sm:p-5">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(800px_200px_at_-10%_-20%,rgba(15,23,42,0.08),transparent_60%),radial-gradient(800px_200px_at_110%_120%,rgba(88,101,242,0.10),transparent_60%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-[11px] text-slate-700 backdrop-blur">
              <PhoneIcon className="h-4 w-4 text-slate-900" />
              Telefonie – Verbindung
            </div>
            <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              Twilio-Verbindung einrichten
            </h1>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
              Hinterlegen Sie hier Ihre Twilio-Zugangsdaten, um Outbound-Calls direkt aus GLENO zu ermöglichen. Die Daten
              gelten nur für Ihr Benutzerkonto.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div
              className={[
                'inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium ring-1 ring-inset',
                statusTone,
              ].join(' ')}
            >
              <StatusIcon className="h-4 w-4" />
              <span>
                {status === 'ok'
                  ? 'Verbindung aktiv'
                  : status === 'error'
                  ? 'Fehler in der Verbindung'
                  : status === 'not_configured'
                  ? 'Noch nicht eingerichtet'
                  : 'Status unbekannt'}
              </span>
            </div>
            {statusMessage && (
              <p className="max-w-xs text-right text-[11px] text-slate-600 sm:text-xs">{statusMessage}</p>
            )}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)]">
        {/* FORM-CARD */}
        <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/75 p-4 shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-xl sm:p-5">
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(900px_220px_at_-10%_-20%,rgba(15,23,42,0.06),transparent_60%),radial-gradient(900px_220px_at_110%_120%,rgba(88,101,242,0.08),transparent_60%)]" />
          <div className="relative space-y-5">
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-[13px]">
                Zugangsdaten
              </div>
              <p className="text-[11px] text-slate-500 sm:text-xs">
                Sie finden diese Werte in Ihrem Twilio-Dashboard. Wenn Sie noch keinen Account haben, legen Sie zunächst
                einen kostenlosen Twilio-Account an und durchlaufen die Verifizierung.
              </p>
            </div>

            {/* TWILIO ACCOUNT */}
            <Section title="Twilio Account">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Account SID *"
                  placeholder="z. B. ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={form.accountSid}
                  onChange={onChange('accountSid')}
                  icon={<ShieldCheckIcon className="h-5 w-5" />}
                />
                <Input
                  label="Auth Token *"
                  type="password"
                  placeholder="Auth Token aus der Twilio Console"
                  value={form.authToken}
                  onChange={onChange('authToken')}
                  icon={<KeyIcon className="h-5 w-5" />}
                />
              </div>
            </Section>

            {/* VOICE-APP */}
            <Section title="Voice-Konfiguration">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="TwiML App SID *"
                  placeholder="z. B. APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={form.voiceAppSid}
                  onChange={onChange('voiceAppSid')}
                  icon={<PhoneIcon className="h-5 w-5" />}
                />
                <Input
                  label="Standard Caller ID (E.164) *"
                  placeholder="+49…"
                  value={form.callerId}
                  onChange={onChange('callerId')}
                  icon={<PhoneIcon className="h-5 w-5" />}
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
                Die TwiML-App muss bei Twilio so konfiguriert sein, dass unsere{' '}
                <span className="font-mono text-[10px] font-semibold break-all">https://www.gleno.de/api/telephony/voice</span>{' '}
                als <span className="font-semibold">Voice Request URL</span> hinterlegt ist. Als Caller ID verwendest du
                eine bei Twilio verifizierte oder gekaufte Nummer.
              </p>
            </Section>

            {(saveMessage || errorMessage) && (
              <div
                className={`mt-2 rounded-xl border px-3 py-2 text-[11px] sm:text-xs ${
                  errorMessage ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                }`}
              >
                {errorMessage ?? saveMessage}
              </div>
            )}

            {/* BUTTONS */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTest}
                disabled={loading || testing || saving}
                className="inline-flex items-center gap-2 rounded-lg border border-white/60 bg-white/80 px-4 py-2 text-xs text-slate-900 shadow-sm backdrop-blur hover:border-slate-900 hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
              >
                <ArrowPathIcon className={`h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
                Verbindung testen
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={loading || saving}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-900 bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
              >
                {saving ? 'Speichert…' : 'Einstellungen speichern'}
              </button>
            </div>
          </div>
        </div>

        {/* RECHTE SPALTE: Erklärungen */}
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-4 text-sm shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-xl sm:p-5">
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(700px_200px_at_-10%_-20%,rgba(15,23,42,0.04),transparent_60%),radial-gradient(700px_200px_at_110%_120%,rgba(88,101,242,0.08),transparent_60%)]" />
            <div className="relative space-y-3 text-xs text-slate-600 sm:text-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 sm:text-base">
                <InformationCircleIcon className="h-5 w-5 text-slate-900" />
                Schnellstart: Wo finde ich was?
              </h2>
              <ol className="list-decimal space-y-1 pl-4">
                <li>Loggen Sie sich in die <span className="font-semibold">Twilio Console</span> ein.</li>
                <li>
                  Unter <strong>Account &gt; General</strong> finden Sie <span className="font-mono text-[11px]">Account SID</span> und das{' '}
                  <span className="font-mono text-[11px]">Auth Token</span>.
                </li>
                <li>
                  Unter <strong>Programmable Voice &gt; TwiML Apps</strong> erstellen Sie die <strong>TwiML App</strong> und tragen als „Request URL“
                  Ihre GLENO-Voice-Route ein.
                </li>
                <li>Unter <strong>Phone Numbers</strong> kaufen Sie eine Rufnummer oder portieren Ihre bestehende Nummer zu Twilio.</li>
              </ol>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-4 text-xs text-slate-600 shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-xl sm:p-5 sm:text-sm">
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(700px_220px_at_-10%_-20%,rgba(15,23,42,0.04),transparent_60%),radial-gradient(700px_220px_at_110%_120%,rgba(88,101,242,0.08),transparent_60%)]" />
            <div className="relative max-h-[460px] space-y-4 overflow-y-auto pr-1">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 sm:text-base">
                <InformationCircleIcon className="h-5 w-5 text-slate-900" />
                Detaillierte Erklärung
              </h2>

              <ExplainBlock
                title="Account SID"
                field="Account SID"
                description="Eindeutige Kennung Ihres Twilio-Accounts. Ohne diese ID kann Twilio nicht zuordnen, welchem Konto Anfragen zugeordnet werden."
                steps={[
                  'In der Twilio Console oben links auf Ihr Projekt klicken.',
                  'Unter „Account“ oder „General“ sehen Sie den Eintrag „Account SID“ (beginnt mit AC…).',
                  'Diesen Wert exakt in GLENO übernehmen – keine Leerzeichen, keine Zeilenumbrüche.',
                ]}
                tip="Die Account SID ist kein geheimer Wert, sollte aber trotzdem nicht öffentlich geteilt werden."
              />

              <ExplainBlock
                title="Auth Token"
                field="Auth Token"
                description="Geheimer Schlüssel, mit dem GLENO sich gegenüber der Twilio-API authentifiziert."
                steps={[
                  'In der Twilio Console unter „Account > General“ finden Sie das Feld „Auth Token“.',
                  'Je nach Einstellung müssen Sie auf „Show“ oder „View“ klicken, um den Token anzuzeigen.',
                  'Kopieren Sie den Token nur an sichere Orte (z. B. GLENO, Passwortmanager).',
                ]}
                tip="Wenn Sie das Gefühl haben, dass der Token kompromittiert wurde, erstellen Sie in Twilio ein neues Auth Token und aktualisieren Sie es hier."
              />

              <ExplainBlock
                title="TwiML App SID"
                field="TwiML App SID"
                description="Verweist auf eine TwiML App in Twilio, die steuert, wie ausgehende Calls verarbeitet werden."
                steps={[
                  'In der Twilio Console zu „Programmable Voice > TwiML Apps“ gehen.',
                  'Auf „Create new TwiML App“ klicken, einen Namen vergeben (z. B. „GLENO Web Calls“).',
                  'Unter „Voice Request URL“ trägst du die URL unserer GLENO-Route ein: https://www.gleno.de/api/telephony/voice',
                  'Nach dem Speichern siehst du die „App SID“ (beginnt mit AP…). Diese in GLENO eintragen.',
                ]}
                tip="Du kannst für Test & Produktion getrennte TwiML Apps verwenden und in GLENO jeweils die passende SID hinterlegen."
              />

              <ExplainBlock
                title="Standard Caller ID (Rufnummer im E.164-Format)"
                field="Caller ID / Twilio Nummer"
                description="Rufnummer, mit der deine Anrufe bei Kundinnen und Kunden angezeigt werden – z. B. +4930… im internationalen Format."
                steps={[
                  'In der Twilio Console zu „Phone Numbers“ wechseln.',
                  'Entweder eine neue Nummer kaufen („Buy a number“) oder eine vorhandene Nummer portieren („Port a number“).',
                  'Beim Kauf einer neuen Nummer musst du je nach Land ein sogenanntes „Regulatory Bundle“ bzw. Unternehmens- oder Identitätsnachweise hinterlegen. Die Prüfung kann typischerweise bis zu ca. 7 Tage dauern.',
                  'Bei einer Portierung deiner bestehenden Rufnummer musst du ein Portierungsformular ausfüllen und Nachweise hochladen. Die Portierung dauert in der Praxis oft 1–2 Werktage (je nach Provider auch länger möglich).',
                  'Sobald die Nummer aktiv ist, trägst du sie in GLENO im E.164-Format ein, z. B. +4915112345678.',
                ]}
                tip="Solange dein Regulatory Bundle noch geprüft wird, kann es sein, dass du mit der Nummer noch nicht vollständig telefonieren kannst – das ist normal."
              />

              <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-[11px] text-amber-900 sm:text-xs">
                <p className="mb-1 font-semibold">Wichtiger Hinweis zur Verifizierung & Nummern</p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>Für viele Länder müssen Sie Ihr Unternehmen oder Ihre Person bei Twilio verifizieren (Regulatory Bundle).</li>
                  <li>Die Prüfung kann – je nach Land und Unterlagen – mehrere Tage dauern (Twilio spricht häufig von bis zu ca. einer Woche).</li>
                  <li>Eine Portierung bestehender Rufnummern ist ebenfalls möglich. Planen Sie hier üblicherweise 1–2 Werktage (oder mehr, abhängig vom bisherigen Carrier) ein.</li>
                  <li>GLENO kann technisch mit Twilio arbeiten, sobald eine verifizierte/aktive Nummer zur Verfügung steht – die Einrichtung der Regulatorik erfolgt direkt in Ihrem Twilio-Konto.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/70 p-4 text-[11px] text-slate-600 shadow-[0_10px_40px_rgba(2,6,23,0.08)] backdrop-blur-xl sm:text-xs">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sicherheit</p>
            <p>
              GLENO speichert Ihre Twilio-Zugangsdaten verschlüsselt und nutzt sie ausschließlich zur Generierung von sicherem Telefonieverkehr. Sie können die Verbindung jederzeit deaktivieren, indem Sie die Felder leeren und erneut speichern oder Ihre Credentials direkt in Twilio zurückziehen.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- UI Helfer ---------- */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-[13px]">{title}</h2>
      {children}
    </section>
  )
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  icon,
}: {
  label: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  type?: string
  placeholder?: string
  icon?: ReactNode
}) {
  const base =
    'w-full h-11 rounded-lg border text-sm leading-5 text-slate-900 placeholder:text-slate-400 outline-none ' +
    'border-white/60 bg-white/85 backdrop-blur focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 ring-offset-2'

  return (
    <div className="flex flex-col">
      <label className="mb-1 text-xs font-medium text-slate-700 sm:text-sm">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={base + ' ' + (icon ? 'pl-10 pr-3' : 'px-3')}
        />
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-center text-slate-400">
            {icon}
          </span>
        )}
      </div>
    </div>
  )
}

function ExplainBlock({
  title,
  field,
  description,
  steps,
  tip,
}: {
  title: string
  field: string
  description: string
  steps: string[]
  tip?: string
}) {
  return (
    <section className="space-y-1 rounded-xl border border-white/70 bg-white/70 p-3 shadow-sm">
      <h3 className="text-[12px] font-semibold text-slate-900 sm:text-[13px]">{title}</h3>
      <p className="text-[11px] text-slate-600 sm:text-xs">
        <span className="font-medium">{field}:</span> {description}
      </p>
      <div>
        <p className="mt-1 text-[11px] font-medium text-slate-700 sm:text-xs">So finden Sie dieses Feld:</p>
        <ol className="mt-1 list-decimal space-y-1 pl-4 text-[11px] text-slate-600 sm:text-xs">
          {steps.map((s, idx) => (
            <li key={idx}>{s}</li>
          ))}
        </ol>
      </div>
      {tip && (
        <p className="mt-1 rounded-lg bg-slate-900/3 px-2 py-1 text-[11px] text-slate-500 sm:text-xs">
          <span className="font-medium">Tipp:</span> {tip}
        </p>
      )}
    </section>
  )
}

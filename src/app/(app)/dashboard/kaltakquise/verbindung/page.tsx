'use client'

import { useEffect, useMemo, useState } from 'react'
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
  apiKeySidMasked?: string | null
  status?: ConnectionStatus
  statusMessage?: string | null
}

type FormState = {
  accountSid: string
  authToken: string
  apiKeySid: string
  apiKeySecret: string
  voiceAppSid: string
  callerId: string
}

function clsx(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(' ')
}

function isE164(v: string) {
  return /^\+\d{6,15}$/.test(v.trim())
}

export default function TelephonyConnectionPage() {
  const [status, setStatus] = useState<ConnectionStatus>('unknown')
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const [apiKeyMasked, setApiKeyMasked] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>({
    accountSid: '',
    authToken: '',
    apiKeySid: '',
    apiKeySecret: '',
    voiceAppSid: '',
    callerId: '',
  })

  const pill = useMemo(() => {
    if (status === 'ok')
      return {
        cls: 'ring-emerald-300/60 bg-emerald-50/80 text-emerald-900',
        label: 'Telefonie bereit',
        icon: CheckCircleIcon,
      }
    if (status === 'not_configured')
      return {
        cls: 'ring-amber-300/60 bg-amber-50/80 text-amber-900',
        label: 'Nicht konfiguriert',
        icon: ExclamationTriangleIcon,
      }
    if (status === 'error')
      return {
        cls: 'ring-rose-300/60 bg-rose-50/80 text-rose-900',
        label: 'Fehler',
        icon: ExclamationTriangleIcon,
      }
    return {
      cls: 'ring-slate-900/10 bg-white/70 text-slate-700',
      label: 'Status unbekannt',
      icon: InformationCircleIcon,
    }
  }, [status])

  useEffect(() => {
    let alive = true
    async function run() {
      try {
        setLoading(true)
        setErr(null)
        setOk(null)

        const r = await fetch('/api/telephony/settings', { method: 'GET' })
        const j = (await r.json()) as SettingsResponse

        if (!alive) return

        setStatus(j.status || 'unknown')
        setStatusMsg(j.statusMessage || null)

        setApiKeyMasked(j.apiKeySidMasked || null)

        setForm((prev) => ({
          ...prev,
          accountSid: j.accountSid || '',
          voiceAppSid: j.voiceAppSid || '',
          callerId: j.callerId || '',
          // authToken/apiKeySecret niemals aus GET befüllen
          // apiKeySid bewusst NICHT befüllen, weil wir nur masked zurückbekommen
        }))
      } catch (e: any) {
        if (!alive) return
        setStatus('error')
        setStatusMsg(e?.message || 'Konnte Einstellungen nicht laden.')
      } finally {
        if (!alive) return
        setLoading(false)
      }
    }
    run()
    return () => {
      alive = false
    }
  }, [])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }))
  }

  async function save() {
    setErr(null)
    setOk(null)

    if (!form.accountSid.trim() || !form.authToken.trim() || !form.voiceAppSid.trim() || !form.callerId.trim()) {
      setErr('Bitte füllen Sie Account SID, Auth Token, TwiML App SID und Caller ID aus.')
      return
    }
    if (!form.apiKeySid.trim() || !form.apiKeySecret.trim()) {
      setErr('Bitte füllen Sie API Key SID und API Key Secret aus.')
      return
    }
    if (!isE164(form.callerId)) {
      setErr('Caller ID muss im E.164 Format sein (z.B. +495111234567).')
      return
    }

    try {
      setSaving(true)

      const res = await fetch('/api/telephony/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountSid: form.accountSid.trim(),
          authToken: form.authToken.trim(),
          apiKeySid: form.apiKeySid.trim(),
          apiKeySecret: form.apiKeySecret.trim(),
          voiceAppSid: form.voiceAppSid.trim(),
          callerId: form.callerId.trim(),
        }),
      })

      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || j?.statusMessage || 'Speichern fehlgeschlagen.')

      setStatus(j.status || 'ok')
      setStatusMsg(j.statusMessage || null)
      setApiKeyMasked(j.apiKeySidMasked || null)

      // Secrets wieder leeren (werden nicht zurückgeladen)
      setForm((p) => ({
        ...p,
        authToken: '',
        apiKeySecret: '',
        apiKeySid: '',
      }))

      setOk('Einstellungen gespeichert.')
    } catch (e: any) {
      setErr(e?.message || 'Speichern fehlgeschlagen.')
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  async function testConnection() {
    setErr(null)
    setOk(null)

    try {
      setTesting(true)

      const res = await fetch('/api/telephony/settings/test', { method: 'POST' })
      const j = await res.json()

      if (!res.ok) throw new Error(j?.error || 'Test fehlgeschlagen.')

      setStatus(j.status || 'unknown')
      setStatusMsg(j.statusMessage || null)

      if (j.status === 'ok') setOk(j.statusMessage || 'Verbindung erfolgreich getestet.')
      else setErr(j.statusMessage || 'Verbindung konnte nicht getestet werden.')
    } catch (e: any) {
      setErr(e?.message || 'Test fehlgeschlagen.')
      setStatus('error')
    } finally {
      setTesting(false)
    }
  }

  const shell = 'relative w-full'
  const pagePad = 'px-4 sm:px-6 lg:px-8 2xl:px-12'
  const glassCard =
    'rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_18px_45px_rgba(15,23,42,0.10)]'
  const label = 'text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500'
  const input =
    'w-full rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none backdrop-blur-xl placeholder:text-slate-400 focus:border-indigo-200/70 focus:ring-2 focus:ring-indigo-200/40'
  const btn =
    'inline-flex items-center justify-center gap-2 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-sm text-slate-900 backdrop-blur-xl shadow-[0_10px_24px_rgba(15,23,42,0.08)] hover:bg-white/80 hover:border-slate-900/20 active:translate-y-[1px] transition disabled:opacity-50 disabled:cursor-not-allowed'
  const btnPrimary =
    'inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)] hover:bg-slate-800 active:translate-y-[1px] transition disabled:opacity-50 disabled:cursor-not-allowed'

  const Icon = pill.icon

  return (
    <div className={clsx(shell, pagePad, 'py-6 sm:py-8')}>
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-44 left-[-140px] h-[680px] w-[680px] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.22),rgba(99,102,241,0)_60%)]" />
        <div className="absolute -top-36 right-[-220px] h-[720px] w-[720px] rounded-full bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.14),rgba(15,23,42,0)_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(1200px_700px_at_18%_-10%,rgba(99,102,241,0.20),transparent_60%),radial-gradient(950px_520px_at_86%_12%,rgba(15,23,42,0.10),transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.22] [background-image:radial-gradient(rgba(15,23,42,0.12)_1px,transparent_1px)] [background-size:18px_18px]" />
      </div>

      <div className={clsx(glassCard, 'p-5 sm:p-6')}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className={label}>Zugangsdaten</p>
            <h1 className="mt-1 text-lg sm:text-xl font-semibold text-slate-900">
              Twilio-Verbindung
            </h1>
            <p className="mt-2 text-sm text-slate-700 max-w-3xl">
              Für WebRTC (Twilio Voice SDK) braucht der Server einen signierten Token. Dafür sind
              <span className="font-semibold text-slate-900"> API Key SID + API Key Secret</span> zusätzlich nötig.
            </p>
            {apiKeyMasked ? (
              <p className="mt-2 text-xs text-slate-600">
                Gespeicherter API Key: <span className="font-semibold text-slate-900">{apiKeyMasked}</span>
              </p>
            ) : null}
          </div>

          <span
            className={clsx(
              'inline-flex items-center rounded-full px-3 py-1.5 text-[11px] ring-1',
              pill.cls,
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="ml-1 font-semibold">{pill.label}</span>
          </span>
        </div>

        {statusMsg ? (
          <div className="mt-4 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-sm text-slate-700 backdrop-blur-xl">
            {statusMsg}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {/* Account SID */}
          <div>
            <p className={clsx(label, 'mb-2')}>Account SID *</p>
            <div className="relative">
              <ShieldCheckIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className={clsx(input, 'pl-12')}
                value={form.accountSid}
                onChange={(e) => update('accountSid', e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                disabled={loading}
              />
            </div>
          </div>

          {/* Auth Token */}
          <div>
            <p className={clsx(label, 'mb-2')}>Auth Token *</p>
            <div className="relative">
              <KeyIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className={clsx(input, 'pl-12')}
                value={form.authToken}
                onChange={(e) => update('authToken', e.target.value)}
                placeholder="••••••••••••••••••••••••••"
                type="password"
                disabled={loading}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-600">
              Wird nur zum Speichern/Validieren verwendet und danach nicht mehr angezeigt.
            </p>
          </div>

          {/* API Key SID */}
          <div>
            <p className={clsx(label, 'mb-2')}>API Key SID *</p>
            <div className="relative">
              <KeyIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className={clsx(input, 'pl-12')}
                value={form.apiKeySid}
                onChange={(e) => update('apiKeySid', e.target.value)}
                placeholder="SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                disabled={loading}
              />
            </div>
          </div>

          {/* API Key Secret */}
          <div>
            <p className={clsx(label, 'mb-2')}>API Key Secret *</p>
            <div className="relative">
              <KeyIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className={clsx(input, 'pl-12')}
                value={form.apiKeySecret}
                onChange={(e) => update('apiKeySecret', e.target.value)}
                placeholder="••••••••••••••••••••••••••"
                type="password"
                disabled={loading}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-600">
              Wichtig: Das Secret wird bei Twilio nur einmal angezeigt – sicher speichern.
            </p>
          </div>

          {/* TwiML App SID */}
          <div>
            <p className={clsx(label, 'mb-2')}>TwiML App SID *</p>
            <div className="relative">
              <PhoneIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className={clsx(input, 'pl-12')}
                value={form.voiceAppSid}
                onChange={(e) => update('voiceAppSid', e.target.value)}
                placeholder="APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                disabled={loading}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-600">
              In der TwiML App muss als Voice Request URL deine{' '}
              <span className="font-semibold text-slate-900">/api/telephony/voice</span> hinterlegt sein.
            </p>
          </div>

          {/* Caller ID */}
          <div>
            <p className={clsx(label, 'mb-2')}>Standard Caller ID (E.164) *</p>
            <div className="relative">
              <PhoneIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className={clsx(input, 'pl-12')}
                value={form.callerId}
                onChange={(e) => update('callerId', e.target.value)}
                placeholder="+495111234567"
                disabled={loading}
              />
            </div>
            {!form.callerId.trim() ? null : !isE164(form.callerId) ? (
              <p className="mt-2 text-xs text-rose-700">Ungültiges Format. Bitte +49…</p>
            ) : null}
          </div>
        </div>

        {err ? (
          <div className="mt-5 rounded-2xl border border-rose-200/70 bg-rose-50/80 p-4 text-sm text-rose-900">
            {err}
          </div>
        ) : null}

        {ok ? (
          <div className="mt-5 rounded-2xl border border-emerald-200/70 bg-emerald-50/80 p-4 text-sm text-emerald-900">
            {ok}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button onClick={testConnection} disabled={testing || loading} className={btn}>
            {testing ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <InformationCircleIcon className="h-5 w-5" />}
            Verbindung testen
          </button>

          <button onClick={save} disabled={saving || loading} className={btnPrimary}>
            {saving ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <CheckCircleIcon className="h-5 w-5" />}
            Einstellungen speichern
          </button>
        </div>

        <p className="mt-4 text-[11px] text-slate-600">
          Sicherheit: Secrets werden serverseitig gespeichert und niemals wieder im Klartext angezeigt.
        </p>
      </div>
    </div>
  )
}

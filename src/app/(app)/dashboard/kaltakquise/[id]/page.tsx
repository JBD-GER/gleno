// src/app/kaltakquise/profile/[id]/page.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  PhoneIcon,
  StopIcon,
  MicrophoneIcon,
  SparklesIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { getTwilioDevice } from '@/lib/telephony/twilio-device'

type Profile = {
  id: string
  name: string
  website_url: string | null
  offer_name: string | null
  offer_description: string | null
  target_audience: string | null
  language: 'de' | 'en' | string | null
  customer_profile: {
    summary: string
    pains: string[]
    goals: string[]
    decision_makers: string[]
    deal_sizes: string
  } | null
  intros: Record<string, string> | null
  closing_priorities: {
    primary?: string | null
    secondary?: string | null
    tertiary?: string | null
  } | null
}

type LiveStage = 'intro' | 'need' | 'objection' | 'closing' | 'mixed'

type LiveSuggestResponse = {
  suggestion: string
  backupSuggestion?: string
  stage: string
  objectionType: string | null
  objectionLabel: string | null
  reasoning: string | null
  closingPriority: string | null
  closingPriorityLabel: string | null
  stopSignal?: string | null
  pauseQuestion?: string | null
}

type CallRow = {
  id: string
}

type TranscriptTurn = {
  id: string
  speaker: 'Anrufer' | 'Kunde'
  text: string
  ts: number
}

type CallState = 'idle' | 'starting' | 'ringing' | 'in_call' | 'ending'

function clsx(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(' ')
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16)
}

/** Throttle: max alle X ms */
function useThrottle<T>(value: T, ms: number) {
  const [v, setV] = useState(value)
  const last = useRef(0)
  useEffect(() => {
    const now = Date.now()
    const diff = now - last.current
    if (diff >= ms) {
      last.current = now
      setV(value)
      return
    }
    const t = setTimeout(() => {
      last.current = Date.now()
      setV(value)
    }, ms - diff)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function normalizePhone(input: string) {
  // entfernt Leerzeichen/Klammern/-
  return (input || '').trim().replace(/[^\d+]/g, '')
}

function isEndedStatus(x: string | null | undefined) {
  const v = (x || '').toLowerCase()
  return (
    v === 'completed' ||
    v === 'busy' ||
    v === 'failed' ||
    v === 'no-answer' ||
    v === 'canceled' ||
    v === 'cancelled'
  )
}

export default function AcquisitionProfileCallConsolePage() {
  const params = useParams<{ id: string }>()
  const profileId = params?.id

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Telephony status
  const [telephonyStatus, setTelephonyStatus] = useState<
    'unknown' | 'ok' | 'not_configured' | 'error'
  >('unknown')
  const [telephonyMsg, setTelephonyMsg] = useState<string | null>(null)

  // Call state
  const [phone, setPhone] = useState('')
  const [callState, setCallState] = useState<CallState>('idle')
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null)
  const [callAnsweredAt, setCallAnsweredAt] = useState<number | null>(null)
  const [callRow, setCallRow] = useState<CallRow | null>(null)

  // Twilio conn
  const connRef = useRef<any>(null)

  // Live coach (Stage wird automatisch bestimmt – keine UI-Schalter mehr)
  const [stage, setStage] = useState<LiveStage>('intro')
  const [liveBusy, setLiveBusy] = useState(false)
  const [live, setLive] = useState<LiveSuggestResponse | null>(null)
  const [liveErr, setLiveErr] = useState<string | null>(null)

  // Local transcript (no DB)
  const [turns, setTurns] = useState<TranscriptTurn[]>([])
  const [snippetSpeaker, setSnippetSpeaker] = useState<'Kunde' | 'Anrufer'>('Kunde')
  const [snippetText, setSnippetText] = useState('')

  // Speech Recognition (caller voice only)
  const [srAvailable, setSrAvailable] = useState(false)
  const [srOn, setSrOn] = useState(false)
  const srRef = useRef<any>(null)

  // Post-call modal (minimal)
  const [showPost, setShowPost] = useState(false)
  const [outcome, setOutcome] = useState<'success' | 'fail'>('fail')
  const [improveIntro, setImproveIntro] = useState(true)
  const [postNotes, setPostNotes] = useState('')
  const [postBusy, setPostBusy] = useState(false)
  const [postAI, setPostAI] = useState<any>(null)
  const [postErr, setPostErr] = useState<string | null>(null)

  // ✅ pro Call nur 1x Initial-Suggest
  const initialSuggestDoneRef = useRef(false)

  // Cleanup: Verbindung sauber trennen
  useEffect(() => {
    return () => {
      try {
        connRef.current?.disconnect?.()
      } catch {}
      connRef.current = null

      try {
        srRef.current?.stop?.()
      } catch {}
      srRef.current = null
    }
  }, [])

  // Call timer
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!(callState === 'ringing' || callState === 'in_call' || callState === 'starting'))
      return
    const t = setInterval(() => setTick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [callState])

  const callDurationSec = useMemo(() => {
    if (!callStartedAt) return 0
    if (callState === 'idle') return 0
    return Math.max(0, Math.round((Date.now() - callStartedAt) / 1000))
  }, [callStartedAt, callState, tick])

  const callBadge = useMemo(() => {
    switch (callState) {
      case 'idle':
        return { label: 'Bereit', cls: 'ring-slate-900/10 bg-white/70 text-slate-700' }
      case 'starting':
        return { label: 'Startet…', cls: 'ring-indigo-300/50 bg-indigo-50/80 text-indigo-800' }
      case 'ringing':
        return { label: 'Klingelt…', cls: 'ring-amber-300/60 bg-amber-50/80 text-amber-900' }
      case 'in_call':
        return { label: 'Im Gespräch', cls: 'ring-emerald-300/60 bg-emerald-50/80 text-emerald-900' }
      case 'ending':
        return { label: 'Beendet…', cls: 'ring-rose-300/60 bg-rose-50/80 text-rose-900' }
      default:
        return { label: 'Status', cls: 'ring-slate-900/10 bg-white/70 text-slate-700' }
    }
  }, [callState])

  // “snippet” für suggest-live: bewusst kurz halten (kein Volltranskript)
  const computedSnippet = useMemo(() => {
    const last = turns.slice(-6)
    const lines = last.map((t) => `${t.speaker}: ${t.text}`)
    return lines.join('\n').slice(0, 900)
  }, [turns])

  const throttledSnippet = useThrottle(computedSnippet, 650)

  /* ----------------------------- Load Profile + Telephony status ----------------------------- */

  useEffect(() => {
    let alive = true
    async function run() {
      try {
        setLoading(true)
        setError(null)

        const p = await fetch(
          `/api/ai/acquisition/profile?id=${encodeURIComponent(profileId)}`,
          { method: 'GET' }
        )
        const pj = await p.json()
        if (!p.ok) throw new Error(pj?.error || 'Profil konnte nicht geladen werden.')
        if (!alive) return
        setProfile(pj.profile as Profile)

        const s = await fetch(`/api/telephony/settings`, { method: 'GET' })
        const sj = await s.json()
        if (!alive) return
        setTelephonyStatus(sj.status || 'unknown')
        setTelephonyMsg(sj.statusMessage || null)
      } catch (e: any) {
        if (!alive) return
        setError(e?.message || 'Fehler beim Laden.')
      } finally {
        if (!alive) return
        setLoading(false)
      }
    }
    if (profileId) run()
    return () => {
      alive = false
    }
  }, [profileId])

  /* ----------------------------- SpeechRecognition (caller) ----------------------------- */

  useEffect(() => {
    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) {
      setSrAvailable(false)
      return
    }
    setSrAvailable(true)
    const rec = new SR()
    rec.lang = 'de-DE'
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (ev: any) => {
      let finalText = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i]
        if (r.isFinal) finalText += (r[0]?.transcript || '').trim() + ' '
      }
      finalText = finalText.trim()
      if (finalText) {
        setTurns((prev) => [
          ...prev,
          {
            id: uid(),
            speaker: 'Anrufer',
            text: finalText.slice(0, 240),
            ts: Date.now(),
          },
        ])
      }
    }

    rec.onerror = () => {
      setSrOn(false)
    }

    srRef.current = rec
    return () => {
      try {
        rec.stop()
      } catch {}
      srRef.current = null
    }
  }, [])

  function toggleSpeech() {
    if (!srAvailable || !srRef.current) return
    if (srOn) {
      try {
        srRef.current.stop()
      } catch {}
      setSrOn(false)
    } else {
      try {
        srRef.current.start()
        setSrOn(true)
      } catch {
        setSrOn(false)
      }
    }
  }

  /* ----------------------------- Stage Auto-Logic (keine Einstell-Buttons) ----------------------------- */

  useEffect(() => {
    if (callState === 'idle') {
      setStage('intro')
      return
    }
    if (callState !== 'ringing' && callState !== 'in_call') return

    // Wenn Live bereits einen Einwand erkannt hat, bleiben wir dort.
    if (live?.objectionType || live?.objectionLabel) {
      setStage('objection')
      return
    }

    // nach kurzer Zeit von Intro -> Need
    if (callDurationSec >= 45 && stage === 'intro') {
      setStage('need')
      return
    }

    // Keywords aus letzter Kundenaussage → Einwand
    const lastCustomer = turns
      .slice()
      .reverse()
      .find((t) => t.speaker === 'Kunde')?.text
      ?.toLowerCase()

    if (lastCustomer) {
      const objectionHints = [
        'kein interesse',
        'zu teuer',
        'haben wir schon',
        'kein bedarf',
        'keine zeit',
        'schicken sie',
        'schick mir',
        'mail',
        'rufen sie',
        'später',
        'nicht zuständig',
        'kein entscheid',
        'budget',
      ]
      if (objectionHints.some((k) => lastCustomer.includes(k))) {
        setStage('objection')
        return
      }
    }
  }, [callState, callDurationSec, live?.objectionType, live?.objectionLabel, turns, stage])

  /* ----------------------------- Helpers: Live Suggest Fetch ----------------------------- */

  async function fetchLiveSuggestion(snippet: string, forceStage?: LiveStage) {
    if (!profileId) return
    try {
      setLiveBusy(true)
      setLiveErr(null)

      const res = await fetch('/api/ai/acquisition/suggest-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          transcriptSnippet: snippet,
          stage: (forceStage || stage) as any,
          direction: 'outbound',
          language: profile?.language || 'de',
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'Live-Vorschlag fehlgeschlagen.')
      setLive(j as LiveSuggestResponse)
    } catch (e: any) {
      setLiveErr(e?.message || 'Live-Vorschlag fehlgeschlagen.')
    } finally {
      setLiveBusy(false)
    }
  }

  /* ----------------------------- Live Suggest (throttled) ----------------------------- */

  useEffect(() => {
    if (!(callState === 'ringing' || callState === 'in_call')) return
    if (!profileId) return
    if (!throttledSnippet || throttledSnippet.trim().length < 10) return

    let alive = true
    async function run() {
      try {
        setLiveBusy(true)
        setLiveErr(null)

        const res = await fetch('/api/ai/acquisition/suggest-live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profileId,
            transcriptSnippet: throttledSnippet,
            stage,
            direction: 'outbound',
            language: profile?.language || 'de',
          }),
        })
        const j = await res.json()
        if (!res.ok) throw new Error(j?.error || 'Live-Vorschlag fehlgeschlagen.')
        if (!alive) return
        setLive(j as LiveSuggestResponse)
      } catch (e: any) {
        if (!alive) return
        setLiveErr(e?.message || 'Live-Vorschlag fehlgeschlagen.')
      } finally {
        if (!alive) return
        setLiveBusy(false)
      }
    }
    run()
    return () => {
      alive = false
    }
  }, [throttledSnippet, stage, callState, profileId, profile?.language])

  /* ----------------------------- ✅ Initial Suggest on Call Start ----------------------------- */

  useEffect(() => {
    if (!(callState === 'ringing' || callState === 'in_call')) return
    if (!profileId) return
    if (!profile) return
    if (initialSuggestDoneRef.current) return
    if (turns.length > 0) return

    initialSuggestDoneRef.current = true

    const bootstrapSnippet =
      'Call startet jetzt. Kunde hat noch nichts gesagt. Formuliere den ersten Satz für ein seriöses B2B-Intro.'

    fetchLiveSuggestion(bootstrapSnippet, 'intro')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState, profileId, profile, turns.length])

  /* ----------------------------- ✅ Poll DB for Remote Hangup ----------------------------- */

  useEffect(() => {
    if (!(callState === 'starting' || callState === 'ringing' || callState === 'in_call')) return
    if (!callRow?.id) return

    let alive = true

    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/telephony/calls?id=${encodeURIComponent(callRow.id)}`, {
          method: 'GET',
          cache: 'no-store',
        })
        const j = await res.json()
        if (!res.ok) return
        if (!alive) return

        const c = j?.call
        const endedAt = c?.ended_at || c?.endedAt || null
        const result = c?.result || null

        // sobald DB sagt "beendet" -> UI sauber schließen
        // FIX TS2367: hier callState bereits auf starting|ringing|in_call eingeengt,
        // daher keine Vergleiche mit 'idle'/'ending' (unmöglich) mehr.
        if (endedAt || isEndedStatus(result)) {
          const reason = result ? `twilio_${String(result)}` : 'remote_completed'
          await endCallInternal(reason)
        }
      } catch {
        // polling errors ignorieren
      }
    }, 1500)

    return () => {
      alive = false
      clearInterval(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState, callRow?.id])

  /* ----------------------------- Twilio: call ----------------------------- */

  async function startCall() {
    if (!profileId) return
    if (callState !== 'idle') return

    const raw = phone.trim()
    if (!raw) return

    try {
      setTelephonyMsg(null)
      setCallState('starting')
      setLive(null)
      setLiveErr(null)
      setTurns([])
      setPostAI(null)
      setPostErr(null)
      setShowPost(false)

      // ✅ reset initial suggest flag pro Call
      initialSuggestDoneRef.current = false

      // Reset minimal post state
      setOutcome('fail')
      setImproveIntro(true)
      setPostNotes('')

      const startedAt = Date.now()
      setCallStartedAt(startedAt)
      setCallAnsweredAt(null)
      setStage('intro')

      const normalizedTo = normalizePhone(raw)
      if (!normalizedTo) throw new Error('Bitte eine gültige Telefonnummer eingeben (z.B. +49…).')

      // 1) Call in DB anlegen
      const c = await fetch('/api/telephony/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          direction: 'outbound',
          remoteNumber: normalizedTo,
          startedAt: new Date(startedAt).toISOString(),
          result: 'started',
        }),
      })
      const cj = await c.json()
      if (!c.ok) throw new Error(cj?.error || 'Call konnte nicht gespeichert werden.')

      const createdCallId: string = cj?.call?.id
      if (!createdCallId) throw new Error('Call-ID fehlt in /api/telephony/calls Response.')

      setCallRow({ id: createdCallId })

      // 2) Device holen (Singleton + Mic permission + Token refresh)
      const device = await getTwilioDevice()

      setCallState('ringing')

      console.log('[twilio] connecting', { To: normalizedTo, profileId, callId: createdCallId })

      const conn = await device.connect({
        params: {
          To: normalizedTo,
          profileId,
          callId: createdCallId,
          direction: 'outbound',
        },
      })

      connRef.current = conn

      conn.on('accept', async () => {
        console.log('[twilio] accept')
        const answeredAt = Date.now()
        setCallAnsweredAt(answeredAt)
        setCallState('in_call')

        await fetch('/api/telephony/calls', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: createdCallId,
            answeredAt: new Date(answeredAt).toISOString(),
            result: 'answered',
          }),
        })
      })

      conn.on('disconnect', async () => {
        console.log('[twilio] disconnect')
        await endCallInternal('remote_disconnected')
      })

      conn.on('cancel', async () => {
        console.log('[twilio] cancel')
        await endCallInternal('cancelled')
      })

      conn.on('reject', async () => {
        console.log('[twilio] reject')
        await endCallInternal('rejected')
      })

      conn.on('error', async (err: any) => {
        console.error('[twilio] connection error', err)
        setTelephonyMsg(err?.message || 'Twilio Verbindungsfehler')
        await endCallInternal('error')
      })
    } catch (e: any) {
      console.error('[call] start error', e)
      setCallState('idle')
      setLiveErr(e?.message || 'Call Start fehlgeschlagen.')
    }
  }

  async function hangup() {
    await endCallInternal('hangup')
  }

  async function endCallInternal(result: string) {
    if (callState === 'idle' || callState === 'ending') return
    setCallState('ending')

    try {
      try {
        connRef.current?.disconnect?.()
      } catch {}
      connRef.current = null

      const endedAt = Date.now()
      const started = callStartedAt ?? endedAt
      const durationSec = Math.max(0, Math.round((endedAt - started) / 1000))

      if (callRow?.id) {
        await fetch('/api/telephony/calls', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: callRow.id,
            endedAt: new Date(endedAt).toISOString(),
            durationSec,
            result,
          }),
        })
      }
    } catch {
      // ignore
    } finally {
      setCallState('idle')
      setSrOn(false)
      try {
        srRef.current?.stop?.()
      } catch {}
      setShowPost(true)
    }
  }

  /* ----------------------------- Transcript input helpers ----------------------------- */

  function addSnippet() {
    const t = snippetText.trim()
    if (!t) return
    setTurns((prev) => [
      ...prev,
      { id: uid(), speaker: snippetSpeaker, text: t.slice(0, 240), ts: Date.now() },
    ])
    setSnippetText('')
  }

  /* ----------------------------- Post-call analysis (minimal) ----------------------------- */

  async function runPostCallAnalysis() {
    if (!profileId) return
    try {
      setPostBusy(true)
      setPostErr(null)
      setPostAI(null)

      const safeSnippet = turns
        .slice(-10)
        .map((t) => `${t.speaker}: ${t.text}`)
        .join('\n')
        .slice(0, 900)

      const stageForAnalysis: LiveStage = improveIntro ? 'intro' : 'mixed'

      const res = await fetch('/api/ai/acquisition/post-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          outcome,
          stage: stageForAnalysis,
          callDirection: 'outbound',
          snippet: safeSnippet || undefined,
          manualNotes: postNotes?.trim() ? postNotes.trim().slice(0, 900) : undefined,
          language: profile?.language || 'de',
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'Post-Call Analyse fehlgeschlagen.')
      setPostAI(j)
    } catch (e: any) {
      setPostErr(e?.message || 'Post-Call Analyse fehlgeschlagen.')
    } finally {
      setPostBusy(false)
    }
  }

  async function saveLearningFromPost() {
    if (!profileId || !postAI?.newSuggestion?.script) return
    try {
      const objectionType = postAI?.classification?.objectionType ?? null
      const objectionLabel = postAI?.classification?.objectionLabel ?? null

      const stageToSave: LiveStage = improveIntro ? 'intro' : 'mixed'

      await fetch('/api/ai/acquisition/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          stage: stageToSave,
          callDirection: 'outbound',
          outcome,
          objectionType,
          objectionLabel,
          suggestion: postAI.newSuggestion.script,
          usageHint: postAI.newSuggestion.usageHint || undefined,
        }),
      })

      setShowPost(false)
    } catch {
      // ignore
    }
  }

  /* ----------------------------- UI Styles ----------------------------- */

  const shell = 'relative w-full'
  const pagePad = 'px-4 sm:px-6 lg:px-8 2xl:px-12'
  const sectionGap = 'space-y-5 sm:space-y-6'

  const glassCard =
    'rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_18px_45px_rgba(15,23,42,0.10)]'
  const glassCardSoft =
    'rounded-3xl border border-white/50 bg-white/60 backdrop-blur-xl shadow-[0_12px_30px_rgba(15,23,42,0.08)]'
  const glassInner =
    'rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_10px_24px_rgba(15,23,42,0.08)]'

  const label = 'text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500'
  const title = 'text-base sm:text-lg font-medium text-slate-900'
  const sub = 'text-xs sm:text-sm text-slate-600 leading-relaxed'

  const input =
    'w-full rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none backdrop-blur-xl placeholder:text-slate-400 focus:border-indigo-200/70 focus:ring-2 focus:ring-indigo-200/40'

  const btn =
    'inline-flex items-center justify-center gap-2 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-sm text-slate-900 backdrop-blur-xl shadow-[0_10px_24px_rgba(15,23,42,0.08)] hover:bg-white/80 hover:border-slate-900/20 active:translate-y-[1px] transition'
  const btnPrimary =
    'inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)] hover:bg-slate-800 active:translate-y-[1px] transition disabled:opacity-50 disabled:cursor-not-allowed'
  const btnDanger =
    'inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm text-rose-900 backdrop-blur-xl shadow-[0_10px_24px_rgba(15,23,42,0.08)] hover:bg-rose-100/80 active:translate-y-[1px] transition'

  const chip =
    'inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1.5 text-[11px] text-slate-700 backdrop-blur-xl shadow-[0_10px_22px_rgba(15,23,42,0.06)]'

  /* ----------------------------- UI ----------------------------- */

  if (loading) {
    return (
      <div className={clsx(shell, pagePad, 'py-6 sm:py-8')}>
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.22),rgba(99,102,241,0)_60%)]" />
          <div className="absolute -bottom-48 right-[-120px] h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.16),rgba(15,23,42,0)_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(900px_520px_at_85%_15%,rgba(15,23,42,0.10),transparent_60%)]" />
        </div>

        <div className={clsx(glassCard, 'p-5 sm:p-6')}>
          <div className="flex items-center gap-2 text-slate-700">
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
            <span className="text-sm">Profil wird geladen…</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className={clsx(shell, pagePad, 'py-6 sm:py-8')}>
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.22),rgba(99,102,241,0)_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(99,102,241,0.18),transparent_60%)]" />
        </div>

        <div className={clsx(glassCard, 'p-5 sm:p-6')}>
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-slate-900">Konnte Profil nicht laden</p>
              <p className="mt-1 text-xs text-slate-600">{error || 'Unbekannter Fehler'}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const telephonyPill = (() => {
    if (telephonyStatus === 'ok') {
      return {
        cls: 'ring-emerald-300/60 bg-emerald-50/80 text-emerald-900',
        label: 'Telefonie bereit',
      }
    }
    if (telephonyStatus === 'not_configured') {
      return {
        cls: 'ring-amber-300/60 bg-amber-50/80 text-amber-900',
        label: 'Nicht konfiguriert',
      }
    }
    if (telephonyStatus === 'error') {
      return {
        cls: 'ring-rose-300/60 bg-rose-50/80 text-rose-900',
        label: 'Telefonie Fehler',
      }
    }
    return { cls: 'ring-slate-900/10 bg-white/70 text-slate-700', label: 'Status unbekannt' }
  })()

  return (
    <div className={clsx(shell, pagePad, 'py-6 sm:py-8')}>
      {/* Background (page-local, full width) */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-44 left-[-140px] h-[680px] w-[680px] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.22),rgba(99,102,241,0)_60%)]" />
        <div className="absolute -top-36 right-[-220px] h-[720px] w-[720px] rounded-full bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.14),rgba(15,23,42,0)_60%)]" />
        <div className="absolute -bottom-56 left-1/3 h-[760px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.12),rgba(56,189,248,0)_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(1200px_700px_at_18%_-10%,rgba(99,102,241,0.20),transparent_60%),radial-gradient(950px_520px_at_86%_12%,rgba(15,23,42,0.10),transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.22] [background-image:radial-gradient(rgba(15,23,42,0.12)_1px,transparent_1px)] [background-size:18px_18px]" />
      </div>

      <div className={sectionGap}>
        {/* Header */}
        <div className={clsx(glassCard, 'p-5 sm:p-6')}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className={label}>Live Call Konsole</p>
              <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-end sm:gap-3">
                <h1 className="text-lg sm:text-xl font-semibold text-slate-900 truncate">
                  {profile.name}
                </h1>
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      'inline-flex items-center rounded-full px-3 py-1.5 text-[11px] ring-1',
                      callBadge.cls
                    )}
                  >
                    <span className="font-semibold">{callBadge.label}</span>
                    {(callState === 'starting' ||
                      callState === 'ringing' ||
                      callState === 'in_call') && (
                      <span className="ml-2 inline-flex items-center gap-1 text-[11px]">
                        <ClockIcon className="h-4 w-4" />
                        {formatDuration(callDurationSec)}
                      </span>
                    )}
                  </span>

                  <span
                    className={clsx(
                      'inline-flex items-center rounded-full px-3 py-1.5 text-[11px] ring-1',
                      telephonyPill.cls
                    )}
                  >
                    {telephonyStatus === 'ok' ? (
                      <CheckCircleIcon className="h-4 w-4" />
                    ) : (
                      <ExclamationTriangleIcon className="h-4 w-4" />
                    )}
                    <span className="ml-1 font-semibold">{telephonyPill.label}</span>
                  </span>
                </div>
              </div>

              <p className={clsx(sub, 'mt-2')}>
                {profile.offer_name ? (
                  <>
                    Fokus:{' '}
                    <span className="font-medium text-slate-900">{profile.offer_name}</span>
                    {profile.target_audience ? (
                      <>
                        {' '}
                        · Zielgruppe:{' '}
                        <span className="font-medium text-slate-900">
                          {profile.target_audience}
                        </span>
                      </>
                    ) : null}
                  </>
                ) : (
                  'Kein Offer-Name gesetzt'
                )}
              </p>

              {telephonyMsg ? (
                <div className="mt-3 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-xs text-slate-700 backdrop-blur-xl">
                  {telephonyMsg}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {callRow?.id ? (
                <span className={clsx(chip, 'justify-center')}>
                  Call-ID:{' '}
                  <span className="font-semibold text-slate-900">
                    {callRow.id.slice(0, 8)}…
                  </span>
                </span>
              ) : null}

              {profile.website_url ? (
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className={clsx(btn, 'px-4 py-2.5 text-xs')}
                >
                  Website öffnen
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {/* Kundenprofil */}
        <div className={clsx(glassCard, 'p-5 sm:p-6')}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl">
                <SparklesIcon className="h-5 w-5 text-slate-900" />
              </div>
              <div>
                <p className={label}>Kundenprofil</p>
                <h2 className={title}>Zusammenfassung & Trigger</h2>
              </div>
            </div>

            <span className={clsx(chip, 'hidden sm:inline-flex')}>
              Sprache:{' '}
              <span className="font-semibold text-slate-900">
                {(profile.language || 'de').toString().toUpperCase()}
              </span>
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-white/60 bg-white/70 p-4 sm:p-5 backdrop-blur-xl">
            <p className="text-sm text-slate-800 leading-relaxed">
              {profile.customer_profile?.summary || 'Kein Summary vorhanden.'}
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className={clsx(glassInner, 'p-4')}>
              <p className={label}>Pains</p>
              <ul className="mt-3 space-y-2 text-xs text-slate-700">
                {(profile.customer_profile?.pains || []).slice(0, 6).map((x, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400/80" />
                    <span className="leading-relaxed">{x}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={clsx(glassInner, 'p-4')}>
              <p className={label}>Goals</p>
              <ul className="mt-3 space-y-2 text-xs text-slate-700">
                {(profile.customer_profile?.goals || []).slice(0, 6).map((x, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400/80" />
                    <span className="leading-relaxed">{x}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={clsx(glassInner, 'p-4')}>
              <p className={label}>Entscheider</p>
              <ul className="mt-3 space-y-2 text-xs text-slate-700">
                {(profile.customer_profile?.decision_makers || []).slice(0, 6).map((x, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400/80" />
                    <span className="leading-relaxed">{x}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-[11px] text-slate-700">
                Deal Sizes:{' '}
                <span className="font-semibold text-slate-900">
                  {profile.customer_profile?.deal_sizes || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Call Control (minimal) */}
        <div className={clsx(glassCard, 'p-5 sm:p-6')}>
          <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className={label}>Telefonnummer</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Es wird nur <span className="font-semibold text-slate-900">maskiert + gehasht</span>{' '}
                    gespeichert.
                  </p>
                </div>
                <span className={clsx(chip, 'hidden md:inline-flex')}>
                  Stage (auto): <span className="font-semibold text-slate-900">{stage}</span>
                </span>
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+49…"
                  className={clsx(input, 'sm:flex-1')}
                  disabled={callState !== 'idle'}
                />

                {callState === 'idle' ? (
                  <button
                    onClick={startCall}
                    disabled={telephonyStatus !== 'ok' || !phone.trim()}
                    className={clsx(btnPrimary, 'sm:w-[190px]')}
                  >
                    <PhoneIcon className="h-5 w-5" />
                    Call starten
                  </button>
                ) : (
                  <button onClick={hangup} className={clsx(btnDanger, 'sm:w-[190px]')}>
                    <StopIcon className="h-5 w-5" />
                    Auflegen
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-5">
              <p className={clsx(label, 'mb-2')}>Live</p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={toggleSpeech}
                  disabled={!srAvailable || !(callState === 'ringing' || callState === 'in_call')}
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs backdrop-blur-xl transition shadow-[0_10px_22px_rgba(15,23,42,0.06)]',
                    srOn
                      ? 'border border-emerald-300/70 bg-emerald-50/80 text-emerald-900 ring-1 ring-emerald-200/40'
                      : 'border border-white/60 bg-white/70 text-slate-800 hover:bg-white/80 hover:border-slate-900/20',
                    (!srAvailable || !(callState === 'ringing' || callState === 'in_call')) &&
                      'opacity-50 cursor-not-allowed'
                  )}
                >
                  <MicrophoneIcon className="h-4 w-4" />
                  {srOn ? 'Mikro an' : 'Mikro aus'}
                </button>

                <span className={clsx(chip, 'hidden sm:inline-flex')}>
                  Einwand:{' '}
                  <span className="font-semibold text-slate-900">{live?.objectionLabel || '—'}</span>
                </span>

                <span className={clsx(chip, 'hidden sm:inline-flex')}>
                  Ziel:{' '}
                  <span className="font-semibold text-slate-900">
                    {live?.closingPriorityLabel || '—'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Live suggestion */}
          <div className="mt-6 grid gap-5 xl:grid-cols-12">
            <div className="xl:col-span-8">
              <div className={clsx(glassCardSoft, 'p-5')}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={label}>Sag jetzt</p>
                    <p className="mt-1 text-sm text-slate-700">
                      Kurz, ruhig, konkret – immer Richtung nächster Schritt.
                    </p>
                  </div>

                  <span className={clsx(chip, 'hidden md:inline-flex')}>
                    Snippet:{' '}
                    <span className="font-semibold text-slate-900">
                      {Math.min(900, computedSnippet.length)}
                    </span>
                    /900
                  </span>
                </div>

                <div className="mt-4 rounded-2xl border border-white/60 bg-white/75 p-4 sm:p-5 backdrop-blur-xl shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
                  {callState === 'idle' ? (
                    <p className="text-sm text-slate-700">
                      Telefonnummer eingeben → Call starten → Snippet hinzufügen oder Mikro aktivieren.
                    </p>
                  ) : liveBusy ? (
                    <div className="flex items-center gap-2 text-slate-700">
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      <p className="text-sm">KI denkt…</p>
                    </div>
                  ) : live?.suggestion ? (
                    <p className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed">
                      {live.suggestion}
                    </p>
                  ) : liveErr ? (
                    <p className="text-sm text-rose-700">{liveErr}</p>
                  ) : (
                    <p className="text-sm text-slate-700">Warte auf Gesprächs-Snippet…</p>
                  )}
                </div>

                {live?.backupSuggestion ? (
                  <div className="mt-4 rounded-2xl border border-white/60 bg-white/70 p-4 backdrop-blur-xl">
                    <p className={clsx(label, 'text-slate-500')}>Backup</p>
                    <p className="mt-2 text-sm text-slate-800 leading-relaxed">
                      {live.backupSuggestion}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="xl:col-span-4">
              <div className={clsx(glassCardSoft, 'p-5')}>
                <p className={label}>Schnellbausteine</p>
                <p className="mt-1 text-sm text-slate-700">
                  Dein Intro + Closing-Prioritäten (aus Profil).
                </p>

                <div className="mt-4 space-y-3">
                  <div className={clsx(glassInner, 'p-4')}>
                    <p className={clsx(label, 'text-slate-500')}>Intro (neutral)</p>
                    <p className="mt-2 text-sm text-slate-800 leading-relaxed">
                      {profile.intros?.neutral || '—'}
                    </p>
                  </div>

                  <div className={clsx(glassInner, 'p-4')}>
                    <p className={clsx(label, 'text-slate-500')}>Prio 1</p>
                    <p className="mt-2 text-sm text-slate-800 leading-relaxed">
                      {profile.closing_priorities?.primary || '—'}
                    </p>
                  </div>

                  <div className={clsx(glassInner, 'p-4')}>
                    <p className={clsx(label, 'text-slate-500')}>Prio 2</p>
                    <p className="mt-2 text-sm text-slate-800 leading-relaxed">
                      {profile.closing_priorities?.secondary || '—'}
                    </p>
                  </div>

                  <div className={clsx(glassInner, 'p-4')}>
                    <p className={clsx(label, 'text-slate-500')}>Prio 3</p>
                    <p className="mt-2 text-sm text-slate-800 leading-relaxed">
                      {profile.closing_priorities?.tertiary || '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Snippet input */}
          <div className="mt-6">
            <div className={clsx(glassCardSoft, 'p-5')}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className={label}>Snippet hinzufügen</p>
                  <p className="mt-1 text-sm text-slate-700">
                    Kurz & ohne personenbezogene Inhalte – damit Live-Coach besser wird.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSnippetSpeaker('Kunde')}
                    className={clsx(
                      'rounded-2xl border px-3 py-2 text-xs transition',
                      snippetSpeaker === 'Kunde'
                        ? 'border-indigo-200/70 bg-indigo-50/80 text-indigo-900 ring-1 ring-indigo-200/40'
                        : 'border-white/60 bg-white/70 text-slate-800 hover:bg-white/80 hover:border-slate-900/20'
                    )}
                    disabled={callState === 'idle'}
                  >
                    Kunde
                  </button>
                  <button
                    onClick={() => setSnippetSpeaker('Anrufer')}
                    className={clsx(
                      'rounded-2xl border px-3 py-2 text-xs transition',
                      snippetSpeaker === 'Anrufer'
                        ? 'border-indigo-200/70 bg-indigo-50/80 text-indigo-900 ring-1 ring-indigo-200/40'
                        : 'border-white/60 bg-white/70 text-slate-800 hover:bg-white/80 hover:border-slate-900/20'
                    )}
                    disabled={callState === 'idle'}
                  >
                    Ich
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={snippetText}
                  onChange={(e) => setSnippetText(e.target.value)}
                  placeholder={
                    snippetSpeaker === 'Kunde'
                      ? 'z.B. „Kein Interesse“ / „Schicken Sie Infos“ …'
                      : 'z.B. „Verstehe ich – kurz dazu…“'
                  }
                  className={clsx(input, 'sm:flex-1')}
                  disabled={callState === 'idle'}
                />
                <button
                  onClick={addSnippet}
                  disabled={callState === 'idle' || !snippetText.trim()}
                  className={clsx(btn, 'sm:w-[160px] disabled:opacity-50 disabled:cursor-not-allowed')}
                >
                  Hinzufügen
                </button>
              </div>
            </div>
          </div>

          {/* Transcript list */}
          <div className="mt-6">
            <div className={clsx(glassCardSoft, 'p-5')}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className={label}>Gespräch</p>
                  <p className="mt-1 text-sm text-slate-700">Lokal – wird nicht gespeichert.</p>
                </div>

                <div className="flex gap-2">
                  <span className={chip}>
                    Turns: <span className="font-semibold text-slate-900">{turns.length}</span>
                  </span>
                  {callAnsweredAt ? (
                    <span className={chip}>
                      Abgenommen:{' '}
                      <span className="font-semibold text-slate-900">
                        {new Date(callAnsweredAt).toLocaleTimeString('de-DE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 max-h-[360px] overflow-auto rounded-2xl border border-white/60 bg-white/70 p-3 backdrop-blur-xl">
                {turns.length === 0 ? (
                  <p className="text-sm text-slate-700">Noch keine Snippets.</p>
                ) : (
                  <div className="space-y-2">
                    {turns.map((t) => (
                      <div
                        key={t.id}
                        className={clsx(
                          'rounded-2xl border p-3 backdrop-blur-xl',
                          t.speaker === 'Anrufer'
                            ? 'border-indigo-200/60 bg-indigo-50/70'
                            : 'border-white/60 bg-white/70'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-900">{t.speaker}</p>
                          <p className="text-[11px] text-slate-500">
                            {new Date(t.ts).toLocaleTimeString('de-DE', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <p className="mt-2 text-sm text-slate-800 leading-relaxed">{t.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Post call modal (minimal) */}
        {showPost ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div
              className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
              onClick={() => setShowPost(false)}
            />
            <div className="relative w-full max-w-4xl">
              <div className="pointer-events-none absolute -inset-2 rounded-[32px] bg-[radial-gradient(900px_420px_at_20%_0%,rgba(99,102,241,0.25),transparent_55%),radial-gradient(700px_360px_at_90%_20%,rgba(15,23,42,0.12),transparent_55%)]" />
              <div className={clsx(glassCard, 'relative p-5 sm:p-6')}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={label}>Nach dem Gespräch</p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">
                      Feedback → KI → optional speichern
                    </h3>
                    <p className="mt-1 text-sm text-slate-700">
                      Minimal: Outcome + Notiz. Dann Analyse. Dann ggf. Learning speichern.
                    </p>
                  </div>

                  <button onClick={() => setShowPost(false)} className={clsx(btn, 'px-3 py-2 text-xs')}>
                    Schließen
                  </button>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className={clsx(glassInner, 'p-4')}>
                    <p className={label}>Outcome</p>
                    <div className="mt-3 flex gap-2">
                      {(['success', 'fail'] as const).map((v) => {
                        const active = outcome === v
                        const txt = v === 'success' ? 'Erfolg' : 'Misserfolg'
                        return (
                          <button
                            key={v}
                            onClick={() => setOutcome(v)}
                            className={clsx(
                              'rounded-2xl border px-3 py-2 text-xs transition',
                              active
                                ? 'border-indigo-200/70 bg-indigo-50/80 text-indigo-900 ring-1 ring-indigo-200/40'
                                : 'border-white/60 bg-white/70 text-slate-800 hover:bg-white/80 hover:border-slate-900/20'
                            )}
                          >
                            {txt}
                          </button>
                        )
                      })}
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <input
                        id="improveIntro"
                        type="checkbox"
                        checked={improveIntro}
                        onChange={(e) => setImproveIntro(e.target.checked)}
                        className="h-4 w-4 rounded border-white/60"
                      />
                      <label htmlFor="improveIntro" className="text-sm text-slate-700">
                        Intro verbessern (Learning wird unter{' '}
                        <span className="font-semibold text-slate-900">Intro</span> gespeichert)
                      </label>
                    </div>
                  </div>

                  <div className={clsx(glassInner, 'p-4')}>
                    <p className={label}>Notiz (ohne PII)</p>
                    <textarea
                      value={postNotes}
                      onChange={(e) => setPostNotes(e.target.value)}
                      rows={4}
                      placeholder="z.B. „Preis-Einwand, möchte Info-Mail, Timing nächstes Quartal…“"
                      className={clsx(
                        'mt-3 w-full rounded-2xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none backdrop-blur-xl placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-200/40 focus:border-indigo-200/70'
                      )}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button onClick={runPostCallAnalysis} disabled={postBusy} className={clsx(btnPrimary, 'px-4 py-3')}>
                    {postBusy ? (
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    ) : (
                      <SparklesIcon className="h-5 w-5" />
                    )}
                    Analyse erstellen
                  </button>

                  {postAI?.newSuggestion?.script ? (
                    <button onClick={saveLearningFromPost} className={clsx(btn, 'px-4 py-3')}>
                      <CheckCircleIcon className="h-5 w-5" />
                      Learning speichern
                    </button>
                  ) : null}
                </div>

                {postErr ? (
                  <div className="mt-4 rounded-2xl border border-rose-200/70 bg-rose-50/80 p-4 text-sm text-rose-900">
                    {postErr}
                  </div>
                ) : null}

                {postAI ? (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className={clsx(glassInner, 'p-4')}>
                      <p className={label}>KI Summary</p>
                      <p className="mt-3 text-sm text-slate-800 leading-relaxed">{postAI.summary}</p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className={chip}>
                          Einwand:{' '}
                          <span className="font-semibold text-slate-900">
                            {postAI.classification?.objectionLabel || '—'}
                          </span>
                        </span>
                        <span className={chip}>
                          Focus:{' '}
                          <span className="font-semibold text-slate-900">
                            {improveIntro ? 'Intro' : 'Allgemein'}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className={clsx(glassInner, 'p-4')}>
                      <p className={label}>Verbesserungsvorschlag</p>
                      {postAI.newSuggestion?.script ? (
                        <>
                          <p className="mt-3 text-base font-semibold text-slate-900 leading-relaxed">
                            {postAI.newSuggestion.script}
                          </p>
                          {postAI.newSuggestion.usageHint ? (
                            <p className="mt-3 text-[11px] text-slate-600">
                              Hint: {postAI.newSuggestion.usageHint}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <p className="mt-3 text-sm text-slate-700">
                          Kein neuer Vorschlag (bei Erfolg wird ggf. nichts generiert).
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}

                <p className="mt-4 text-[11px] text-slate-600">
                  Hinweis: Gesprächsinhalt wird nur lokal angezeigt. In die DB gehen nur Learnings ohne personenbezogene Daten.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

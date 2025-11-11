'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SignupModal from '../components/SignupModal'

/* -------------------------------- Theme -------------------------------- */
const PRIMARY = '#0a1b40'

/* -------------------------------- Types -------------------------------- */
type FormState = {
  freeText: string
  city: string
  zip: string
  urgency: 'niedrig' | 'normal' | 'hoch'
}

type ExecutionMode = 'vorOrt' | 'digital'

type RecBudget = { kind: 'budget'; budget_min: number | null; budget_max: number | null; assumptions?: string[] }
type RecAdvice = { kind: 'advice'; title: string; bullets: string[]; extras?: Record<string, string> }
type RecAnalysis = { kind: 'analysis'; title: string; sections: { heading: string; items: string[] }[] }
type RecBedarf = { kind: 'bedarf'; title?: string; bullets: string[] }
type RecMedical = {
  kind: 'medical'
  title: string
  bullets: string[]
  specialty?: string
  urgency?: 'sofort' | 'zeitnah' | 'termin'
  red_flags?: string[]
  disclaimer?: string
}

type SmartRecommendation = RecBudget | RecAdvice | RecAnalysis | RecBedarf | RecMedical

type AiLead = {
  summary: string
  requestText: string
  parts?: { intro: string; bullets: string[] }
  fields: {
    branch: string
    category: string
    city: string
    zip: string
    budget_min?: number | null
    budget_max?: number | null
    urgency?: string
    execution?: ExecutionMode
    extras?: Record<string, string>
  }
  recommendations?: SmartRecommendation[]
}

/* ------------------------------- UI helpers ------------------------------ */
const inputCls =
  'W-full rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400/40'.replace('W-','w-')
const textareaCls = `${inputCls} min-h-[140px]`
const actionBtn =
  'inline-flex items-center gap-2 rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl px-4 py-2.5 text-slate-900 shadow-sm hover:shadow transition focus:outline-none focus:ring-2 focus:ring-sky-400/40'
const card =
  'rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl p-6 shadow-[0_10px_34px_rgba(2,6,23,0.07)] ring-1 ring-white/60'

const Icon = {
  Robot: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 7V4h6v3" />
      <rect x="4" y="7" width="16" height="13" rx="2" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <path d="M8 16h8" />
    </svg>
  ),
  Copy: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15V5a2 2 0 012-2h10" />
    </svg>
  ),
  Edit: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  ),
  Save: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 01-2-2V7l4-4h9l4 4v12a2 2 0 01-2 2z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v4" />
    </svg>
  ),
  Sparkle: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" />
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l7 4v5c0 5-3.5 9-7 9s-7-4-7-9V7l7-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  Handshake: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M8 11l4 4 4-4" />
      <path d="M3 8l5-3 4 3 4-3 5 3v6l-5 3-4-3-4 3-5-3z" />
    </svg>
  ),
  Alert: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.29 3.86l-8 14A2 2 0 004 21h16a2 2 0 001.71-3.14l-8-14a2 2 0 00-3.42 0z" />
    </svg>
  ),
}

/* ------------------------------- utilities ------------------------------- */
function oneLine(s: string) {
  return s.replace(/\s+/g, ' ').trim()
}
function toEuro(v?: number | null) {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return `${Math.round(v).toLocaleString('de-DE')} €`
  return '—'
}
function parseEuroInput(v: string): number | undefined {
  const n = v.replace(/\./g, '').replace(/,/, '.').replace(/[^\d.]/g, '')
  const num = Number(n)
  return Number.isFinite(num) && num > 0 ? Math.round(num) : undefined
}

/* -------------- Formatierter Renderer für den Anfrage-Text --------------- */
function RequestRenderer({ text }: { text: string }) {
  const lines = (text || '').split('\n')
  const idxIntro = lines.findIndex((l) => /^ *anfrage\s*–\s*einleitung/i.test(l))
  const idxScope = lines.findIndex((l) => /^ *leistungsumfang\s*–\s*stichpunkte/i.test(l))
  if (idxIntro === -1 || idxScope === -1) {
    return (
      <div className="leading-relaxed">
        <h3 className="font-semibold text-slate-900">Anfrage</h3>
        <p className="mt-1 text-[15px]">{text}</p>
      </div>
    )
  }
  const intro = lines.slice(idxIntro + 1, idxScope).join('\n').trim()
  const bullets = lines
    .slice(idxScope + 1)
    .map((l) => l.replace(/^-\s*/, ''))
    .filter((l) => l.trim().length > 0)

  return (
    <div className="leading-relaxed">
      <h3 className="font-semibold text-slate-900">Anfrage – Einleitung</h3>
      <p className="mt-1 text-[15px]">{intro}</p>
      <h4 className="mt-4 font-semibold text-slate-900">Leistungsumfang – Stichpunkte</h4>
      <ul className="mt-1 list-disc pl-5 text-[15px] space-y-1">
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </div>
  )
}

/* ------------------------------ loader phases ----------------------------- */
type AiPhase = 0 | 1 | 2
function useAiPhases(active: boolean) {
  const [phase, setPhase] = useState<AiPhase>(0)
  useEffect(() => {
    if (!active) {
      setPhase(0)
      return
    }
    const t1 = setTimeout(() => setPhase(1), 350 + Math.random() * 250)
    const t2 = setTimeout(() => setPhase(2), 900 + Math.random() * 400)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [active])
  return phase
}

/* --------------------------------- Ticker --------------------------------- */
const LIVE_TICKER_POOL = [
  'Parkett schleifen & ölen – 65 m² (München)',
  'Fensterreinigung Gewerbe 4 Etagen (Berlin)',
  'Badezimmer komplett sanieren 6 m² (Köln)',
  'Shopify Mini-Shop (10 Produkte) (Leipzig)',
  'Flachdachwartung inkl. Gutachten (Dortmund)',
  'Google Ads Setup für Dienstleister (Stuttgart)',
  'Malerarbeiten Wohnung 85 m² (Düsseldorf)',
  'Entrümpelung Keller 20 m² (Hannover)',
  'Security Audit WordPress (Backup & Hardening)',
  'Social Media: 8 Posts/Monat (Frankfurt)',
  'E-Ladestation Wallbox 11 kW inkl. Anmeldung (Bonn)',
  'Fliesen 12 m², Format 60×60, Küche (Mainz)',
  'Umzugsservice 3-Zimmer inkl. Kartons (Bremen)',
]
function useLiveTicker(list: string[], intervalMs = 4200) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % list.length), intervalMs + Math.round(Math.random() * 600))
    return () => clearInterval(id)
  }, [list, intervalMs])
  return list[idx]
}

/* --------------------- Disclaimer / Non-Direct-Pay --------------------- */
const DISCLAIMER_MAP: Record<string, string> = {
  'Immobilienmakler':
    'Für Maklerleistungen wird typischerweise eine Provision/Courtage erst bei erfolgreichem Verkauf oder Vermietung fällig. Die Höhe richtet sich nach dem Vertrag.',
  'Makler/Verkauf':
    'Courtage/Provision fällt in der Regel erst beim erfolgreichen Abschluss an. Prüfe die Provisionsregelung im Exposé/Vertrag.',
  'Personalvermittlung/Headhunter':
    'Das Honorar entsteht üblicherweise erst bei Einstellung. Modelle (Fixum/Erfolgsanteil) werden vertraglich geregelt.',
  'Inkasso & Forderungsmanagement':
    'Vergütung häufig als Erfolgsquote/Pauschale – Zahlungen bei erfolgreicher Realisierung. Beachte Gebührenstaffeln.',
  'Prozesskosten-/Anspruchsfinanzierung':
    'Kostenübernahme durch Finanzierer; bei Erfolg Beteiligung an der erstrittenen Summe. Details im Finanzierungsvertrag.',
  'Kreditberatung':
    'Für Kredit-/Finanzierungsberatung fällt i. d. R. kein direktes Honorar an. Die Kosten, die du zahlst, befinden sich im effektiven Zinssatz. Die genauen Kosten lassen sich dem Vertrag entnehmen.',
  'Kredit-/Versicherungsvermittlung':
    'Courtage/Provision wird bei Abschluss gezahlt – meist vom Anbieter. Die Kosten, die du zahlst, befinden sich im effektiven Zinssatz bzw. Produktpreis; Details im Vertrag.',
  'Versicherungsberatung':
    'Vergütung erfolgt häufig über Courtagen. Etwaige Eigenanteile/Kosten ergeben sich aus dem Versicherungstarif.',
  'Strom-/Gas-/Telekom-Wechselservices':
    'Vergütung erfolgt durch den Anbieter bei Vertragsabschluss. Für dich entsteht zunächst kein direkter Betrag.',
  'Vergleichsportale':
    'Vergütung durch Anbieter (Provision/Courtage). Für dich ist die Nutzung in der Regel kostenlos.',
  'Vermittlungs-/Plattform-Gebührenfrei':
    'Für dich als Nutzer:in entstehen keine Plattformgebühren; die Anbieter vergüten die Vermittlung.',
}

const NON_DIRECT_PAY_CATEGORIES = new Set<string>([
  'Immobilienmakler',
  'Makler/Verkauf',
  'Personalvermittlung/Headhunter',
  'Inkasso & Forderungsmanagement',
  'Prozesskosten-/Anspruchsfinanzierung',
  'Kreditberatung',
  'Baufinanzierung',
  'Finanzierungsvermittlung',
  'Kredit-/Versicherungsvermittlung',
  'Versicherungsberatung',
  'Strom-/Gas-/Telekom-Wechselservices',
  'Vergleichsportale',
  'Vermittlungs-/Plattform-Gebührenfrei',
])

function getDisclaimerForCategory(category: string): string | null {
  if (DISCLAIMER_MAP[category]) return DISCLAIMER_MAP[category]
  if (/baufinanz|kredit|finanzier/i.test(category)) return DISCLAIMER_MAP['Kreditberatung']
  if (/versicherung/i.test(category)) return DISCLAIMER_MAP['Kredit-/Versicherungsvermittlung']
  if (/makler/i.test(category)) return DISCLAIMER_MAP['Immobilienmakler']
  if (/strom|gas|telekom|dsl/i.test(category)) return DISCLAIMER_MAP['Strom-/Gas-/Telekom-Wechselservices']
  if (/vergleich|portal/i.test(category)) return DISCLAIMER_MAP['Vergleichsportale']
  return null
}

/* -------------------------------- Component ------------------------------- */
export default function MarktPage() {
  const animations = `
@keyframes floatSlow {0%{transform:translate3d(0,0,0) scale(1);opacity:.55}50%{transform:translate3d(12px,10px,0) scale(1.02);opacity:.65}100%{transform:translate3d(0,0,0) scale(1);opacity:.55}}
@keyframes floatSlow2{0%{transform:translate3d(0,0,0) scale(1);opacity:.45}50%{transform:translate3d(-14px,8px,0) scale(1.03);opacity:.6}100%{transform:translate3d(0,0,0) scale(1);opacity:.45}}
@keyframes dots{0%{content:"."}33%{content:".."}66%{content:"..."}100%{content:"."}}
.ai-dots::after{content:".";animation:dots 1.2s steps(3,end) infinite;}
.shimmer{position:relative;overflow:hidden;}
.shimmer::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.6),transparent);animation:shimmer 1.4s infinite;}
@keyframes shimmer{100%{transform:translateX(100%)}}
@keyframes grow{to{width:100%}}
.slide-in{animation:slidein .35s ease both}
@keyframes slidein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
`

  /* form state */
  const [form, setForm] = useState<FormState>({ freeText: '', city: '', zip: '', urgency: 'normal' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AiLead | null>(null)
  const router = useRouter()

  // Editiermodus Anfrage-Text
  const [isEditing, setIsEditing] = useState(false)
  const [draftText, setDraftText] = useState('')

  // Toast
  const [toast, setToast] = useState<string>('')

  // Budget-Interaktion (grüne Box)
  const [budgetMode, setBudgetMode] = useState<'none' | 'empfehlung' | 'custom'>('none')
  const [customMin, setCustomMin] = useState<string>('')
  const [customMax, setCustomMax] = useState<string>('')

  // Budget-Editor (Strukturierte Felder)
  const [showBudgetEditor, setShowBudgetEditor] = useState(false)
  const [editBudgetMin, setEditBudgetMin] = useState<string>('')
  const [editBudgetMax, setEditBudgetMax] = useState<string>('')

  // SIGNUP-MODAL (für „Anonym posten“)
  const [showSignup, setShowSignup] = useState(false)

  const disabled = useMemo(() => form.freeText.trim().length < 10, [form.freeText])
  const aiPhase = useAiPhases(loading)

  const liveLine = useLiveTicker(LIVE_TICKER_POOL, 4300)
  const [liveBadge, setLiveBadge] = useState<string>('Neu')
  useEffect(() => {
    const variants = ['Neu', 'Beliebt', 'Eilig', 'Fixpreis', 'Geprüft']
    setLiveBadge(variants[Math.floor(Math.random() * variants.length)])
  }, [liveLine])

  // clientseitiger Fallback-Formatter (falls API mal nicht antwortet)
  function buildClientRequestText(parts: { intro: string; bullets: string[] }) {
    const b = Array.isArray(parts.bullets) ? parts.bullets : []
    const bullets = b.length >= 3 ? b.slice(0, 3) : [...b, ...Array(3 - b.length).fill('')].slice(0, 3)
    return `Anfrage – Einleitung
${oneLine(parts.intro)}

Leistungsumfang – Stichpunkte
- ${bullets.map(oneLine).filter(Boolean).join('\n- ')}`
  }

  async function onGenerate() {
    setLoading(true)
    setResult(null)
    setIsEditing(false)
    setDraftText('')
    setBudgetMode('none')
    setCustomMin('')
    setCustomMax('')
    setShowBudgetEditor(false)

    try {
      const res = await fetch('/api/ai/lead-normalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('endpoint not ready')
      const data = (await res.json()) as AiLead

      const safeRequestText =
        data.requestText && data.requestText.trim().length >= 20
          ? data.requestText
          : data.parts
          ? buildClientRequestText(data.parts)
          : buildClientRequestText({
              intro:
                'Ich übermittle eine strukturierte Anfrage mit klarer Zielsetzung, gewünschter Ausführung und erwarteten Ergebnissen.',
              bullets: [
                `Leistungsumfang (kurz): ${oneLine(form.freeText)}`,
                'Qualitäts-/Rahmenbedingungen: fachgerecht, nachvollziehbar dokumentiert, klare Kommunikation.',
                'Koordination: transparente Abstimmung, Meilensteine, verbindliche Übergaben.',
              ],
            })

      setTimeout(() => {
        setResult({ ...data, requestText: safeRequestText })
        setDraftText(safeRequestText)
        setLoading(false)
      }, 520 + Math.random() * 260)
    } catch {
      const parts = {
        intro:
          'Ich übermittle eine strukturierte Anfrage mit klarer Zielsetzung, gewünschter Ausführung und erwarteten Ergebnissen. Bitte prüfen Sie den Leistungsumfang und geben Sie eine belastbare Einschätzung.',
        bullets: [
          `Leistungsumfang (kurz): ${oneLine(form.freeText)}`,
          'Qualitäts-/Rahmenbedingungen: fachgerecht, nachvollziehbar dokumentiert, klare Kommunikation.',
          'Koordination: transparente Abstimmung, Meilensteine, verbindliche Übergaben.',
        ],
      }
      const reqText = buildClientRequestText(parts)

      const fallback: AiLead = {
        summary: 'Anfrage',
        requestText: reqText,
        parts,
        fields: {
          branch: 'Allgemein',
          category: 'Sonstiges',
          city: form.city,
          zip: form.zip,
          urgency: form.urgency,
          execution: 'digital',
          budget_min: null,
          budget_max: null,
          extras: {},
        },
        recommendations: [
          {
            kind: 'analysis',
            title: 'Analyse & wichtige Punkte',
            sections: [
              { heading: 'Potenzielle zukünftige offene Punkte', items: ['Umfang konkretisieren', 'Unterlagen/Fotos bereitstellen', 'Zeitrahmen grob benennen'] },
              { heading: 'Risiken/Abhängigkeiten', items: ['Schnittstellen/Termine', 'Vorleistungen/Genehmigungen', 'Zusatzaufwände'] },
              { heading: 'Annahmen', items: ['Standardqualität', 'Normale Komplexität', 'Regionales Preisniveau'] },
            ],
          },
        ],
      }
      setTimeout(() => {
        setResult(fallback)
        setDraftText(reqText)
        setLoading(false)
      }, 600 + Math.random() * 300)
    }
  }

  // Empfehlungen auswerten
  const recs: SmartRecommendation[] = Array.isArray(result?.recommendations) ? (result!.recommendations as SmartRecommendation[]) : []
  const analysisRecs = recs.filter((r): r is RecAnalysis => r.kind === 'analysis')
  const budgetRec = recs.find((r): r is RecBudget => r.kind === 'budget' && (r.budget_min ?? 0) > 0 && (r.budget_max ?? 0) > 0)
  const bedarfRec = recs.find((r): r is RecBedarf => r.kind === 'bedarf')
  const adviceRecs = recs.filter((r): r is RecAdvice => r.kind === 'advice').filter((r) => !/nächste schritte/i.test(r.title || ''))
  const medicalRec = recs.find((r): r is RecMedical => r.kind === 'medical')

  // Budget -> Felder spiegeln (nur wenn vorhanden)
  useEffect(() => {
    if (!result || !budgetRec) return
    setBudgetMode((m) => (m === 'none' ? 'empfehlung' : m))
    setResult((prev) =>
      prev
        ? { ...prev, fields: { ...prev.fields, budget_min: budgetRec.budget_min ?? null, budget_max: budgetRec.budget_max ?? null } }
        : prev
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!budgetRec])

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setToast('Text kopiert ✅')
      setTimeout(() => setToast(''), 1800)
    }).catch(() => {})
  }
  function saveEditedText() {
    setResult((prev) => (prev ? { ...prev, requestText: draftText, parts: undefined } : prev))
    setIsEditing(false)
  }

  // Disclaimer/Greenbox
  const category = (result?.fields.category || '').trim()
  const disclaimerText = useMemo(() => (category ? getDisclaimerForCategory(category) : null), [category])
  const showDisclaimer = !!disclaimerText
  const showBudget = !!budgetRec && !showDisclaimer
  const showGreenBox = showBudget || showDisclaimer

  return (
    <>
      {/* HERO */}
      <section className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-28vh] -z-10 h-[130vh] w-[180vw] -translate-x-1/2"
          style={{
            background:
              'radial-gradient(1200px 480px at 50% 0%, rgba(10,27,64,0.06), transparent),radial-gradient(900px 420px at 12% 10%, rgba(10,27,64,0.05), transparent),radial-gradient(900px 420px at 88% 8%, rgba(10,27,64,0.05), transparent)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-[-10vw] top-[-2vh] -z-10 h-[38rem] w-[38rem] rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgba(10,27,64,.18), rgba(10,27,64,0))', filter: 'blur(24px)', animation: 'floatSlow 11s ease-in-out infinite' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-[-8vw] top-[4vh] -z-10 h-[42rem] w-[42rem] rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgba(10,27,64,.14), rgba(10,27,64,0))', filter: 'blur(28px)', animation: 'floatSlow2 13s ease-in-out infinite' }}
        />
        <div className="relative mx-auto max-w-6xl px-6 pt-10 pb-10 sm:pt-14 sm:pb-14">
          <div className="rounded-3xl border border-white/60 bg-white/70 p-6 text-center shadow-[0_20px_50px_rgba(2,6,23,0.06),0_2px_10px_rgba(2,6,23,0.04)] backdrop-blur-xl ring-1 ring-white/60 sm:p-10">
            <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold text-slate-900 ring-1 ring-white/60 backdrop-blur">
              <span className="rounded-full px-2 py-0.5 text-white" style={{ backgroundColor: PRIMARY }}>Kostenlose Anfrage</span>
              <span>Versicherung inklusive</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">In 2 Minuten zur passenden Anfrage – kostenlos & versichert</h1>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-slate-700">
              Beschreibe dein Anliegen. Wir strukturieren automatisch Branche, Kategorie, Ausführung – inkl. KI-Einschätzung für spezielle Themen und Budget-Tipps.
            </p>
          </div>
        </div>
      </section>

      {/* BODY */}
      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 lg:grid-cols-2">
        {/* Formular (links) */}
        <div className={card}>
          <div className="text-lg font-medium text-slate-900 mb-4">Beschreibe dein Anliegen</div>

          <label className="block text-sm text-slate-600 mb-1">Was brauchst du?</label>
          <textarea
            className={textareaCls}
            placeholder="z. B. seit 3 Tagen starke Knieschmerzen beim Treppensteigen; Suche nach Orthopädie-Termin in Köln."
            value={form.freeText}
            onChange={(e) => setForm({ ...form, freeText: e.target.value })}
          />

          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Ort / Stadt</label>
              <input className={inputCls} placeholder="z. B. Köln" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">PLZ</label>
              <input className={inputCls} placeholder="z. B. 50933" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-sm text-slate-600 mb-1">Dringlichkeit</label>
            <div className="flex gap-2">
              {(['niedrig', 'normal', 'hoch'] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setForm({ ...form, urgency: u })}
                  className={`px-3 py-2 rounded-xl border transition ${form.urgency === u ? 'bg-slate-900 text-white border-slate-900' : 'bg-white/80 border-white/60 hover:bg-white'}`}
                  aria-pressed={form.urgency === u}
                  type="button"
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* KI-Aktion */}
          <div className="mt-5 flex items-center gap-3">
            <button disabled={disabled || loading} onClick={onGenerate} className={`${actionBtn} ${disabled || loading ? 'opacity-60 cursor-not-allowed' : ''}`} title="KI erzeugt eine vollständige, strukturierte Anfrage">
              <Icon.Robot /> KI Anfrage erzeugen
            </button>
            <span className="text-xs text-slate-500">Kostenlos • Versicherung inklusive</span>
          </div>

          {/* Live-Ticker */}
          <div className="mt-6 border-t border-white/60 pt-4">
            <div className="rounded-2xl border border-white/60 bg-white/80 px-3 py-2 flex items-center justify-between slide-in">
              <div className="text-xs font-semibold rounded-full px-2 py-0.5 bg-white/80 border border-white/60">{liveBadge}</div>
              <div className="text-sm truncate px-3">{liveLine}</div>
              <div className="text-[11px] text-slate-500">Live</div>
            </div>
          </div>

          {/* Lila Analyse-Box (DYNAMISCH) */}
          {result && analysisRecs.length > 0 && (
            <div className="mt-6 space-y-4">
              {analysisRecs.map((rec, i) => (
                <div key={`analysis-left-${i}`} className="rounded-2xl border border-indigo-500/30 bg-indigo-50/80 p-4 ring-1 ring-indigo-500/20">
                  <div className="text-sm font-semibold text-indigo-900">{rec.title || 'Analyse & wichtige Punkte'}</div>
                  {rec.sections?.slice(0, 3).map((sec, si) => (
                    <div key={si} className="mt-2">
                      <div className="text-xs font-semibold text-indigo-900/90">{sec.heading || 'Aspekte'}</div>
                      <ul className="mt-1 list-disc pl-5 text-sm space-y-1">
                        {(sec.items || []).slice(0, 6).map((it, ii) => (<li key={ii}>{it}</li>))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ergebnis (rechts) */}
        <div className={card}>
          <div className="text-lg font-medium text-slate-900 mb-4">Ergebnis</div>

          {!loading && !result && (
            <div className="text-slate-500 text-sm">
              Fülle links dein Anliegen aus und klicke <span className="font-medium">„KI Anfrage erzeugen“</span>. Danach siehst du den formatierten Anfrage-Text, ggf. medizinische Einschätzung, Budget oder einen passenden Hinweis (Disclaimer).
            </div>
          )}

          {loading && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-transparent animate-spin" />
                  <div className="text-slate-800">{aiPhase < 1 ? 'Analysiere Eingaben' : aiPhase < 2 ? 'Normalisiere Felder' : 'Formuliere Nachricht'}<span className="ai-dots" /></div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-200/70 overflow-hidden"><div className="h-full w-0 animate-[grow_1s_linear_forwards] bg-slate-900/80" /></div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2"><div className="h-12 rounded-xl bg-white/70 shimmer" /><div className="h-12 rounded-xl bg-white/70 shimmer" /></div>
              </div>
              <div className="h-24 rounded-2xl bg-white/70 shimmer" />
            </div>
          )}

          {result && !loading && (
            <div className="space-y-5 relative">
              {/* Ausformulierter Text */}
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-slate-800 inline-flex items-center gap-2">
                    <Icon.Sparkle /> Ausformulierter Anfrage-Text
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      className="text-xs inline-flex items-center gap-1 underline hover:no-underline hover:opacity-90 cursor-pointer"
                      title="Text in die Zwischenablage kopieren"
                      onClick={() => copy(isEditing ? draftText : (result?.requestText ?? ''))}
                      type="button"
                    >
                      <Icon.Copy /> Kopieren
                    </button>
                    {!isEditing ? (
                      <button
                        className="text-xs inline-flex items-center gap-1 underline hover:no-underline hover:opacity-90 cursor-pointer"
                        title="Text bearbeiten"
                        onClick={() => { setDraftText(result?.requestText ?? ''); setIsEditing(true) }}
                        type="button"
                      >
                        <Icon.Edit /> Bearbeiten
                      </button>
                    ) : (
                      <button
                        className="text-xs inline-flex items-center gap-1 underline hover:no-underline hover:opacity-90 cursor-pointer"
                        title="Bearbeitung speichern"
                        onClick={saveEditedText}
                        type="button"
                      >
                        <Icon.Save /> Speichern
                      </button>
                    )}
                  </div>
                </div>

                {!isEditing ? (
                  <div className="mt-2 text-[15px] leading-relaxed">
                    <RequestRenderer text={result.requestText} />
                  </div>
                ) : (
                  <textarea className={`${textareaCls} mt-3`} value={draftText} onChange={(e) => setDraftText(e.target.value)} />
                )}
              </div>

              {/* Toast */}
              {toast && (
                <div className="absolute right-3 -top-3 translate-y-[-100%] rounded-xl bg-emerald-600 text-white text-xs px-3 py-2 shadow">
                  {toast}
                </div>
              )}

              {/* GELBE MEDIZIN-BOX */}
              {medicalRec && (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-50/90 p-4 ring-1 ring-amber-500/30">
                  <div className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                    <Icon.Alert /> {medicalRec.title || 'Vorläufige Einschätzung'}
                  </div>
                  {medicalRec.specialty && (
                    <p className="mt-1 text-xs text-amber-900/90"><strong>Empfohlene Fachrichtung:</strong> {medicalRec.specialty}</p>
                  )}
                  {medicalRec.urgency && (
                    <p className="text-xs text-amber-900/90"><strong>Dringlichkeit:</strong> {medicalRec.urgency === 'sofort' ? 'sofortige Abklärung' : medicalRec.urgency === 'zeitnah' ? 'zeitnah (in den nächsten Tagen)' : 'Termin vereinbaren'}</p>
                  )}
                  <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
                    {medicalRec.bullets.map((b, idx) => (<li key={idx}>{b}</li>))}
                  </ul>
                  {medicalRec.red_flags && medicalRec.red_flags.length > 0 && (
                    <div className="mt-2 rounded-md bg-white/80 border border-amber-400/50 p-2">
                      <div className="text-xs font-semibold text-amber-900">Warnzeichen</div>
                      <ul className="mt-1 list-disc pl-5 text-xs space-y-0.5">
                        {medicalRec.red_flags.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-amber-900/80">
                    {medicalRec.disclaimer || 'Hinweis: Dies ist keine ärztliche Diagnose, sondern eine vorläufige Einschätzung. Wende dich bei Unsicherheit oder Verschlechterung bitte an medizinisches Fachpersonal.'}
                  </p>
                </div>
              )}

              {/* Nächste Schritte */}
              <div className="rounded-2xl border border-sky-500/30 bg-sky-50/80 p-4 ring-1 ring-sky-500/20">
                <div className="text-sm font-semibold text-sky-900 flex items-center gap-2"><Icon.Handshake /> Nächste Schritte</div>
                <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
                  <li>Anonym Partner aus der Kategorie auswählen &amp; kontaktieren (via Chat).</li>
                  <li>Optional Termin vereinbaren (vor Ort, Telefon oder Videochat).</li>
                  <li>Vereinbarung treffen &amp; digital unterzeichnen.</li>
                </ul>
                <div className="mt-3 text-xs text-sky-900/80 flex items-start gap-2">
                  <span className="mt-[2px]"><Icon.Shield /></span>
                  <span><strong>Versichert:</strong> Alle Aufträge über unsere Plattform sind abgesichert. Bei Streitfällen unterstützen wir neutral.</span>
                </div>
              </div>

              {/* GRÜNE BOX: Budget ODER Disclaimer */}
              {showGreenBox && (
                showDisclaimer ? (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/70 p-4 ring-1 ring-emerald-500/20">
                    <div className="text-sm font-semibold text-emerald-900">Hinweis zur Vergütung ({category || 'Kategorie'})</div>
                    <p className="mt-2 text-sm">{disclaimerText}</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/70 p-4 ring-1 ring-emerald-500/20">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-sm font-semibold text-emerald-900">Budget – Schätzung</div>
                      <div className="text-xs text-emerald-900/80">
                        Spanne: {toEuro(result?.fields.budget_min ?? budgetRec?.budget_min ?? null)} – {toEuro(result?.fields.budget_max ?? budgetRec?.budget_max ?? null)}
                      </div>
                    </div>
                    {(budgetRec?.assumptions?.length ?? 0) > 0 && (
                      <ul className="mt-2 list-disc pl-5 text-sm">
                        {budgetRec!.assumptions!.map((a, idx) => (<li key={idx}>{a}</li>))}
                      </ul>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => {
                        if (!budgetRec) return
                        setBudgetMode('empfehlung')
                        setResult((prev) => (prev ? { ...prev, fields: { ...prev.fields, budget_min: budgetRec.budget_min ?? null, budget_max: budgetRec.budget_max ?? null } } : prev))
                      }} className="inline-flex items-center gap-2 rounded-xl border border-emerald-600/40 bg-white/80 px-3 py-1.5 text-sm font-medium text-emerald-900 hover:shadow">Übernehmen</button>
                      <button type="button" onClick={() => {
                        setBudgetMode('custom')
                        setCustomMin('')
                        setCustomMax('')
                        setResult((prev) => (prev ? { ...prev, fields: { ...prev.fields, budget_min: null, budget_max: null } } : prev))
                      }} className="inline-flex items-center gap-2 rounded-xl border border-emerald-600/40 bg-white/80 px-3 py-1.5 text-sm font-medium text-emerald-900 hover:shadow">Nicht übernehmen</button>
                    </div>
                    {budgetMode === 'custom' && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Eigenes Budget (min)</label>
                          <input className={inputCls} placeholder="z. B. 1.200" value={customMin} onChange={(e) => setCustomMin(e.target.value)} onBlur={() => {
                            const min = parseEuroInput(customMin)
                            const max = parseEuroInput(customMax)
                            let cmin: number | null = typeof min === 'number' ? min : null
                            let cmax: number | null = typeof max === 'number' ? max : null
                            if (cmin && cmax && cmin > cmax) [cmin, cmax] = [cmax, cmin]
                            setResult((prev) => (prev ? { ...prev, fields: { ...prev.fields, budget_min: cmin, budget_max: cmax } } : prev))
                          }} />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Eigenes Budget (max)</label>
                          <input className={inputCls} placeholder="z. B. 3.000" value={customMax} onChange={(e) => setCustomMax(e.target.value)} onBlur={() => {
                            const min = parseEuroInput(customMin)
                            const max = parseEuroInput(customMax)
                            let cmin: number | null = typeof min === 'number' ? min : null
                            let cmax: number | null = typeof max === 'number' ? max : null
                            if (cmin && cmax && cmin > cmax) [cmin, cmax] = [cmax, cmin]
                            setResult((prev) => (prev ? { ...prev, fields: { ...prev.fields, budget_min: cmin, budget_max: cmax } } : prev))
                          }} />
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}

              {/* Bedarf-Box */}
              {bedarfRec && (
                <div className="rounded-2xl border border-teal-500/30 bg-teal-50/80 p-4 ring-1 ring-teal-500/20">
                  <div className="text-sm font-semibold text-teal-900">{bedarfRec.title || 'Bedarf – Einordnung'}</div>
                  <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
                    {bedarfRec.bullets.map((b, idx) => (<li key={idx}>{b}</li>))}
                  </ul>
                </div>
              )}

              {/* Sonstige Ratschläge */}
              {adviceRecs.map((rec, i) => (
                <div key={`advice-${i}`} className="rounded-2xl border border-sky-500/30 bg-sky-50/80 p-4 ring-1 ring-sky-500/20">
                  <div className="text-sm font-semibold text-sky-900">{rec.title}</div>
                  <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
                    {rec.bullets.map((b, idx) => (<li key={idx}>{b}</li>))}
                  </ul>
                </div>
              ))}

              {/* Strukturierte Felder + Aktionen */}
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-slate-800">Strukturierte Felder</div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!result) return
                      const currentMin = result.fields.budget_min ?? budgetRec?.budget_min ?? null
                      const currentMax = result.fields.budget_max ?? budgetRec?.budget_max ?? null
                      setEditBudgetMin(currentMin ? String(currentMin) : '')
                      setEditBudgetMax(currentMax ? String(currentMax) : '')
                      setShowBudgetEditor(true)
                    }}
                    className="inline-flex items-center gap-1 text-xs underline hover:no-underline hover:opacity-90 cursor-pointer"
                    title="Budget manuell setzen"
                  >
                    <Icon.Edit /> Budget bearbeiten
                  </button>
                </div>

                {/* Budget-Editor */}
                {showBudgetEditor && (
                  <div className="mb-3 rounded-xl border border-emerald-600/30 bg-emerald-50/60 p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Budget min</label>
                        <input
                          className={inputCls}
                          placeholder="z. B. 1.200"
                          value={editBudgetMin}
                          onChange={(e) => setEditBudgetMin(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Budget max</label>
                        <input
                          className={inputCls}
                          placeholder="z. B. 3.000"
                          value={editBudgetMax}
                          onChange={(e) => setEditBudgetMax(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const min = parseEuroInput(editBudgetMin)
                          const max = parseEuroInput(editBudgetMax)
                          let cmin: number | null = typeof min === 'number' ? min : null
                          let cmax: number | null = typeof max === 'number' ? max : null
                          if (cmin && cmax && cmin > cmax) [cmin, cmax] = [cmax, cmin]
                          setResult((prev) => (prev ? { ...prev, fields: { ...prev.fields, budget_min: cmin, budget_max: cmax } } : prev))
                          setShowBudgetEditor(false)
                          setToast('Budget aktualisiert ✅')
                          setTimeout(() => setToast(''), 1800)
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-600/40 bg-white/80 px-3 py-1.5 text-sm font-medium text-emerald-900 hover:shadow"
                        title="Budget übernehmen"
                      >
                        <Icon.Save /> Speichern
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowBudgetEditor(false)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-800 hover:shadow"
                        title="Abbrechen"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  <Field label="Branche" value={result.fields.branch} />
                  <Field label="Kategorie" value={result.fields.category} />
                  <Field label="Ort" value={result.fields.city || '—'} />
                  <Field label="PLZ" value={result.fields.zip || '—'} />
                  <Field label="Ausführung" value={result.fields.execution === 'vorOrt' ? 'Vor Ort' : 'Digital'} />
                  <Field label="Dringlichkeit" value={result.fields.urgency || '—'} />
                  <Field label="Budget min" value={toEuro(result.fields.budget_min ?? null)} />
                  <Field label="Budget max" value={toEuro(result.fields.budget_max ?? null)} />
                  {result.fields.extras && Object.entries(result.fields.extras).map(([k, v]) => <Field key={k} label={k} value={String(v)} />)}
                </div>

                {/* Aktionen */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSignup(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-sm shadow hover:opacity-90"
                    title="Anfrage anonym posten (Konto für Zuordnung & Kommunikation erforderlich)"
                  >
                    Anonym posten
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Info-Card */}
      <section className="mx-auto max-w-6xl px-6 pt-6 pb-28">
        <div className="rounded-3xl border border-white/60 bg-white/70 p-6 backdrop-blur-xl ring-1 ring-white/60">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Einfach & sicher anfragen</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            Deine Anfrage ist <strong>kostenlos</strong>. Die Ausführung von Aufträgen über unsere Plattform ist zusätzlich <strong>versichert</strong>. Bei Konflikten vermitteln wir neutral.
          </p>
        </div>
      </section>

      {/* Modal */}
      <SignupModal open={showSignup} onClose={() => setShowSignup(false)} />

      <style dangerouslySetInnerHTML={{ __html: animations }} />
    </>
  )
}

/* ----------------------------- tiny block ----------------------------- */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  )
}

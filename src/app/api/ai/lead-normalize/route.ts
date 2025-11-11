// src/app/api/ai/lead-normalize/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'edge'

/* ----------------------------- Types ----------------------------- */
type FormState = {
  freeText: string
  city: string
  zip: string
  urgency: 'niedrig' | 'normal' | 'hoch'
}

type ExecutionMode = 'vorOrt' | 'digital'

type SmartRecommendation =
  | { kind: 'budget'; budget_min: number | null; budget_max: number | null; assumptions?: string[] }
  | { kind: 'advice'; title: string; bullets: string[]; extras?: Record<string, string> }
  | { kind: 'analysis'; title: string; sections: { heading: string; items: string[] }[] }
  | { kind: 'bedarf'; title?: string; bullets: string[] }
  | {
      kind: 'medical'
      title: string
      bullets: string[]
      specialty?: string
      urgency?: 'sofort' | 'zeitnah' | 'termin'
      red_flags?: string[]
      disclaimer?: string
    }

type AiLead = {
  summary: string
  requestText: string
  parts?: { intro: string; bullets: string[] }
  fields: {
    branch_id?: string | null   // <- NEU: DB-UUID
    branch: string              // exakter Name aus DB
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

/* ----------------------------- helpers ----------------------------- */
const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim()

function guessCategory(text: string) {
  const t = text.toLowerCase()
  // Medizin zuerst
  if (/(orthopädie|orthopaed|knie|rücken|ruecken|gelenk|bänder|sehne|arthr|menisk)/.test(t)) return 'Orthopädie'
  if (/(haut|ausschlag|ekzem|pickel|juck|dermatolog|derma)/.test(t)) return 'Dermatologie'
  if (/(herz|brustschmerz|puls|kardiolog)/.test(t)) return 'Kardiologie'
  if (/(hno|ohren|nase|hals|schwindel)/.test(t)) return 'HNO'
  if (/(frauenarzt|gynäkolog|zyklus|schwanger|unterleib)/.test(t)) return 'Gynäkologie'
  if (/(urolog|wasserlassen|prostata|harn)/.test(t)) return 'Urologie'
  if (/(kinderarzt|päd|fieber kind|husten kind)/.test(t)) return 'Pädiatrie'
  if (/(neurolog|kopfschmerz|migraen|kribbeln|lähm)/.test(t)) return 'Neurologie'
  if (/(psych|depress|angst|therapie|burnout)/.test(t)) return 'Psychotherapie'
  if (/(hausarzt|allgemeinmed|check|attest|impf)/.test(t)) return 'Hausarzt/Allgemeinmedizin'
  // Non-med
  if (/webseite|website|webdesign|shop|wordpress|webflow|joomla/.test(t)) return 'Website/Shop'
  if (/app|software|crm|tool|integration|api/.test(t)) return 'Software/App'
  if (/seo|suchmaschinenoptimierung/.test(t)) return 'SEO'
  if (/social|ads|kampagne|meta|tiktok|google|funnel/.test(t)) return 'Social/Ads'
  if (/bad|fliesen|sanier|dusche|badsanierung/.test(t)) return 'Badsanierung/Fliesen'
  if (/reinigung|fenster|grundreinigung|unterhaltsreinigung/.test(t)) return 'Gebäudereinigung'
  if (/(terrasse|holz|deck|wpc)/.test(t)) return 'Außenbau/Terrasse'
  if (/verkauf|vermiet|exposé|bewertung/.test(t)) return 'Makler/Verkauf'
  if (/unternehmensberatung|strategie|effizienz|beratung/.test(t)) return 'Unternehmensberatung'
  if (/(kredit|baufinanz|finanzierungsvermittlung|hypothek)/.test(t)) return 'Baufinanzierung'
  if (/(versicherung|versicherungsberatung)/.test(t)) return 'Versicherungsberatung'
  if (/steuer|lohnsteuer|steuerberatung/.test(t)) return 'Steuerberatung'
  if (/(anwalt|rechtsberatung|rechtsschutz)/.test(t)) return 'Rechtsberatung'
  if (/(fitnessberatung|fitness|coach|trainer|ernährung|personal training)/.test(t)) return 'Fitness-/Ernährungsberatung'
  return 'Sonstiges'
}

function guessExecution(text: string): ExecutionMode {
  const t = text.toLowerCase()
  if (/(arzt|ärzt|praxis|termin|untersuch|behandlung|röntgen|ultraschall|physio|therapie)/.test(t)) return 'vorOrt'
  if (/(web|app|software|seo|remote|online|digital|ads|kampagne|videocall|zoom|teams|funnel)/.test(t)) return 'digital'
  if (/(bau|fliesen|bad|sanier|renov|vor ort|anfahrt|besichtigung|montage|reparatur|reinigung|terrasse|holz)/.test(t)) return 'vorOrt'
  return 'vorOrt'
}

/* ---------- Budget-Heuristik: Web/Landingpage/Funnel & Marketing ---------- */
function roundToHundreds(n: number) {
  return Math.max(0, Math.round(n / 100) * 100)
}
function ensureBudgetForWebAndMarketing(params: {
  input: FormState
  branch: string
  category: string
  t: string
  recommendations: SmartRecommendation[]
}): SmartRecommendation[] {
  const { input, category, t } = params
  let recs = [...params.recommendations]

  const hasValidBudget = recs.some(
    (r) => r.kind === 'budget' && typeof r.budget_min === 'number' && r.budget_min! > 0 && typeof r.budget_max === 'number' && r.budget_max! > 0
  )

  // Non-Direct-Pay-Kategorien (keine Budgets anzeigen)
  const NON_DIRECT_PAY = new Set<string>([
    'Immobilienmakler','Makler/Verkauf','Personalvermittlung/Headhunter','Inkasso & Forderungsmanagement',
    'Prozesskosten-/Anspruchsfinanzierung','Kreditberatung','Baufinanzierung','Finanzierungsvermittlung',
    'Kredit-/Versicherungsvermittlung','Versicherungsberatung','Strom-/Gas-/Telekom-Wechselservices',
    'Vergleichsportale','Vermittlungs-/Plattform-Gebührenfrei'
  ])
  if (hasValidBudget || NON_DIRECT_PAY.has(category)) return recs

  // Web/Landingpage/One-Pager/Lead-Funnel oder Marketing
  const isWebLP =
    /one[- ]?pager|landing ?page|lead ?funnel|funnel|webdesign|website|webseite/.test(t) ||
    /(Website\/Shop|Software\/App)/i.test(category)

  const isMkt = /ads|kampagne|seo|social|content|newsletter/.test(t)

  if (isWebLP || isMkt) {
    let min = isMkt ? 500 : 900
    let max = isMkt ? 2500 : 3500

    if (isWebLP) {
      if (/tracking|analytics|pixel|gtm|ga4/.test(t)) { min += 200; max += 400 }
      if (/copy|text|texte|copywriting/.test(t)) { min += 200; max += 400 }
      if (/brand|design|style|ci|corporate/.test(t)) { min += 150; max += 300 }
      if (/mehrsprach|multi[- ]?lang|en|de/.test(t)) { min += 250; max += 500 }
    }

    if (input.urgency === 'hoch' || /(dringend|eilig|heute|morgen|sofort)/.test(t)) {
      min = Math.round(min * 1.15)
      max = Math.round(max * 1.15)
    }

    min = roundToHundreds(min)
    max = roundToHundreds(max)
    if (max > 0 && min > max) [min, max] = [max, min]

    const assumptions: string[] = isWebLP
      ? [
          'Umfang: One-Pager/Landingpage mit 2–4 Sektionen, responsiv, DSGVO-konform.',
          'Inhalte: klare CTA/Lead-Formular, Tracking (z. B. GA4/Pixel) inklusive.',
          'Technik: leichtgewichtiges CMS/Builder (z. B. Next/React/WordPress) + Basis-SEO.',
        ]
      : [
          'Monatlicher Retainer: Kampagnenbetreuung & Reporting inklusive.',
          'Setup/Assets teils einmalig; Media-Budget nicht enthalten.',
          'Laufzeit: mind. 1–3 Monate für valide Learnings und Optimierung.',
        ]

    recs.unshift({ kind: 'budget', budget_min: min, budget_max: max, assumptions })
  }

  return recs
}

function makeParts({ freeText }: { freeText: string }) {
  return {
    intro:
      'Ich übermittle eine strukturierte Anfrage mit klarer Zielsetzung, gewünschter Ausführung und erwarteten Ergebnissen. Bitte prüfen Sie den Leistungsumfang und geben Sie eine belastbare Einschätzung.',
    bullets: [
      `Leistungsumfang (kurz): ${oneLine(freeText)}`,
      'Qualitäts-/Rahmenbedingungen: fachgerecht, nachvollziehbar dokumentiert, klare Kommunikation.',
      'Koordination: transparente Abstimmung, Meilensteine, verbindliche Übergaben.',
    ],
  }
}

function buildRequestText(parts: { intro: string; bullets: string[] }) {
  const b = Array.isArray(parts.bullets) ? parts.bullets : []
  const bullets = b.length >= 3 ? b.slice(0, 3) : [...b, ...Array(3 - b.length).fill('')].slice(0, 3)
  return `Anfrage – Einleitung
${oneLine(parts.intro)}

Leistungsumfang – Stichpunkte
- ${bullets.map(oneLine).filter(Boolean).join('\n- ')}`
}

/** Non-Direct-Pay Kategorien → Disclaimer/Bedarf statt Budget */
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

/* ----------------------------- OpenAI ----------------------------- */
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!

/* ----------------------------- Branch-Loader & Validator ----------------------------- */
type DbBranch = { id: string; name: string; slug: string }

async function loadBranches(): Promise<DbBranch[]> {
  const supabase = await supabaseServer()
  const { data, error } = await supabase
    .from('partner_branches')
    .select('id,name,slug')
    .order('name', { ascending: true })
    .limit(500)
  if (error) throw new Error(error.message)
  return data || []
}

function normalizeStr(s: string) {
  return String(s || '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
}

function findNeutralFallbackBranch(branches: DbBranch[]): DbBranch | null {
  const neutralNames = ['Allgemein', 'Sonstiges', 'Diverses', 'Weitere']
  for (const n of neutralNames) {
    const m = branches.find(b => normalizeStr(b.name) === normalizeStr(n))
    if (m) return m
  }
  return branches[0] || null
}

function validateAndFixBranchFromAi(
  aiBranchId: string | null | undefined,
  aiBranchName: string | undefined,
  branches: DbBranch[]
): { branch_id: string; branch: string } {
  if (!branches.length) throw new Error('No branches available')

  const byId = new Map(branches.map(b => [b.id, b]))
  const byName = new Map(branches.map(b => [normalizeStr(b.name), b]))
  const bySlug = new Map(branches.map(b => [normalizeStr(b.slug), b]))

  // 1) Direct by id
  if (aiBranchId && byId.has(aiBranchId)) {
    const b = byId.get(aiBranchId)!
    return { branch_id: b.id, branch: b.name }
  }

  // 2) Match by exact name (case-insensitive)
  if (aiBranchName) {
    const n = normalizeStr(aiBranchName)
    if (byName.has(n)) {
      const b = byName.get(n)!
      return { branch_id: b.id, branch: b.name }
    }
    if (bySlug.has(n)) {
      const b = bySlug.get(n)!
      return { branch_id: b.id, branch: b.name }
    }
  }

  // 3) Fallback: pick neutral (Allgemein/Sonstiges/…)
  const fb = findNeutralFallbackBranch(branches)
  if (fb) return { branch_id: fb.id, branch: fb.name }

  // 4) Last resort: first
  const first = branches[0]
  return { branch_id: first.id, branch: first.name }
}

export async function POST(req: Request) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY missing' }, { status: 500 })
  }

  // 1) Input lesen
  let input: FormState
  try {
    input = (await req.json()) as FormState
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!input.freeText || input.freeText.trim().length < 10) {
    return NextResponse.json({ error: 'Bitte etwas ausführlicher beschreiben.' }, { status: 400 })
  }

  // 2) Branches aus DB laden
  let branches: DbBranch[] = []
  try {
    branches = await loadBranches()
  } catch (e: any) {
    // Wenn Laden der Branches fehlschlägt, brechen wir NICHT ab – aber erklären sauber am Ende
    branches = []
  }

  // 3) JSON-Schema (mit branch_id)
  const schema = {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      requestText: { type: 'string' },
      parts: {
        type: 'object',
        properties: {
          intro: { type: 'string' },
          bullets: { type: 'array', items: { type: 'string' } },
        },
      },
      fields: {
        type: 'object',
        properties: {
          branch_id: { type: ['string', 'null'] }, // UUID aus DB
          branch: { type: 'string' },              // EXAKTER Name aus DB
          category: { type: 'string' },
          city: { type: 'string' },
          zip: { type: 'string' },
          budget_min: { type: ['number', 'null'] },
          budget_max: { type: ['number', 'null'] },
          urgency: { type: 'string' },
          execution: { type: 'string', enum: ['vorOrt', 'digital'] },
        },
        required: ['branch', 'category', 'city', 'zip', 'urgency', 'execution'],
      },
      recommendations: {
        type: 'array',
        items: {
          anyOf: [
            {
              type: 'object',
              properties: {
                kind: { const: 'budget' },
                budget_min: { type: ['number', 'null'] },
                budget_max: { type: ['number', 'null'] },
                assumptions: { type: 'array', items: { type: 'string' } },
              },
              required: ['kind', 'budget_min', 'budget_max'],
            },
            {
              type: 'object',
              properties: {
                kind: { const: 'advice' },
                title: { type: 'string' },
                bullets: { type: 'array', items: { type: 'string' } },
                extras: { type: 'object' },
              },
              required: ['kind', 'title', 'bullets'],
            },
            {
              type: 'object',
              properties: {
                kind: { const: 'analysis' },
                title: { type: 'string' },
                sections: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      heading: { type: 'string' },
                      items: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['heading', 'items'],
                  },
                },
              },
              required: ['kind', 'title', 'sections'],
            },
            {
              type: 'object',
              properties: {
                kind: { const: 'bedarf' },
                title: { type: 'string' },
                bullets: { type: 'array', items: { type: 'string' } },
              },
              required: ['kind', 'bullets'],
            },
            {
              type: 'object',
              properties: {
                kind: { const: 'medical' },
                title: { type: 'string' },
                bullets: { type: 'array', items: { type: 'string' } },
                specialty: { type: 'string' },
                urgency: { type: 'string', enum: ['sofort', 'zeitnah', 'termin'] },
                red_flags: { type: 'array', items: { type: 'string' } },
                disclaimer: { type: 'string' },
              },
              required: ['kind', 'title', 'bullets'],
            },
          ],
        },
      },
    },
    required: ['summary', 'fields'],
  }

  // 4) Systemprompt – Branch erzwingen
  const system = `
Du erzeugst aus Freitext eine professionelle, geschäftstaugliche Anfrage als JSON.

WICHTIG ZU BRANCHES:
- Du bekommst "allowed_branches" (id, name, slug) aus der Datenbank.
- "fields.branch" MUSS exakt dem "name" einer der allowed_branches entsprechen.
- "fields.branch_id" MUSS die zugehörige id (UUID) sein.
- Erfinde KEINE neue Branche. Wenn unklar: wähle die NAHELIEGENDE aus allowed_branches.

WICHTIG (ALLGEMEIN):
- Antworte NUR mit JSON gemäß Schema.
- "parts": intro 3–6 Sätze (keine Anrede/kein Abschluss), bullets GENAU 3 vollständige Sätze.
- "analysis": IMMER befüllen (3 Abschnitte à 3–6 Punkte), individuell passend zur Anfrage.
  Abschnitte: "Potenzielle zukünftige offene Punkte", "Risiken/Abhängigkeiten", "Annahmen".
- BUDGET (kind:"budget"):
  - ERFORDERLICH bei kostenpflichtigen Leistungen (Website/Shop, Webdesign, Software/App, Bau/Handwerk, Reinigung, Umzug) UND bei monatlichen Retainern (Marketing, Coaching/Fitness).
  - Spanne realistisch (aktuelles Markt-/Preisniveau). Assumptions GENAU 3 konkret zur Anfrage.
- NON-DIRECT-PAY (z. B. Kredit-/Baufinanzierung, Versicherungsvermittlung, Makler): KEIN "budget". Stattdessen "bedarf" mit 3 klaren Punkten.

WICHTIG (MEDIZIN/HEALTH):
- Wenn Text Beschwerden, Symptome, medizinische Fragen oder Suche nach Ärzt:innen enthält:
  - Füge eine Empfehlung {kind:"medical"} hinzu:
    - title: kurze, symptombasierte Zusammenfassung
    - bullets: 2–5 prägnante Hinweise
    - specialty: empfohlene Fachrichtung
    - urgency: "sofort" | "zeitnah" | "termin"
    - red_flags: 1–5 Warnzeichen (nur falls relevant)
    - disclaimer: klarer Hinweis, dass es keine ärztliche Diagnose ist.
- KEINE definitive Diagnose, KEINE Dosierungen.

ACHTUNG:
- Budget NIEMALS in "fields".
`.trim()

  // 5) User-Content mit allowed_branches
  const userContent = {
    instruction: 'JSON gemäß Schema; branch aus allowed_branches wählen',
    schema,
    input,
    allowed_branches: branches, // Liste aus DB
  }

  // 6) LLM-Call + starke Server-Validierung
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: JSON.stringify(userContent) },
        ],
      }),
    })
    if (!resp.ok) throw new Error(await resp.text())
    const data = await resp.json()
    let content: string = data.choices?.[0]?.message?.content ?? ''
    const clean = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '')
    const parsed = JSON.parse(clean) as AiLead

    // Guardrails & Defaults
    parsed.fields ||= {} as any
    parsed.fields.city = parsed.fields.city ?? input.city ?? ''
    parsed.fields.zip  = parsed.fields.zip  ?? input.zip  ?? ''
    parsed.fields.urgency   = parsed.fields.urgency   ?? input.urgency
    parsed.fields.execution = parsed.fields.execution ?? guessExecution(input.freeText)

    // === Branch: DB-gebunden erzwingen ===
    if (branches.length) {
      const fixed = validateAndFixBranchFromAi(parsed.fields.branch_id, parsed.fields.branch, branches)
      parsed.fields.branch_id = fixed.branch_id
      parsed.fields.branch    = fixed.branch
    } else {
      // Absoluter Ausnahmefall (DB-Problem): KEINE neue Branch erfinden → leeres Feld
      parsed.fields.branch_id = null
      parsed.fields.branch = parsed.fields.branch ? parsed.fields.branch : 'Unbekannt'
    }

    // Kategorie (frei): Fallback
    parsed.fields.category  = parsed.fields.category  || guessCategory(input.freeText)

    // Budget NIEMALS in fields
    parsed.fields.budget_min = null
    parsed.fields.budget_max = null

    // parts fallback (GENAU 3 Bullets)
    if (!parsed.parts || !parsed.parts.intro || !Array.isArray(parsed.parts.bullets) || parsed.parts.bullets.length < 3) {
      parsed.parts = makeParts({ freeText: input.freeText })
    } else if (parsed.parts.bullets.length > 3) {
      parsed.parts.bullets = parsed.parts.bullets.slice(0, 3)
    }

    // Empfehlungen normalisieren
    const recs = Array.isArray(parsed.recommendations) ? (parsed.recommendations as any[]).filter(Boolean) : []
    let normalized: SmartRecommendation[] = recs
      .map((r) => {
        if ((r as any).kind === 'budget') {
          const rawMin = (r as any).budget_min
          const rawMax = (r as any).budget_max
          const min = typeof rawMin === 'number' && rawMin > 0 ? Math.round(rawMin) : null
          const max = typeof rawMax === 'number' && rawMax > 0 ? Math.round(rawMax) : null
          let bmin = min, bmax = max
          if (typeof bmin === 'number' && typeof bmax === 'number' && bmin > bmax) [bmin, bmax] = [bmax, bmin]
          const assumptions = Array.isArray((r as any).assumptions) ? (r as any).assumptions.map(oneLine).filter(Boolean).slice(0, 3) : undefined
          return { kind: 'budget', budget_min: bmin, budget_max: bmax, assumptions }
        }
        if ((r as any).kind === 'analysis') {
          const a = r as { kind: 'analysis'; title: string; sections: { heading: string; items: string[] }[] }
          const sections = (a.sections || []).map((s) => ({
            heading: s.heading || 'Aspekte',
            items: (s.items || []).map(oneLine).filter(Boolean).slice(0, 6),
          })).slice(0, 3)
          return { kind: 'analysis', title: a.title || 'Analyse & wichtige Punkte', sections }
        }
        if ((r as any).kind === 'bedarf') {
          const b = r as { kind: 'bedarf'; title?: string; bullets: string[] }
          const bullets = (b.bullets || []).map(oneLine).filter(Boolean).slice(0, 5)
          return { kind: 'bedarf', title: b.title || 'Bedarf der Beratung', bullets }
        }
        if ((r as any).kind === 'medical') {
          const m = r as any
          const bullets = Array.isArray(m.bullets) ? m.bullets.map(oneLine).filter(Boolean).slice(0, 5) : []
          const red_flags = Array.isArray(m.red_flags) ? m.red_flags.map(oneLine).filter(Boolean).slice(0, 5) : undefined
          const urgency = ['sofort','zeitnah','termin'].includes(m.urgency) ? m.urgency : undefined
          return {
            kind: 'medical',
            title: oneLine(m.title || 'Vorläufige Einschätzung'),
            bullets,
            specialty: m.specialty ? oneLine(m.specialty) : undefined,
            urgency,
            red_flags,
            disclaimer: m.disclaimer ? oneLine(m.disclaimer) : 'Dies ist keine ärztliche Diagnose, sondern eine vorläufige Einschätzung.',
          }
        }
        return r as SmartRecommendation
      })
      .filter(Boolean) as SmartRecommendation[]

    // Heuristik: Budget sicherstellen (Web/Marketing)
    const branchName = parsed.fields.branch || ''
    const category   = parsed.fields.category || guessCategory(input.freeText)
    normalized = ensureBudgetForWebAndMarketing({
      input,
      branch: branchName,
      category,
      t: input.freeText.toLowerCase(),
      recommendations: normalized,
    })

    let recommendations = normalized

    // Non-Direct-Pay → KEIN Budget, stattdessen Bedarf
    const cat = category
    const isNonDirect = NON_DIRECT_PAY_CATEGORIES.has(cat)
    if (isNonDirect) {
      recommendations = recommendations.filter((r) => r.kind !== 'budget')
      if (!recommendations.some((r) => r.kind === 'bedarf')) {
        recommendations.unshift({
          kind: 'bedarf',
          title: 'Bedarf der Beratung',
          bullets: [
            'Ziele & Rahmen (z. B. Summe, Laufzeit, Förderung) festlegen.',
            'Unterlagen klären (Bonität/Nachweise/Objektinfos).',
            'Ergebnis: Vergleich mit Konditionenübersicht & Empfehlung.',
          ],
        })
      }
    }

    // Sicherstellen: Eine ANALYSE ist immer vorhanden
    if (!recommendations.some((r) => r.kind === 'analysis')) {
      recommendations.push({
        kind: 'analysis',
        title: 'Analyse & wichtige Punkte',
        sections: [
          { heading: 'Potenzielle zukünftige offene Punkte', items: ['Umfang konkretisieren', 'Unterlagen/Fotos bereitstellen', 'Zeitrahmen grob benennen'] },
          { heading: 'Risiken/Abhängigkeiten', items: ['Schnittstellen/Termine', 'Vorleistungen/Genehmigungen', 'Zusatzaufwände'] },
          { heading: 'Annahmen', items: ['Standardqualität', 'Normale Komplexität', 'Regionales Preisniveau'] },
        ],
      })
    }

    parsed.recommendations = recommendations

    // Ausformulierter Anfrage-Text IMMER serverseitig aus parts bauen
    const ensuredParts = parsed.parts || makeParts({ freeText: input.freeText })
    parsed.requestText = buildRequestText(ensuredParts)

    return NextResponse.json(parsed)
  } catch (e) {
    // Offline-/Fehler-Fallback: Wir geben trotzdem etwas Sinnvolles zurück
    const category = guessCategory(input.freeText)
    const execution = guessExecution(input.freeText)
    const parts = makeParts({ freeText: input.freeText })
    const requestText = buildRequestText(parts)

    // Branch-Fallback: KEINE neue Branch erfinden → aus DB wählen, wenn vorhanden
    let branch_id: string | null = null
    let branch_name = 'Unbekannt'
    if (branches.length) {
      const fb = findNeutralFallbackBranch(branches) || branches[0]
      branch_id = fb.id
      branch_name = fb.name
    }

    // Basis-Analyse
    let recs: SmartRecommendation[] = [{
      kind: 'analysis',
      title: 'Analyse & wichtige Punkte',
      sections: [
        { heading: 'Potenzielle zukünftige offene Punkte', items: ['Umfang konkretisieren', 'Unterlagen beifügen', 'Zeitrahmen grob benennen'] },
        { heading: 'Risiken/Abhängigkeiten', items: ['Schnittstellen/Termine', 'Vorleistungen/Genehmigungen', 'Zusatzaufwände'] },
        { heading: 'Annahmen', items: ['Standardqualität', 'Normale Komplexität', 'Regionales Preisniveau'] },
      ],
    }]

    // Medizin ggf.
    const t = input.freeText.toLowerCase()
    const looksMedical = /(schmerz|arzt|ärzt|praxis|termin|diagnos|beschwerden|symptom|orthopädie|orthopaed|kardiolog|hno|dermatolog|hausarzt|neurolog|gynäkolog|urolog|kinderarzt|physio|therapie)/.test(t)
    if (looksMedical) {
      recs.unshift({
        kind: 'medical',
        title: 'Vorläufige Einschätzung',
        bullets: ['Symptome dokumentieren (Dauer, Auslöser, Stärke).', 'Vorbefunde/Medikamente notieren.', 'Termin bei passender Fachrichtung anfragen.'],
        specialty: category === 'Sonstiges' ? 'Hausarzt/Allgemeinmedizin' : category,
        urgency: 'zeitnah',
        disclaimer: 'Keine ärztliche Diagnose. Bei akuter Verschlechterung bitte Notfall wählen.',
      } as any)
    }

    // Budget-Heuristik auch im Fallback anwenden
    recs = ensureBudgetForWebAndMarketing({
      input,
      branch: branch_name,
      category,
      t,
      recommendations: recs,
    })

    const fallback: AiLead = {
      summary: `Anfrage für ${branch_name} – ${category} in ${input.zip ? input.zip + ' ' : ''}${input.city}.`,
      requestText,
      parts,
      fields: {
        branch_id,
        branch: branch_name,
        category,
        city: input.city || '',
        zip: input.zip || '',
        urgency: input.urgency,
        execution,
        budget_min: null,
        budget_max: null,
      },
      recommendations: recs,
    }
    return NextResponse.json(fallback)
  }
}

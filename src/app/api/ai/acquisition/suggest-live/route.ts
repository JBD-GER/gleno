// src/app/api/ai/acquisition/suggest-live/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { chatJson } from '@/lib/server-openai'
import { sanitizeScript } from '@/lib/sanitize-script'

export const runtime = 'edge'

type CallStage = 'intro' | 'need' | 'objection' | 'closing'
type CallDirection = 'outbound' | 'inbound'

type LiveSuggestBody = {
  profileId: string
  transcriptSnippet: string
  stage: CallStage
  direction: CallDirection
  language?: 'de' | 'en'
}

type ClosingPriorities =
  | {
      primary?: string | null
      secondary?: string | null
      tertiary?: string | null
    }
  | null

const LIVE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    speech_block: { type: 'array', items: { type: 'string' } },
    pause_question: { type: ['string', 'null'] },

    backup_block: {
      anyOf: [
        { type: 'array', items: { type: 'string' } },
        { type: 'null' },
      ],
    },

    stage: { type: 'string' },
    objection_type: { type: ['string', 'null'] },
    objection_label: { type: ['string', 'null'] },
    reasoning: { type: ['string', 'null'] },

    closing_priority: { type: ['string', 'null'] },
    closing_priority_label: { type: ['string', 'null'] },

    stop_signal: { type: 'string' }, // "continue" | "wrap_up" | "exit"
  },
  required: [
    'speech_block',
    'pause_question',
    'backup_block',
    'stage',
    'objection_type',
    'objection_label',
    'reasoning',
    'closing_priority',
    'closing_priority_label',
    'stop_signal',
  ],
} as const

function joinBlock(x: unknown): string {
  if (!x) return ''
  if (Array.isArray(x)) return x.filter(Boolean).join(' ').trim()
  if (typeof x === 'string') return x.trim()
  return ''
}

export async function POST(req: Request) {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  let body: LiveSuggestBody
  try {
    body = (await req.json()) as LiveSuggestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    profileId,
    transcriptSnippet,
    stage,
    direction,
    language = 'de',
  } = body

  if (!profileId || !transcriptSnippet || !stage || !direction) {
    return NextResponse.json(
      {
        error:
          'profileId, transcriptSnippet, stage, direction sind erforderlich.',
      },
      { status: 400 }
    )
  }

  // Profil laden inkl. closing_priorities
  const { data: profile, error: profileError } = await supabase
    .from('acquisition_profiles')
    .select(
      'id, user_id, name, offer_name, target_audience, language, customer_profile, intros, closing_priorities'
    )
    .eq('id', profileId)
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profil nicht gefunden.' }, { status: 404 })
  }

  const closingPriorities: ClosingPriorities =
    (profile as any).closing_priorities ?? null

  // Letzte Learnings (nur generische Infos, keine Transkripte)
  const { data: learnings } = await supabase
    .from('acquisition_learnings')
    .select(
      'stage, call_direction, outcome, objection_type, objection_label, suggestion, usage_hint, created_at'
    )
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(20)

  const system =
    language === 'de'
      ? `
Du bist ein Live-Call-Coach für B2B-Telefonakquise.

Du erhältst:
- Ein Akquise-Profil (Kundenprofil, Angebot, vorhandene Intros)
- Drei Abschlussziele mit Priorität:
  - closing_priorities.primary   (z. B. "Demo-Termin vereinbaren")
  - closing_priorities.secondary (z. B. "Infos per E-Mail senden")
  - closing_priorities.tertiary  (z. B. "freundlich verabschieden, Tür offen lassen")
- Einen kurzen Transkript-Ausschnitt aus dem aktuellen Gespräch
- Den Gesprächsabschnitt (intro/need/objection/closing)
- Optionale vergangene Learnings (Objection-Typ + welche Antwort gut/schlecht war)

Deine Aufgabe:
- Schlag GENAU EINEN nächsten Satz oder eine sehr kurze Sequenz (max. 2 Sätze) vor,
  die der Anrufer JETZT sagen kann.
- Optionale Backup-Variante darfst du ebenfalls geben.
- Wenn erkennbar, klassifiziere den Einwand (z. B. "kein Bedarf", "kein Budget", "Timing", "Kein Entscheidungsträger").
- Entscheide, welches Abschlussziel du mit deiner Antwort verfolgst:
  - Wenn realistisch: versuche primary zu erreichen.
  - Wenn primary unrealistisch ist, wähle secondary.
  - Wenn nur noch ein sauberer Exit sinnvoll ist, nutze tertiary.
  - Wenn noch kein Abschluss sinnvoll ist, setze closing_priority = "none" und closing_priority_label = null.

WICHTIG:
- KEINE Namen, keine personenbezogene Ansprache, keine Platzhalter.
- Kein aggressiver Druck, keine falschen Versprechen.
- Immer wertschätzend und klar, B2B-Fokus.
- Antworte NUR als JSON (siehe Schema).
- Fülle ALLE Felder im JSON aus. Nutze null, wenn etwas nicht zutrifft.
`
      : `
You are a live call coach for B2B phone calls.

You get:
- An acquisition profile (customer profile, offer, intros)
- Three closing goals with priority:
  - closing_priorities.primary   (e.g. "Book demo call")
  - closing_priorities.secondary (e.g. "Send info by email")
  - closing_priorities.tertiary  (e.g. "Polite goodbye, keep door open")
- A short transcript snippet from the current call
- The call stage (intro/need/objection/closing)
- Optional past learnings (objection types + what worked / didn't)

Your task:
- Suggest EXACTLY ONE next sentence or a very short sequence (max 2 sentences)
  the caller can say right now.
- Optionally provide a backup variant.
- Classify objections if visible (no need, no budget, timing, wrong contact, trust, other).
- Decide which closing goal you are aiming for:
  - Prefer primary if realistic,
  - otherwise secondary,
  - otherwise tertiary,
  - or "none" if you are not yet closing.

IMPORTANT:
- NO names, no personal references, no placeholders.
- No aggressive pressure, no false promises.
- Always respectful and B2B-focused.
- Respond ONLY with JSON (schema).
- Fill ALL JSON fields. Use null if something does not apply.
`

  const userContent = {
    profile: {
      name: profile.name,
      offer_name: profile.offer_name,
      target_audience: profile.target_audience,
      customer_profile: profile.customer_profile,
      intros: profile.intros,
      closing_priorities: closingPriorities,
    },
    snippet: transcriptSnippet,
    stage,
    direction,
    previous_learnings: (learnings ?? []).map((l) => ({
      stage: l.stage,
      call_direction: l.call_direction,
      outcome: l.outcome,
      objection_type: l.objection_type,
      objection_label: l.objection_label,
      suggestion: l.suggestion,
      usage_hint: l.usage_hint,
    })),
  }

  let ai
  try {
    ai = await chatJson<{
      speech_block: string[]
      pause_question: string | null
      backup_block: string[] | null
      stage: string
      objection_type: string | null
      objection_label: string | null
      reasoning: string | null
      closing_priority: string | null
      closing_priority_label: string | null
      stop_signal: string
    }>({
      system,
      user: userContent,
      schema: LIVE_SCHEMA,
      temperature: 0.5,
      maxOutputTokens: 400,
    })
  } catch (e: any) {
    console.error('[acquisition/suggest-live] OpenAI error', e)
    return NextResponse.json(
      { error: 'Konnte Live-Vorschlag nicht generieren.' },
      { status: 500 }
    )
  }

  // ✅ Schema -> Response korrekt mappen
  const suggestionRaw = joinBlock(ai.speech_block)
  const backupRaw = ai.backup_block ? joinBlock(ai.backup_block) : ''

  const suggestion = sanitizeScript(suggestionRaw || '')
  const backupSuggestion = backupRaw ? sanitizeScript(backupRaw) : null

  return NextResponse.json({
    suggestion,
    backupSuggestion,
    stage: ai.stage ?? stage,
    objectionType: ai.objection_type ?? null,
    objectionLabel: ai.objection_label ?? null,
    reasoning: ai.reasoning ?? null,
    closingPriority: ai.closing_priority ?? null,
    closingPriorityLabel: ai.closing_priority_label ?? null,
    stopSignal: ai.stop_signal ?? 'continue',
    pauseQuestion: ai.pause_question ?? null,
  })
}

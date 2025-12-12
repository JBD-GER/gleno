// src/app/api/ai/acquisition/post-call/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { chatJson } from '@/lib/server-openai'
import { sanitizeScript } from '@/lib/sanitize-script'

export const runtime = 'edge'

type CallDirection = 'outbound' | 'inbound'

type PostCallBody = {
  profileId: string
  outcome: 'success' | 'fail'
  stage: 'intro' | 'objection' | 'closing' | 'mixed'
  callDirection: CallDirection
  snippet?: string
  manualNotes?: string
  language?: 'de' | 'en'
}

const POST_CALL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    classification: {
      type: 'object',
      additionalProperties: false,
      properties: {
        objection_type: { type: ['string', 'null'] },
        objection_label: { type: ['string', 'null'] },
        confidence: { type: ['number', 'null'] },
        applied_closing_priority: { type: ['string', 'null'] }, // primary / secondary / tertiary / none
        applied_closing_label: { type: ['string', 'null'] },
        should_generate_new_suggestion: { type: 'boolean' },
      },
      required: [
        'objection_type',
        'objection_label',
        'confidence',
        'applied_closing_priority',
        'applied_closing_label',
        'should_generate_new_suggestion',
      ],
    },
    new_suggestion: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            script: { type: 'string' },
            style: { type: ['string', 'null'] },
            usage_hint: { type: ['string', 'null'] },
          },
          required: ['script', 'style', 'usage_hint'],
        },
        { type: 'null' },
      ],
    },
  },
  required: ['summary', 'classification', 'new_suggestion'],
} as const

/* ----------------------------- POST ----------------------------- */

export async function POST(req: Request) {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  let body: PostCallBody
  try {
    body = (await req.json()) as PostCallBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { profileId, outcome, stage, callDirection, snippet, manualNotes, language = 'de' } =
    body

  if (!profileId || !outcome || !stage || !callDirection) {
    return NextResponse.json(
      { error: 'profileId, outcome, stage, callDirection sind erforderlich.' },
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

  const closingPriorities = (profile as any).closing_priorities ?? null

  // Letzte Learnings
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
Du bist ein B2B-Sales-Coach und analysierst abgeschlossene Telefonate (Akquise).

Du erhältst:
- Akquise-Profil (Angebot, Zielgruppe, Kundenprofil)
- Drei Abschlussziele mit Priorität (closing_priorities.primary / secondary / tertiary)
- Info, ob der Call als Erfolg oder Misserfolg bewertet wurde
- ggf. kurze Notizen/Transkript-Ausschnitt
- Bisherige Learnings (welche Antworten bei welchen Einwänden schon ausprobiert wurden)

Deine Aufgaben:
1) Fasse in 1–2 Sätzen zusammen, was beim Call vermutlich passiert ist.
2) Klassifiziere, falls möglich, den Haupt-Einwand (z. B. "kein Bedarf", "kein Budget", "falscher Zeitpunkt", "kein Entscheidungsträger", "Vertrauen", "sonstiges").
3) Beurteile, welches Abschlussziel im Call faktisch erreicht oder versucht wurde:
   - primary, secondary, tertiary oder "none".
   - Setze applied_closing_label passend zum jeweiligen Ziel (z. B. "Demo-Termin", "Infos per Mail").
4) Wenn outcome = "fail":
   - Erzeuge eine VERBESSERTE Antwort oder ein neues Intro für künftige Calls.
   - Max. 2–3 Sätze, klar, konkret, B2B, ohne Namen und ohne Platzhalter.
5) Wenn outcome = "success":
   - KEINE neue Antwort generieren (nur Analyse).

WICHTIG:
- KEINE personenbezogenen Daten, keine Namen, keine Platzhalter.
- Keine aggressiven Techniken, keine Lügen.
- Antworte NUR mit JSON gemäß Schema.
- Fülle ALLE Felder im JSON aus. Nutze null, wenn etwas nicht zutrifft.
`
      : `
You are a B2B sales coach analysing finished cold calls.

You receive:
- Acquisition profile (offer, target audience, customer profile)
- Three closing goals with priority (closing_priorities.primary / secondary / tertiary)
- Info whether the call was successful or not
- Optional short notes / transcript snippet
- Past learnings (what answers worked or failed for which objections)

Your tasks:
1) Summarize in 1–2 sentences what likely happened in this call.
2) Classify, if possible, the main objection (no need, no budget, timing, wrong contact, trust, other).
3) Decide which closing goal was actually used or attempted:
   - primary, secondary, tertiary or "none".
   - Set applied_closing_label to a short description of that goal.
4) If outcome = "fail":
   - Create an IMPROVED answer or intro for future calls (max 2–3 sentences, clear & B2B, no names).
5) If outcome = "success":
   - Do NOT generate a new answer (analysis only).

IMPORTANT:
- NO personal data, no names, no placeholders.
- No aggressive or manipulative tactics.
- Respond ONLY with JSON (schema).
- Fill ALL fields in the JSON. Use null where appropriate.
`

  const userContent = {
    outcome,
    stage,
    callDirection,
    snippet: snippet ?? null,
    manualNotes: manualNotes ?? null,
    profile: {
      name: profile.name,
      offer_name: profile.offer_name,
      target_audience: profile.target_audience,
      customer_profile: profile.customer_profile,
      intros: profile.intros,
      closing_priorities: closingPriorities,
    },
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
      summary: string
      classification: {
        objection_type: string | null
        objection_label: string | null
        confidence: number | null
        applied_closing_priority: string | null
        applied_closing_label: string | null
        should_generate_new_suggestion: boolean
      }
      new_suggestion: {
        script: string
        style: string | null
        usage_hint: string | null
      } | null
    }>({
      system,
      user: userContent,
      schema: POST_CALL_SCHEMA,
      temperature: 0.4,
      maxOutputTokens: 600,
    })
  } catch (e: any) {
    console.error('[acquisition/post-call] OpenAI error', e)
    return NextResponse.json(
      { error: 'Konnte Call-Analyse nicht generieren.' },
      { status: 500 }
    )
  }

  // Wir überschreiben die Entscheidung, ob ein Vorschlag generiert werden soll:
  const shouldGenerateNewSuggestion = outcome === 'fail'

  let newSuggestion = null as
    | {
        script: string
        style?: string
        usage_hint?: string
      }
    | null

  if (shouldGenerateNewSuggestion && ai.new_suggestion?.script) {
    newSuggestion = {
      script: sanitizeScript(ai.new_suggestion.script),
      style: ai.new_suggestion.style ?? undefined,
      usage_hint: ai.new_suggestion.usage_hint ?? undefined,
    }
  }

  return NextResponse.json({
    summary: ai.summary,
    classification: {
      objectionType: ai.classification.objection_type ?? null,
      objectionLabel: ai.classification.objection_label ?? null,
      confidence: ai.classification.confidence ?? null,
      appliedClosingPriority: ai.classification.applied_closing_priority ?? null,
      appliedClosingLabel: ai.classification.applied_closing_label ?? null,
    },
    // Nur zur Anzeige; gespeichert wird erst beim extra "save"-Call
    newSuggestion,
  })
}

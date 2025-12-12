// src/app/api/ai/acquisition/profile/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { chatJson } from '@/lib/server-openai'
import { sanitizeScript } from '@/lib/sanitize-script'

type IntroStyle = 'professional' | 'casual' | 'neutral'

type ClosingGoals = {
  primary: string
  secondary: string
  tertiary: string
}

type CreateProfileJsonBody = {
  websiteUrl: string
  profileName: string
  offerName: string
  offerDescription: string
  targetAudience: string
  language?: 'de' | 'en'
  introStyles?: IntroStyle[]
  scriptText?: string
  closingGoals?: ClosingGoals
  // Legacy support:
  closingPreferences?: { prio_1?: string | null; prio_2?: string | null; prio_3?: string | null }
}

/** Strict JSON schema für KI */
const PROFILE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    customer_profile: {
      type: 'object',
      additionalProperties: false,
      properties: {
        summary: { type: 'string' },
        pains: { type: 'array', items: { type: 'string' } },
        goals: { type: 'array', items: { type: 'string' } },
        decision_makers: { type: 'array', items: { type: 'string' } },
        deal_sizes: { type: 'string' },
      },
      required: ['summary', 'pains', 'goals', 'decision_makers', 'deal_sizes'],
    },
    intros: {
      type: 'object',
      additionalProperties: false,
      properties: {
        professional: { type: ['string', 'null'] },
        casual: { type: ['string', 'null'] },
        neutral: { type: ['string', 'null'] },
      },
      required: ['professional', 'casual', 'neutral'],
    },
    script_principles: {
      type: 'object',
      additionalProperties: false,
      properties: {
        tone: { type: 'string' },
        dos: { type: 'array', items: { type: 'string' } },
        donts: { type: 'array', items: { type: 'string' } },
      },
      required: ['tone', 'dos', 'donts'],
    },
  },
  required: ['customer_profile', 'intros', 'script_principles'],
} as const

async function fetchWebsiteText(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, { method: 'GET' })
    if (!resp.ok) return null
    const html = await resp.text()
    return html.replace(/\s+/g, ' ').slice(0, 15000)
  } catch {
    return null
  }
}

function normalizeClosingGoals(body: CreateProfileJsonBody): ClosingGoals | null {
  if (body.closingGoals?.primary?.trim() && body.closingGoals?.secondary?.trim() && body.closingGoals?.tertiary?.trim()) {
    return {
      primary: body.closingGoals.primary.trim(),
      secondary: body.closingGoals.secondary.trim(),
      tertiary: body.closingGoals.tertiary.trim(),
    }
  }

  // Legacy mapping
  const p1 = body.closingPreferences?.prio_1?.trim()
  const p2 = body.closingPreferences?.prio_2?.trim()
  const p3 = body.closingPreferences?.prio_3?.trim()
  if (p1 && p2 && p3) {
    return { primary: p1, secondary: p2, tertiary: p3 }
  }

  return null
}

async function readFileAsTextIfPossible(file: File): Promise<string | null> {
  const ct = (file.type || '').toLowerCase()
  const name = (file.name || '').toLowerCase()

  const isTextLike =
    ct.startsWith('text/') ||
    ct.includes('json') ||
    name.endsWith('.txt') ||
    name.endsWith('.md') ||
    name.endsWith('.csv') ||
    name.endsWith('.json')

  if (!isTextLike) return null

  try {
    const buf = Buffer.from(await file.arrayBuffer())
    const txt = buf.toString('utf-8')
    // Hard limit, damit Prompt nicht explodiert:
    return txt.slice(0, 20000)
  } catch {
    return null
  }
}

/* ----------------------------- POST ----------------------------- */

export async function POST(req: Request) {
  const supabase = await supabaseServer()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  const contentType = req.headers.get('content-type') || ''

  // 1) JSON-Body
  if (contentType.includes('application/json')) {
    let body: CreateProfileJsonBody
    try {
      body = (await req.json()) as CreateProfileJsonBody
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const closingGoals = normalizeClosingGoals(body)
    if (!closingGoals) {
      return NextResponse.json(
        { error: 'closingGoals (primary/secondary/tertiary) sind erforderlich.' },
        { status: 400 }
      )
    }

    return await createProfileCore({
      userId: user.id,
      body,
      closingGoals,
      uploadedScript: null,
    })
  }

  // 2) multipart/form-data (Upload)
  if (contentType.includes('multipart/form-data')) {
    const fd = await req.formData()

    const body: CreateProfileJsonBody = {
      websiteUrl: String(fd.get('websiteUrl') || ''),
      profileName: String(fd.get('profileName') || ''),
      offerName: String(fd.get('offerName') || ''),
      offerDescription: String(fd.get('offerDescription') || ''),
      targetAudience: String(fd.get('targetAudience') || ''),
      language: (String(fd.get('language') || 'de') as 'de' | 'en') || 'de',
      introStyles: (() => {
        try {
          const raw = String(fd.get('introStyles') || '[]')
          const parsed = JSON.parse(raw)
          return Array.isArray(parsed)
            ? (parsed as IntroStyle[])
            : (['professional', 'casual', 'neutral'] as IntroStyle[])
        } catch {
          return ['professional', 'casual', 'neutral']
        }
      })(),
      scriptText: String(fd.get('scriptText') || '') || undefined,
    }

    // closingGoals kommt als JSON-String
    let closingGoals: ClosingGoals | null = null
    try {
      const raw = String(fd.get('closingGoals') || '')
      if (raw) closingGoals = JSON.parse(raw)
    } catch {
      closingGoals = null
    }
    if (
      !closingGoals?.primary?.trim() ||
      !closingGoals?.secondary?.trim() ||
      !closingGoals?.tertiary?.trim()
    ) {
      return NextResponse.json(
        { error: 'closingGoals (primary/secondary/tertiary) sind erforderlich.' },
        { status: 400 }
      )
    }

    const scriptFile = fd.get('scriptFile')
    const uploadedScript = scriptFile instanceof File ? scriptFile : null

    return await createProfileCore({
      userId: user.id,
      body,
      closingGoals: {
        primary: closingGoals.primary.trim(),
        secondary: closingGoals.secondary.trim(),
        tertiary: closingGoals.tertiary.trim(),
      },
      uploadedScript,
    })
  }

  return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 415 })
}

async function createProfileCore(opts: {
  userId: string
  body: CreateProfileJsonBody
  closingGoals: ClosingGoals
  uploadedScript: File | null
}) {
  const supabase = await supabaseServer()
  const { userId, body, closingGoals, uploadedScript } = opts

  const {
    websiteUrl,
    profileName,
    offerName,
    offerDescription,
    targetAudience,
    language = 'de',
    introStyles = ['professional', 'casual', 'neutral'],
    scriptText,
  } = body

  if (
    !websiteUrl ||
    !profileName ||
    !offerName ||
    !offerDescription ||
    !targetAudience
  ) {
    return NextResponse.json(
      {
        error:
          'websiteUrl, profileName, offerName, offerDescription, targetAudience sind erforderlich.',
      },
      { status: 400 }
    )
  }

  const websiteText = await fetchWebsiteText(websiteUrl)

  // Optional: Upload-Text (wenn text-like)
  let uploadedScriptText: string | null = null
  if (uploadedScript) {
    uploadedScriptText = await readFileAsTextIfPossible(uploadedScript)
  }

  const system =
    language === 'de'
      ? `
Du bist ein B2B-Sales-Coach für Telefonakquise. 
Du erhältst:
- Website-Text (Auszug)
- Angebot + Beschreibung
- Zielgruppe
- optional: bestehendes Skript als Text (scriptText)
- optional: hochgeladenes Skript (uploadedScriptText) – falls verfügbar als Textauszug
- Abschlussziele (closingGoals: primary/secondary/tertiary)

Du sollst:
1) Ein kompaktes Kundenprofil erstellen (Summary, Pains, Goals, Decision Makers, Deal Sizes).
2) Für alle Tonalitäten (professional, casual, neutral) jeweils EIN kurzes Telefon-Intro liefern.
3) Grundprinzipien für die Gesprächsführung formulieren.

SEHR WICHTIG:
- KEINE personenbezogenen Daten, keine Eigennamen, keine Platzhalter wie [Name].
- Intros max. 2–3 Sätze, klarer Nutzen, kein Druck, kein Bullshit.
- Immer B2B-Kontext.
- Wenn Tonalität nicht gewünscht ist, setze Intro auf null.
`
      : `
You are a B2B sales coach for outbound cold calling.
You receive website text, offer description, target audience,
optional scriptText, optional uploadedScriptText, and closing goals.
Return JSON only. No names, no placeholders.
`

  const userContent = {
    websiteUrl,
    websiteText: websiteText ?? null,
    offerName,
    offerDescription,
    targetAudience,
    language,
    introStyles,
    scriptText: scriptText ?? null,
    uploadedScriptText: uploadedScriptText ?? null,
    closingGoals,
  }

  let ai
  try {
    ai = await chatJson<{
      customer_profile: {
        summary: string
        pains: string[]
        goals: string[]
        decision_makers: string[]
        deal_sizes: string
      }
      intros: {
        professional: string | null
        casual: string | null
        neutral: string | null
      }
      script_principles: {
        tone: string
        dos: string[]
        donts: string[]
      }
    }>({
      system,
      user: userContent,
      schema: PROFILE_SCHEMA,
      temperature: 0.4,
      maxOutputTokens: 900,
    })
  } catch (e: any) {
    console.error('[acquisition/profile] OpenAI error', e)
    return NextResponse.json(
      { error: 'Konnte Akquise-Profil nicht mit KI generieren.' },
      { status: 500 }
    )
  }

  // ✅ Intros immer mit allen Keys speichern (stabil fürs Frontend + Coach-Prompts)
  const want = new Set(introStyles)
  const sanitizedIntros = {
    professional: want.has('professional')
      ? (ai.intros?.professional ? sanitizeScript(ai.intros.professional) : null)
      : null,
    casual: want.has('casual')
      ? (ai.intros?.casual ? sanitizeScript(ai.intros.casual) : null)
      : null,
    neutral: want.has('neutral')
      ? (ai.intros?.neutral ? sanitizeScript(ai.intros.neutral) : null)
      : null,
  }

  // 1) Profil anlegen
  const { data: inserted, error: insertError } = await supabase
    .from('acquisition_profiles')
    .insert({
      user_id: userId,
      name: profileName,
      website_url: websiteUrl,

      // Legacy fields
      product_focus: offerName,
      what_we_sell: offerDescription,
      target_audience: targetAudience,
      elevator_pitch: ai.customer_profile?.summary ?? null,
      tone_default: 'neutral',
      language,

      website_snapshot: websiteText ?? null,

      // Newer fields
      offer_name: offerName,
      offer_description: offerDescription,
      customer_profile: ai.customer_profile,
      intros: sanitizedIntros,
      script_principles: ai.script_principles ?? null,

      closing_priorities: {
        primary: closingGoals.primary,
        secondary: closingGoals.secondary,
        tertiary: closingGoals.tertiary,
      },

      settings: {
        script_text_present: Boolean(scriptText && scriptText.trim().length),
        script_upload_present: Boolean(uploadedScript),
      },
    })
    .select('*')
    .single()

  if (insertError || !inserted) {
    console.error('[acquisition/profile] insert error', insertError)
    return NextResponse.json(
      { error: 'Profil konnte nicht gespeichert werden.' },
      { status: 500 }
    )
  }

  // 2) Optional: Script-Datei in Storage speichern + in acquisition_profile_scripts loggen
  if (uploadedScript) {
    try {
      const ts = Date.now()
      const safeName = uploadedScript.name.replace(/[^\w.\-()+ ]+/g, '_')
      const path = `acquisition/${userId}/${inserted.id}/${ts}_${safeName}`

      const arrayBuf = await uploadedScript.arrayBuffer()
      const fileBuf = Buffer.from(arrayBuf)

      const up = await supabase.storage.from('skripte').upload(path, fileBuf, {
        contentType: uploadedScript.type || 'application/octet-stream',
        upsert: false,
      })

      if (up.error) {
        console.error('[acquisition/profile] storage upload error', up.error)
      } else {
        const { error: metaErr } = await supabase
          .from('acquisition_profile_scripts')
          .insert({
            user_id: userId,
            profile_id: inserted.id,
            name: uploadedScript.name,
            path,
            size: uploadedScript.size,
            content_type: uploadedScript.type || null,
          })
        if (metaErr) console.error('[acquisition/profile] meta insert error', metaErr)
      }
    } catch (e) {
      console.error('[acquisition/profile] upload failure', e)
    }
  }

  return NextResponse.json({ profile: inserted })
}

/* ----------------------------- GET ----------------------------- */

export async function GET(req: Request) {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id ist erforderlich.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('acquisition_profiles')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Profil nicht gefunden.' }, { status: 404 })
  }

  return NextResponse.json({ profile: data })
}

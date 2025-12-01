console.log('[AI project-todos-from-offers] HAS_KEY', !!process.env.OPENAI_API_KEY)

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json()

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { message: 'projectId (string) ist erforderlich.' },
        { status: 400 },
      )
    }

    const supa = await supabaseServer()
    const {
      data: { user },
    } = await supa.auth.getUser()

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Optional: Projekt-Member-Check
    const { data: isMember, error: memberErr } = await supa.rpc(
      'is_project_member',
      { p_project_id: projectId },
    )
    if (memberErr) {
      console.error('[AI project-todos-from-offers] is_project_member error', memberErr)
    }
    if (!isMember) {
      return NextResponse.json(
        { message: 'Kein Zugriff auf dieses Projekt.' },
        { status: 403 },
      )
    }

    // Verknüpfte Angebote laden
    const { data: rows, error: offErr } = await supa
      .from('project_offers')
      .select(
        `
        offer_id,
        offers (*)
      `,
      )
      .eq('project_id', projectId)

    if (offErr) {
      console.error('[AI project-todos-from-offers] offers error', offErr)
      return NextResponse.json(
        { message: offErr.message ?? 'Fehler beim Laden der Angebote.' },
        { status: 500 },
      )
    }

    const offers = (rows ?? [])
      .map((r: any) => r.offers)
      .filter(Boolean) as any[]

    if (!offers.length) {
      return NextResponse.json({
        suggestions: [],
        info: 'Keine verknüpften Angebote gefunden.',
      })
    }

    // Text für KI bauen – sehr generisch, da wir keine fixe Offers-Struktur annehmen
    const offerNumberFrom = (o: any): string | null =>
      o.offer_number ?? o.number ?? o.nr ?? null

    const promptParts = offers.map((o, idx) => {
      const num = offerNumberFrom(o)
      const header = `Angebot ${idx + 1}${num ? ` (Nummer: ${num})` : ''}`
      const asJson = JSON.stringify(o, null, 2)
      return `${header}:\n${asJson}`
    })

    const offersText = promptParts.join('\n\n')

    // Fallback, wenn kein Key gesetzt ist -> simple generische Aufgaben
    if (!OPENAI_API_KEY) {
      const fallback = offers.map((o, idx) => {
        const num = offerNumberFrom(o)
        return {
          id: `fallback-${idx}`,
          title: `Auftrag aus Angebot ${num ?? idx + 1} vorbereiten`,
          description: `Prüfe alle Positionen und Konditionen des Angebots ${
            num ?? idx + 1
          } und bereite die Ausführung vor (Terminierung, Material, Personal etc.).`,
          offer_id: o.id ?? null,
        }
      })
      return NextResponse.json({ suggestions: fallback })
    }

    // KI-Call (JSON-Mode)
    const sys = [
      {
        role: 'system',
        content:
          'Du bist ein Assistent für Projektplanung im Handwerk und Dienstleistungsbereich. Du erzeugst ausschließlich Aufgabenlisten als JSON.',
      },
    ]
    const usr = [
      {
        role: 'user',
        content: `Aus den folgenden Angebotsinformationen sollen logische Aufgaben (ToDos) für die Projektumsetzung erzeugt werden.

WICHTIG:
- Antworte NUR mit JSON im folgenden Schema.
- KEIN Markdown, kein Freitext außerhalb des JSON.
- Weise KEINE Mitarbeiter zu.
- Aufgaben sollen klar formuliert, umsetzbar und möglichst konkret sein.
- Jede Aufgabe darf optional einem Angebot zugeordnet sein (offer_number), ansonsten null.

Schema:
{
  "suggestions": [
    {
      "title": string,
      "description": string,
      "offer_number": string | null
    }
  ]
}

Angebote:
${offersText}`,
      },
    ]

    const resLLM = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [...sys, ...usr],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    })

    if (!resLLM.ok) {
      const text = await resLLM.text().catch(() => '')
      console.error('[AI project-todos-from-offers] LLM HTTP error', text)
      return NextResponse.json(
        { message: 'LLM-Fehler', detail: text },
        { status: 502 },
      )
    }

    const data = await resLLM.json()
    const content = data?.choices?.[0]?.message?.content
    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch (e) {
      console.error('[AI project-todos-from-offers] JSON parse error', e, content)
      return NextResponse.json(
        { message: 'Ungültige KI-Antwort.' },
        { status: 500 },
      )
    }

    const rawSuggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions
      : []

    const normalized = rawSuggestions
      .map((s: any, idx: number) => {
        const title = s?.title ? String(s.title) : ''
        if (!title) return null

        const description = s?.description ? String(s.description) : ''
        const suggOfferNo = s?.offer_number
          ? String(s.offer_number)
          : null

        let offer_id: string | null = null
        if (suggOfferNo) {
          const match = offers.find(
            (o) => String(offerNumberFrom(o) ?? '') === suggOfferNo,
          )
          if (match?.id) offer_id = match.id
        }

        return {
          id: `ai-${idx}`,
          title: title.slice(0, 200),
          description: description.slice(0, 2000),
          offer_id,
        }
      })
      .filter(Boolean)

    return NextResponse.json({ suggestions: normalized })
  } catch (e: any) {
    console.error('[AI project-todos-from-offers] Uncaught error', e)
    return NextResponse.json(
      { message: e?.message ?? 'Unbekannter Fehler' },
      { status: 500 },
    )
  }
}

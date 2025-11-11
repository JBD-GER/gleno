console.log('HAS_KEY', !!process.env.OPENAI_API_KEY);
import { NextRequest, NextResponse } from 'next/server'
import { normalizeDraft } from '@/lib/ai-draft'

// Optional: OpenAI / anderes LLM verwenden
// - Setze OPENAI_API_KEY in den Env Vars
// - Oder ersetze fetch(...) durch Deinen Provider
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ message: 'prompt (string) ist erforderlich.' }, { status: 400 })
    }

    // Fallback: sehr einfacher, lokaler Heuristik-Generator, falls kein API Key da ist
    if (!OPENAI_API_KEY) {
      const mock = {
        title: 'Angebot – {{customer.display_name}}',
        intro: `Vielen Dank für Ihre Anfrage vom {{today}}.\nNachfolgend erhalten Sie unser Angebot.`,
        tax_rate: 19,
        positions: [
          { type: 'heading', description: 'Leistungen' },
          { type: 'item', description: 'Material & Lieferung', quantity: 1, unit: 'Pauschal', unitPrice: 350 },
          { type: 'item', description: 'Arbeitszeit', quantity: 8, unit: 'Std.', unitPrice: 65 },
          { type: 'description', description: 'Ausführung gemäß Beschreibung im Prompt.' },
          { type: 'subtotal', description: 'Zwischensumme' },
          { type: 'separator' },
        ],
        discount: { enabled: false, label: 'Rabatt', type: 'percent', base: 'net', value: 0 },
      }
      return NextResponse.json(normalizeDraft(mock))
    }

    // LLM-Call (JSON-Mode, strikt)
    const sys = [
      { role: 'system', content:
        'Du bist ein Angebots-Generator. Antworte ausschließlich mit gültigem JSON für das Schema {title?, intro?, tax_rate?, discount?, positions[]}. Verwende KEIN Markdown.' }
    ]
    const usr = [
      { role: 'user', content:
        `Erzeuge einen Angebotsentwurf als JSON. 
Schema:
{
 "title": "string (optional)",
 "intro": "string (optional)",
 "tax_rate": 0|7|19 (optional),
 "discount": {"enabled": boolean, "label": string, "type": "percent"|"amount", "base": "net"|"gross", "value": number } (optional),
 "positions": [
   {"type":"heading","description":string} |
   {"type":"description","description":string} |
   {"type":"separator"} |
   {"type":"subtotal","description":string} |
   {"type":"item","description":string,"quantity":number,"unit":string,"unitPrice":number}
 ]
}

WICHTIG:
- Keine freien Texte außerhalb des JSON.
- KEINE Währungssymbole, nur Zahlen.
- Titel/Intro dürfen Platzhalter wie {{customer.display_name}}, {{today}} enthalten.
- Prompt:
${prompt}
` }
    ]

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // oder ein anderes günstiges JSON-taugliches Modell
        messages: [...sys, ...usr],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(()=>'')
      return NextResponse.json({ message: 'LLM-Fehler', detail: text }, { status: 502 })
    }
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    const parsed = (() => { try { return JSON.parse(content) } catch { return null } })()
    if (!parsed) return NextResponse.json({ message: 'Ungültige KI-Antwort.' }, { status: 500 })

    return NextResponse.json(normalizeDraft(parsed))
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? 'Unbekannter Fehler' }, { status: 500 })
  }
}

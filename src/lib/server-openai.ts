// src/lib/server-openai.ts
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini'

if (!OPENAI_API_KEY) {
  console.warn('[server-openai] OPENAI_API_KEY is not set – AI routes will fail.')
}

type JsonSchema = Record<string, any>

type ChatJsonParams<T> = {
  system: string
  user: any
  schema?: JsonSchema
  temperature?: number
  maxOutputTokens?: number
}

/**
 * Call OpenAI Chat Completions and force JSON output (optional JSON Schema).
 * Ergebnis ist bereits als Objekt geparst.
 */
export async function chatJson<T = any>({
  system,
  user,
  schema,
  temperature = 0.4,
  maxOutputTokens = 800,
}: ChatJsonParams<T>): Promise<T> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing')

  const body: any = {
    model: OPENAI_MODEL,
    temperature,
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: typeof user === 'string' ? user : JSON.stringify(user),
      },
    ],
    // max_tokens ist deprecated → max_completion_tokens verwenden
    max_completion_tokens: maxOutputTokens,
  }

  // Antwortformat erzwingen
  if (schema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'structured_response',
        schema,
        strict: true,
      },
    }
  } else {
    body.response_format = { type: 'json_object' }
  }

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    console.error('[server-openai] OpenAI error', resp.status, text)
    throw new Error(`OpenAI API error: ${resp.status}`)
  }

  const data = await resp.json()
  const choice = data.choices?.[0]
  const contentRaw = choice?.message?.content

  if (!contentRaw || typeof contentRaw !== 'string') {
    throw new Error('OpenAI: no content in response')
  }

  let content = contentRaw.trim()

  // Falls das Modell trotzdem ```json ... ``` zurückgibt → strippen
  content = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/, '')
    .trim()

  try {
    return JSON.parse(content) as T
  } catch {
    console.error('[server-openai] JSON parse error. Raw content:', content)
    throw new Error('Failed to parse JSON from OpenAI response')
  }
}

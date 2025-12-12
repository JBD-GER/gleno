// src/lib/sanitize-script.ts

/**
 * Entfernt personenbezogene Ansprache (Namen, Platzhalter) aus Call-Skripten.
 * Ziel: Nur generische B2B-Ansprache im Text.
 */
export function sanitizeScript(text: string): string {
  if (!text) return ''

  let t = text.trim()

  // Platzhalter wie [Name], [Kundenname], {Name}, <Name>
  t = t.replace(/\[(?:name|vorname|nachname|kund.*?|anrede)[^\]]*\]/gi, '')
  t = t.replace(/\{(?:name|vorname|nachname|kund.*?|anrede)[^}]*\}/gi, '')
  t = t.replace(/<(?:name|vorname|nachname|kund.*?|anrede)[^>]*>/gi, '')

  // Konkrete Namen nach Herr/Frau entfernen (auch Mehrfachnamen)
  // z.B. "Herr Müller", "Frau von Hohenberg"
  t = t.replace(
    /\b(Herr|Frau)\s+[A-ZÄÖÜ][\p{L}-]+(?:\s+[A-ZÄÖÜ][\p{L}-]+){0,3}\b/gu,
    '$1'
  )

  // "Hallo Max Mustermann", "Guten Tag Herr Müller", "Sehr geehrter Max Mustermann"
  // -> nur die Anrede behalten (Name komplett entfernen)
  t = t.replace(
    /\b(Sehr geehrte[rn]?|Hallo|Guten\s+(?:Tag|Morgen|Abend))\s+(?:Herr|Frau)?\s*[A-ZÄÖÜ][\p{L}-]+(?:\s+[A-ZÄÖÜ][\p{L}-]+){0,3}\b/gu,
    '$1'
  )

  // Hässliche Reste wie "Hallo ," oder doppelte Kommas bereinigen
  t = t.replace(/\b(Hallo|Guten\s+(?:Tag|Morgen|Abend)|Sehr geehrte[rn]?)\s*,/gi, '$1')
  t = t.replace(/\s*,\s*/g, ', ')
  t = t.replace(/,\s*,+/g, ', ')
  t = t.replace(/\s{2,}/g, ' ')

  return t.trim()
}

export const NEWS_ASSIST_ERROR = 'Unable to generate the report at the moment. Please try again.'

export function parseNewsFields(raw, existingFields = {}) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const fields = JSON.parse(cleaned)
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) throw new Error('Invalid report response')
  const required = ['headline', 'detailedContent'].filter(field => !existingFields[field]?.trim())
  if (required.some(field => typeof fields[field] !== 'string' || !fields[field].trim())) {
    throw new Error('Incomplete report response')
  }
  for (const field of ['headline', 'tag', 'referenceLink', 'detailedContent']) {
    if (fields[field] != null && typeof fields[field] !== 'string') throw new Error('Invalid report field')
  }
  return fields
}

export async function generateNewsFields({ prompt, existingFields, attempts, fetchImpl = fetch, timeoutMs = 12000 }) {
  for (const { model, key } of attempts) {
    try {
      const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 4096, responseMimeType: 'application/json' },
        }),
      })
      if (!response.ok) throw new Error(`Gemini model ${model} returned HTTP ${response.status}`)
      const data = await response.json()
      const candidate = data?.candidates?.[0]
      if (candidate?.finishReason === 'MAX_TOKENS') throw new Error(`Gemini model ${model} returned incomplete content`)
      const raw = candidate?.content?.parts?.filter(part => !part.thought).map(part => part.text || '').join('').trim()
      if (!raw) throw new Error(`Gemini model ${model} returned empty content`)
      return { fields: parseNewsFields(raw, existingFields), model }
    } catch (error) {
      // Each configured model gets one bounded attempt, including on timeout or invalid JSON.
      if (process.env.NODE_ENV !== 'test') console.warn(`Lantaw news assist model ${model} failed: ${error.message}`)
    }
  }
  throw new Error(NEWS_ASSIST_ERROR)
}

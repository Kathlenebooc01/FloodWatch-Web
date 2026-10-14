export class AnalysisError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

// Bounded backoff for transient provider failures, triggered only by an admin request.
export async function generatePrioritization(prompt, {
  apiKey, model, backupKey, fallbackModel, thirdKey, thirdModel, validate, fetchImpl = fetch,
  wait = ms => new Promise(resolve => setTimeout(resolve, ms)), random = Math.random,
} = {}) {
  const providers = [
    { key: apiKey, model },
    { key: backupKey || apiKey, model: fallbackModel || 'gemini-3.5-flash-lite' },
    { key: thirdKey || backupKey || apiKey, model: thirdModel || 'gemini-3.1-flash-lite-preview' },
  ].filter(({ key, model }) => key && model);
  if (!providers.length) throw new AnalysisError('AI analysis is not configured. Contact your administrator.', 503);
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    const provider = providers[Math.min(attempt, providers.length - 1)];
    let response;
    try {
      response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(provider.model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': provider.key },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json' } }),
      });
    } catch {
      lastError = new AnalysisError('AI is temporarily unreachable. Please click Analyze again shortly.', 503);
    }
    if (response?.ok) {
      try {
        const body = await response.json();
        const raw = body?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
        const result = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
        return validate ? validate(result) : result;
      } catch {
        lastError = new AnalysisError('AI returned an incomplete analysis. Please try again.');
      }
    }
    if (response) {
      if (!response.ok) lastError = [429, 500, 502, 503, 504].includes(response.status)
        ? new AnalysisError('AI is busy or temporarily unavailable. Please click Analyze again shortly.', 503)
        : new AnalysisError('AI configuration was rejected by the provider. Contact your administrator.', 502);
      if ([401, 403].includes(response.status) && !providers.slice(attempt + 1).some(next => next.key !== provider.key)) break;
    }
    if (attempt === 2) break;
    const retryAfter = Number(response?.headers?.get('retry-after')) || 0;
    await wait(Math.min(4000, Math.max(retryAfter * 1000, 1000 * 2 ** attempt + random() * 250)));
  }
  throw lastError || new AnalysisError('AI is temporarily unavailable. Please try again.', 503);
}

export function validatePrioritization(analysis, requests) {
  const summary = analysis?.executive_summary;
  if (!summary || !['summary', 'highest_risk_area', 'key_weather_factor'].every(key => typeof summary[key] === 'string')
    || !Array.isArray(summary.strategic_recommendations) || !summary.strategic_recommendations.every(value => typeof value === 'string')
    || !Array.isArray(analysis.prioritized_queue) || analysis.prioritized_queue.length !== requests.length) {
    throw new AnalysisError('AI returned an incomplete analysis. Please try again.');
  }
  const byId = new Map(requests.map(request => [request.id, request]));
  const seen = new Set();
  const queue = analysis.prioritized_queue.map((item, index) => {
    const request = byId.get(item.request_id);
    if (!request || seen.has(item.request_id) || !['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(item.priority_level)
      || !Number.isInteger(item.urgency_score) || item.urgency_score < 1 || item.urgency_score > 100
      || !['weather_impact_factor', 'ai_reasoning', 'recommended_action'].every(key => typeof item[key] === 'string')) {
      throw new AnalysisError('AI returned an invalid request ranking. Please try again.');
    }
    seen.add(item.request_id);
    return { ...item, rank: index + 1, municipality: request.municipality,
      requested_items: request.items.map(value => `${value.quantity}x ${value.name}`).join(', ') || 'No items recorded' };
  });
  return { executive_summary: summary, prioritized_queue: queue };
}

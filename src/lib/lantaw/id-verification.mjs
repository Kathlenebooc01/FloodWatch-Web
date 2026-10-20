const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function loadVerificationImage(url, supabaseUrl, serviceKey, fetchImpl = fetch) {
  if (!url) return null;
  const imageUrl = new URL(url, supabaseUrl);
  const storageOrigin = new URL(supabaseUrl).origin;
  if (imageUrl.origin !== storageOrigin || !imageUrl.pathname.startsWith('/storage/v1/object/')) {
    throw new Error('The submitted image URL is not in the configured storage.');
  }
  const response = await fetchImpl(imageUrl, {
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('A submitted image could not be loaded.');
  const contentLength = Number(response.headers.get('content-length'));
  if (contentLength > MAX_IMAGE_BYTES) throw new Error('A submitted image is too large to analyze.');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error('A submitted image is empty or too large.');
  const mimeType = response.headers.get('content-type')?.split(';')[0]?.toLowerCase();
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(mimeType)) {
    throw new Error('A submitted file is not a supported image.');
  }
  return { inlineData: { mimeType, data: bytes.toString('base64') } };
}

export function parseVerificationAssessment(raw) {
  const match = raw?.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const value = JSON.parse(match[0]);
    const score = Number(value.ai_confidence_score);
    if (typeof value.ai_is_valid !== 'boolean' || !Number.isFinite(score) || score < 0 || score > 100 ||
        typeof value.ai_insight !== 'string' || !value.ai_insight.trim()) return null;
    return { ai_is_valid: value.ai_is_valid, ai_confidence_score: score, ai_insight: value.ai_insight.trim() };
  } catch { return null; }
}

export async function assessVerification(parts, credentials, fetchImpl = fetch) {
  const attempts = [
    { key: credentials.primaryKey, model: credentials.primaryModel },
    { key: credentials.backupKey || credentials.primaryKey, model: credentials.backupModel },
    { key: credentials.thirdKey || credentials.backupKey || credentials.primaryKey, model: credentials.thirdModel },
  ].filter((attempt, index, all) => attempt.key && attempt.model &&
    all.findIndex(other => other.key === attempt.key && other.model === attempt.model) === index);
  if (!attempts.length) throw new Error('Lantaw AI is not configured. Contact your administrator.');
  const failures = [];
  for (const attempt of attempts) {
    try {
      const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(attempt.model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': attempt.key },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({ contents: [{ parts }], generationConfig: {
          responseMimeType: 'application/json', maxOutputTokens: 2048,
          ...(/^gemini-3(?:\.\d+)?-flash/.test(attempt.model) ? { thinkingConfig: { thinkingLevel: 'minimal' } } :
            /^gemini-2\.5-flash/.test(attempt.model) ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        } }),
      });
      if (!response.ok) {
        failures.push(`${attempt.model}: HTTP ${response.status}`);
        continue;
      }
      const body = await response.json();
      const raw = body.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('');
      const assessment = parseVerificationAssessment(raw);
      if (assessment) return assessment;
      failures.push(`${attempt.model}: ${body.candidates?.[0]?.finishReason || 'empty or invalid assessment'}`);
      } catch (error) {
        failures.push(`${attempt.model}: ${error.name === 'TimeoutError' ? 'timeout' : 'network or response error'}`);
    }
  }
  console.warn('ID verification Gemini attempts failed:', failures.join('; '));
  throw new Error('AI verification is temporarily unavailable. Please try again later.');
}

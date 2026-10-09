export async function generateChatAnswer(prompt, { model, apiKey, backupKey, backupModel, thirdKey, thirdModel, json = false, maxOutputTokens = 800, onChunk, fetchImpl = fetch } = {}) {
  if (!apiKey && !backupKey && !thirdKey) throw new Error('Lantaw AI is not configured. Contact your administrator.');
  const deadline = Date.now() + 16500;
  let emitted = false;
  // Every attempt receives the same prompt, including the same verified MCP context.
  // Distinct models avoid retrying an overloaded model with the same credentials.
  const attempts = [
    { model, key: apiKey || backupKey || thirdKey },
    { model: backupModel || 'gemini-3.5-flash-lite', key: backupKey || apiKey || thirdKey },
    { model: thirdModel || 'gemini-3.8-flash', key: thirdKey || backupKey || apiKey },
  ].filter((attempt, index, all) => attempt.model && attempt.key &&
    all.findIndex(other => other.model === attempt.model && other.key === attempt.key) === index);
  for (let index = 0; index < attempts.length; index++) {
    const current = attempts[index];
    let response;
    try {
      const thinkingConfig = /^gemini-3(?:\.\d+)?-flash/.test(current.model) ? { thinkingLevel: 'minimal' }
        : /^gemini-2\.5-flash/.test(current.model) ? { thinkingBudget: 0 } : undefined;
      response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(current.model)}:${onChunk ? 'streamGenerateContent?alt=sse' : 'generateContent'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': current.key },
        signal: AbortSignal.timeout(Math.max(1, Math.min(5500, deadline - Date.now()))),
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens, ...(json ? { responseMimeType: 'application/json' } : {}), ...(thinkingConfig ? { thinkingConfig } : {}) } }),
      });
      if (response.ok) {
        if (onChunk) {
          let answer = '';
          await readGeminiStream(response.body, part => {
            answer += part;
            emitted = true;
            onChunk(answer);
          });
          if (!answer.trim()) throw new Error('Lantaw could not produce an answer. Please try again.');
          return answer.trim();
        }
        const data = await response.json();
        if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') throw new Error('Lantaw response was incomplete. Please ask for a shorter answer.');
        const text = data.candidates?.[0]?.content?.parts?.filter(part => !part.thought).map(part => part.text || '').join('').trim();
        if (!text) throw new Error('Lantaw could not produce an answer. Please try again.');
        return text;
      }
      if (![400, 403, 404, 429, 500, 502, 503, 504].includes(response.status)) throw new Error('Lantaw AI configuration was rejected by the provider. Contact your administrator.');
    } catch (error) {
      if (emitted || response?.ok || (response && ![400, 403, 404, 429, 500, 502, 503, 504].includes(response.status))) throw error;
      if (index === attempts.length - 1) break;
    }
    if (Date.now() >= deadline) break;
  }
  throw new Error('Lantaw AI is temporarily busy. Please try again shortly.');
}

// Gemini sends SSE frames; network chunks need not align with lines or UTF-8 characters.
export async function readGeminiStream(body, onText) {
  if (!body) throw new Error('Lantaw returned an empty response.');
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const consume = line => {
    if (!line.startsWith('data:')) return;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') return;
    const data = JSON.parse(payload);
    if (data.error) throw new Error('Lantaw AI is temporarily busy. Please try again shortly.');
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.filter(part => !part.thought).map(part => part.text || '').join('');
    if (text) onText(text);
    if (candidate?.finishReason === 'MAX_TOKENS') throw new Error('Lantaw response was incomplete. Please ask for a shorter answer.');
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let newline;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        consume(buffer.slice(0, newline).replace(/\r$/, ''));
        buffer = buffer.slice(newline + 1);
      }
      if (done) break;
    }
    if (buffer.trim()) consume(buffer.trim());
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { generateChatAnswer } from '../src/lib/lantaw/chat-provider.mjs';
const ok = text => ({ ok: true, async json() { return { candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }] }; } });
test('chat uses a short generation budget and minimal supported thinking for Flash', async () => {
  const answer = await generateChatAnswer('question', { model: 'gemini-3.1-flash-lite', apiKey: 'test', fetchImpl: async (url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.generationConfig.maxOutputTokens, 800);
    assert.equal(body.generationConfig.thinkingConfig.thinkingLevel, 'minimal');
    assert.ok(!url.includes('key='));
    return ok('Concise answer');
  } });
  assert.equal(answer, 'Concise answer');
});
test('overload tries three distinct models and stops', async () => {
  let calls = 0;
  await assert.rejects(generateChatAnswer('question', { model: 'configured-model', apiKey: 'test',
    fetchImpl: async () => { calls++; return { ok: false, status: 503 }; } }), /temporarily busy/);
  assert.equal(calls, 3);
});
test('backup models receive the same MCP grounded prompt and remain private', async () => {
  const calls = [];
  const answer = await generateChatAnswer('Verified MCP context: {"aqi":42}', {
    model: 'main-model', apiKey: 'main-key', backupModel: 'backup-model', backupKey: 'backup-key',
    thirdModel: 'third-model', thirdKey: 'third-key',
    fetchImpl: async (url, options) => {
      calls.push({ url, key: options.headers['x-goog-api-key'], prompt: JSON.parse(options.body).contents[0].parts[0].text });
      return calls.length < 3 ? { ok: false, status: 429 } : ok('AQI is 42.');
    },
  });
  assert.equal(answer, 'AQI is 42.');
  assert.deepEqual(calls.map(call => call.key), ['main-key', 'backup-key', 'third-key']);
  assert.ok(calls.every(call => call.prompt === calls[0].prompt));
  assert.ok(calls.every(call => !call.url.includes('key=')));
});
test('unsupported model configuration fails immediately and incomplete text is not accepted', async () => {
  let calls = 0;
  await assert.rejects(generateChatAnswer('question', { model: 'configured-model', apiKey: 'test', fetchImpl: async () => { calls++; return { ok: false, status: 401 }; } }), /configuration/);
  assert.equal(calls, 1);
  await assert.rejects(generateChatAnswer('question', { model: 'configured-model', apiKey: 'test', fetchImpl: async () => ({ ok: true,
    async json() { return { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'Partial' }] } }] }; } }) }), /incomplete/);
});

test('streamed output reaches the caller before generation completes across fragmented frames', async () => {
  const encoder = new TextEncoder();
  const updates = [];
  let finish;
  const gate = new Promise(resolve => { finish = resolve; });
  const body = new ReadableStream({ async start(controller) {
    const first = 'data: ' + JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Flood ' }] } }] }) + '\n\n';
    controller.enqueue(encoder.encode(first.slice(0, 17)));
    controller.enqueue(encoder.encode(first.slice(17)));
    await gate;
    controller.enqueue(encoder.encode('data: ' + JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'safety.' }] } }] }) + '\n\n'));
    controller.close();
  } });
  const answer = await generateChatAnswer('flood safety', { model: 'gemini-3.1-flash-lite', apiKey: 'test',
    onChunk: content => { updates.push(content); if (updates.length === 1) finish(); },
    fetchImpl: async url => { assert.match(url, /streamGenerateContent\?alt=sse/); return { ok: true, body }; } });
  assert.deepEqual(updates, ['Flood ', 'Flood safety.']);
  assert.equal(answer, 'Flood safety.');
});
test('a failed partial stream never retries and duplicates an answer', async () => {
  let calls = 0;
  const body = new ReadableStream({ start(controller) {
    controller.enqueue(new TextEncoder().encode('data: ' + JSON.stringify({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'Partial' }] } }] }) + '\n\n'));
    controller.close();
  } });
  await assert.rejects(generateChatAnswer('question', { model: 'configured-model', apiKey: 'test', onChunk() {},
    fetchImpl: async () => { calls++; return { ok: true, body }; } }), /incomplete/);
  assert.equal(calls, 1);
});

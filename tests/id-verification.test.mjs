import test from 'node:test';
import assert from 'node:assert/strict';
import { assessVerification, loadVerificationImage } from '../src/lib/lantaw/id-verification.mjs';

test('loads only submitted Supabase storage images as Gemini inline data', async () => {
  const image = await loadVerificationImage('https://example.supabase.co/storage/v1/object/public/ids/a.png',
    'https://example.supabase.co', 'service-key', async (_url, options) => {
      assert.equal(options.headers.Authorization, 'Bearer service-key');
      return new Response(Buffer.from([137, 80, 78, 71]), { headers: { 'content-type': 'image/png' } });
    });
  assert.equal(image.inlineData.mimeType, 'image/png');
  assert.equal(image.inlineData.data, 'iVBORw==');
  await assert.rejects(loadVerificationImage('https://evil.example/id.png', 'https://example.supabase.co', 'key'),
    /configured storage/);
});

test('malformed primary assessment retries with configured backup key and image', async () => {
  const seen = [];
  const parts = [{ text: 'Review this ID' }, { inlineData: { mimeType: 'image/png', data: 'aWQ=' } }];
  const result = await assessVerification(parts, {
    primaryKey: 'primary', primaryModel: 'first', backupKey: 'backup', backupModel: 'second',
  }, async (url, options) => {
    seen.push({ url: String(url), key: options.headers['x-goog-api-key'], parts: JSON.parse(options.body).contents[0].parts });
    return Response.json({ candidates: [{ content: { parts: [{ text: seen.length === 1 ? 'bad json' :
      '{"ai_is_valid":false,"ai_confidence_score":30,"ai_insight":"Needs manual review."}' }] } }] });
  });
  assert.equal(result.ai_is_valid, false);
  assert.deepEqual(seen.map(call => call.key), ['primary', 'backup']);
  assert.deepEqual(seen[1].parts, parts);
});

test('provider HTTP failures reach a third model and use a sufficient response budget', async () => {
  const calls = [];
  const result = await assessVerification([{ text: 'Review' }], {
    primaryKey: 'primary', primaryModel: 'gemini-3.1-flash-lite',
    backupKey: 'backup',
  }, async (_url, options) => {
    const request = JSON.parse(options.body);
    calls.push({ key: options.headers['x-goog-api-key'], config: request.generationConfig, url: String(_url) });
    if (calls.length < 3) return new Response('{}', { status: 429 });
    return Response.json({ candidates: [{ content: { parts: [{ text:
      '{"ai_is_valid":false,"ai_confidence_score":20,"ai_insight":"Image is unclear."}' }] } }] });
  });
  assert.equal(result.ai_is_valid, false);
  assert.deepEqual(calls.map(call => call.key), ['primary', 'primary', 'backup']);
  assert.match(calls[2].url, /gemini-3\.5-flash-lite/);
  assert.equal(calls[0].config.thinkingConfig.thinkingLevel, 'minimal');
  assert.equal(calls[0].config.maxOutputTokens, 2048);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePrioritization, validatePrioritization } from '../src/lib/lantaw/gemini-prioritization.mjs';

const ok = body => ({ ok: true, async json() { return { candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }] }; } });
const busy = status => ({ ok: false, status, headers: { get() { return null; } } });
const options = { apiKey: 'test', model: 'configured-model', random: () => 0 };
test('503/429 retries use backoff and eventually return real model output', async () => {
  const responses = [busy(503), busy(429), ok({ result: 'actual response' })];
  const waits = [];
  const result = await generatePrioritization('prompt', { ...options, fetchImpl: async () => responses.shift(), wait: async ms => waits.push(ms) });
  assert.deepEqual(waits, [1000, 2000]);
  assert.equal(result.result, 'actual response');
});
test('persistent overload has bounded retries and a recoverable sanitized 503', async () => {
  let calls = 0;
  await assert.rejects(generatePrioritization('prompt', { ...options, fetchImpl: async () => { calls++; return busy(503); }, wait: async () => {} }),
    error => error.status === 503 && !error.message.includes('Gemini API error'));
  assert.equal(calls, 3);
});
test('nontransient provider errors do not retry; optional configured model can recover', async () => {
  let calls = 0;
  await assert.rejects(generatePrioritization('prompt', { ...options, fetchImpl: async () => { calls++; return busy(403); } }), error => error.status === 502);
  assert.equal(calls, 1);
  const urls = [];
  await generatePrioritization('prompt', { ...options, fallbackModel: 'configured-fallback', wait: async () => {},
    fetchImpl: async url => { urls.push(url); return urls.length === 1 ? busy(503) : ok({ done: true }); } });
  assert.match(urls[1], /configured-fallback/);
  assert.ok(!urls[0].includes('key='));
});
test('missing key fails before making a provider request', async () => {
  await assert.rejects(generatePrioritization('prompt', { fetchImpl: () => { throw new Error('must not fetch'); } }), error => error.status === 503);
});
test('network failures retry; malformed provider responses remain errors, never fabricated results', async () => {
  let calls = 0;
  const result = await generatePrioritization('prompt', { ...options, wait: async () => {}, fetchImpl: async () => {
    if (++calls === 1) throw new TypeError('network failure');
    return ok({ recovered: true });
  } });
  assert.equal(result.recovered, true);
  await assert.rejects(generatePrioritization('prompt', { ...options,
    fetchImpl: async () => ({ ok: true, async json() { throw new SyntaxError('incomplete JSON'); } }) }), error => error.status === 502);
});
const requests = [{ id: 'full-uuid', municipality: 'Real Municipality', items: [{ name: 'Rescue Boat', quantity: 2 }] }];
const valid = () => ({ executive_summary: { summary: 'Summary', highest_risk_area: 'Real Municipality', key_weather_factor: 'Unknown', strategic_recommendations: [] },
  prioritized_queue: [{ request_id: 'full-uuid', urgency_score: 90, priority_level: 'HIGH', weather_impact_factor: 'Unavailable', ai_reasoning: 'Urgent', recommended_action: 'Review', municipality: 'Invented', requested_items: 'Invented' }] });
test('queue identity and supplies come from the database; hallucinated IDs and incomplete rankings reject', () => {
  const result = validatePrioritization(valid(), requests);
  assert.equal(result.prioritized_queue[0].municipality, 'Real Municipality');
  assert.equal(result.prioritized_queue[0].requested_items, '2x Rescue Boat');
  const bad = valid(); bad.prioritized_queue[0].request_id = 'invented';
  assert.throws(() => validatePrioritization(bad, requests));
  assert.throws(() => validatePrioritization({ ...valid(), prioritized_queue: [] }, requests));
  const score = valid(); score.prioritized_queue[0].urgency_score = 200;
  assert.throws(() => validatePrioritization(score, requests));
});

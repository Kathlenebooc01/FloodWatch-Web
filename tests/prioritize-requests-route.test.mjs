import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import * as domain from '../src/lib/domain-values.mjs';
import { AnalysisError, validatePrioritization } from '../src/lib/lantaw/gemini-prioritization.mjs';
const require = createRequire(import.meta.url);
const { transform, loadBindings } = require('next/dist/build/swc');
await loadBindings();
const { code } = await transform(fs.readFileSync(new URL('../src/app/api/lantaw/prioritize-requests/route.js', import.meta.url), 'utf8'), {
  jsc: { parser: { syntax: 'ecmascript' }, target: 'es2020' }, module: { type: 'commonjs' },
});

function setup({ role = 'national_admin', rows = [], queryError = null, profileError = null, generator } = {}) {
  const calls = [], prompts = [];
  const db = {
    auth: { async getUser() { return { data: { user: { id: 'admin' } } }; } },
    from(table) {
      calls.push(table);
      return {
        select() { return this; }, eq() { return this; }, in() { return this; }, order() { return this; },
        async single() { return { data: { role }, error: profileError }; },
        async limit() { return { data: rows, error: queryError, count: rows.length }; },
      };
    },
  };
  const compiledModule = { exports: {} };
  const next = { NextResponse: { json(body, options = {}) { return { body, status: options.status || 200, headers: options.headers }; } } };
  const helpers = { AnalysisError, validatePrioritization, async generatePrioritization(prompt) {
    prompts.push(prompt);
    return generator ? generator() : { executive_summary: { summary: 'Real analysis', highest_risk_area: 'Real municipality', key_weather_factor: 'Unknown', strategic_recommendations: [] },
      prioritized_queue: rows.map(row => ({ request_id: row.request_id, priority_level: 'HIGH', urgency_score: 85, weather_impact_factor: 'Unknown', ai_reasoning: 'Requested urgency', recommended_action: 'Review' })) };
  } };
  new Function('require', 'module', 'exports', 'fetch', 'process', code)(name => {
    if (name === 'next/server') return next;
    if (name === '@supabase/supabase-js') return { createClient: () => db };
    return name.includes('domain-values') ? domain : helpers;
  }, compiledModule, compiledModule.exports, () => { throw new Error('Unexpected weather network request'); },
  { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://test.invalid', NEXT_SERVICE_ROLE_KEY: 'test', GEMINI_LANTAW_AI: 'test' } });
  return { POST: compiledModule.exports.POST, calls, prompts };
}
const request = (token = 'Bearer test') => ({ headers: { get() { return token; } } });
test('analysis API accepts signed-in admins and rejects non-admin accounts', async () => {
  assert.equal((await setup().POST(request(null))).status, 401);
  for (const role of ['lgu_headmaster', 'citizen', 'unknown']) {
    const route = setup({ role });
    assert.equal((await route.POST(request())).status, 403);
    assert.equal(route.prompts.length, 0);
  }
  assert.equal((await setup({ role: 'provincial_admin' }).POST(request())).status, 200);
});
test('a failed profile lookup is a temporary verification failure, not an access denial', async () => {
  const route = setup({ profileError: { message: 'Network failure' } });
  const res = await route.POST(request());
  assert.equal(res.status, 503);
  assert.match(res.body.error, /verify your admin account/);
  assert.equal(route.prompts.length, 0);
});
test('empty database returns an empty result without sample requests or AI calls', async () => {
  const route = setup({ role: 'National Admin' });
  const res = await route.POST(request());
  assert.equal(res.status, 200);
  assert.equal(res.body.data.total_requests_analyzed, 0);
  assert.deepEqual(res.body.data.prioritized_queue, []);
  assert.equal(route.prompts.length, 0);
});
test('database errors and exhausted provider retries return recoverable 503 responses', async () => {
  const database = setup({ queryError: { message: 'database unavailable' } });
  assert.equal((await database.POST(request())).status, 503);
  assert.equal(database.prompts.length, 0);
  const provider = setup({ rows: [{ request_id: 'real-id', status: 'Pending' }], generator: () => { throw new AnalysisError('AI is busy', 503); } });
  const res = await provider.POST(request());
  assert.equal(res.status, 503);
  assert.equal(res.headers['Retry-After'], '10');
});
test('real request IDs and supplies are retained and missing weather is explicitly unavailable', async () => {
  const route = setup({ rows: [{ request_id: 'complete-real-id', status: 'pending', request_reason: 'HIGH Urgency Request',
    municipality_or_city: { name: 'Real municipality' }, resource_request_items: [{ quantity_requested: 3, utilities: { name: 'Life Vest', type: 'Safety' } }] }] });
  const res = await route.POST(request());
  assert.equal(res.status, 200);
  assert.equal(res.body.data.prioritized_queue[0].request_id, 'complete-real-id');
  assert.equal(res.body.data.prioritized_queue[0].requested_items, '3x Life Vest');
  assert.ok(res.body.data.weather_telemetry.every(station => station.available === false && station.rain_1h_mm === null));
  assert.match(route.prompts[0], /complete-real-id/);
});
test('concurrent analysis calls share one provider execution and subsequent clicks analyze again', async () => {
  let release, entered;
  const started = new Promise(resolve => { entered = resolve; });
  const pending = new Promise(resolve => { release = resolve; });
  const result = { executive_summary: { summary: 'Summary', highest_risk_area: '', key_weather_factor: '', strategic_recommendations: [] },
    prioritized_queue: [{ request_id: 'id', priority_level: 'HIGH', urgency_score: 80, weather_impact_factor: '', ai_reasoning: '', recommended_action: '' }] };
  const route = setup({ rows: [{ request_id: 'id', status: 'Pending' }], generator: async () => { entered(); return pending; } });
  const first = route.POST(request()), second = route.POST(request());
  await started;
  release(result);
  const responses = await Promise.all([first, second]);
  assert.ok(responses.every(response => response.status === 200));
  assert.equal(route.prompts.length, 1);
  await route.POST(request());
  assert.equal(route.prompts.length, 2);
});

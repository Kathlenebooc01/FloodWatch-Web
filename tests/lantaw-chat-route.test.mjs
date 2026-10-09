import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import * as tools from '../src/lib/lantaw/chat-tools.mjs';
const require = createRequire(import.meta.url);
const { transform, loadBindings } = require('next/dist/build/swc');
await loadBindings();
const { code } = await transform(fs.readFileSync(new URL('../src/app/api/lantaw/route.js', import.meta.url), 'utf8'), {
  jsc: { parser: { syntax: 'ecmascript' }, target: 'es2022' }, module: { type: 'commonjs' },
});
function setup({ weather, toolError } = {}) {
  const calls = [], generated = [], background = [];
  const compiledModule = { exports: {} };
  new Function('require', 'module', 'exports', 'process', code)(name => {
    if (name === 'next/server') return { NextResponse: { json(body, options = {}) { return { body, status: options.status || 200, async json() { return body; } }; } }, after: fn => background.push(fn) };
    if (name === '@supabase/supabase-js') return { createClient: () => { throw new Error('Unexpected direct database query'); } };
    if (name.includes('apiLogger')) return { logAiSuccess() {}, logAiError() {} };
    if (name.includes('chat-tools')) return tools;
    if (name.includes('chat-provider')) return { async generateChatAnswer(prompt, options) { options.onChunk?.('Grounded'); generated.push(prompt); return 'Grounded concise answer'; } };
    if (name.includes('mcp-client')) return { async callLantawTool(tool, args) {
      calls.push({ tool, args });
      if (toolError) throw new Error(toolError);
      return tool === 'get_municipality_weather' ? weather : tool === 'get_monitoring_snapshot'
        ? { municipality: 'Cebu City', air: { aqi: 72, status: 'Moderate', observed_at: '2026-09-21T07:41:40Z', freshness: 'historical' },
          weather: { temperature_c: 32, observed_at: '2026-10-09T03:00:00Z', freshness: 'recent' },
          heat: { heat_index_c: 39, observed_at: '2026-10-09T03:00:00Z', freshness: 'recent' }, hazards: { alerts: [] } }
        : { source: 'incident_report', sample_limit: 20, records: [] };
    } };
    throw new Error('Unexpected import ' + name);
  }, compiledModule, compiledModule.exports, { env: {} });
  return { POST: compiledModule.exports.POST, calls, generated, background };
}
const request = (prompt, extra = {}) => ({ async json() { return { prompt, ...extra }; } });
test('greetings and unrelated arithmetic use the scoped AI rather than canned local answers', async () => {
 const route = setup();
 await route.POST(request('1+1'));
 await route.POST(request('HELLO'));
 assert.equal(route.calls.length, 0);
 assert.equal(route.generated.length, 2);
 assert.match(route.generated[0], /including standalone arithmetic/);
 assert.match(route.generated[0], /without answering the unrelated question/);
 assert.equal(route.background.length, 2);
});
test('temperature questions call the actual weather tool and return its verified reading', async () => {
  const route = setup({ weather: { available: true, municipality: 'Lapu-Lapu City', temperature_c: 29.2,
    condition: 'Cloudy', source: 'FloodWatch weather telemetry', observed_at: '2026-10-08T03:00:00Z' } });
  const result = await route.POST(request('temperature lapu lapu city todayu', { history: [{ role: 'user', content: 'Cebu City' }] }));
  assert.match(result.body.response, /Lapu-Lapu City: 29.2°C/);
  assert.equal(route.generated.length, 0);
  assert.equal(route.calls[0].args.municipality_name, 'temperature lapu lapu city todayu');
});
test('report questions query only relevant MCP context and preserve bounded conversation history', async () => {
  const route = setup();
  const res = await route.POST(request('show recent flood reports', { history: [{ role: 'user', content: 'Lapu-Lapu City' }] }));
  assert.equal(res.status, 200);
  assert.equal(route.calls[0].tool, 'get_floodwatch_chat_context');
  assert.equal(route.calls[0].args.topic, 'reports');
  assert.match(route.generated[0], /Lapu-Lapu City/);
  assert.ok(!route.generated[0].includes('SPREADSHEET GENERATION'));
});
test('air quality today uses Monitoring data and labels old readings', async () => {
  const route = setup();
  const result = await route.POST(request('cebu city air quality today'));
  assert.equal(route.calls[0].tool, 'get_monitoring_snapshot');
  assert.match(result.body.response, /historical air quality/);
  assert.match(result.body.response, /AQI 72/);
  assert.equal(route.generated.length, 0);
});
test('unavailable weather and MCP failure never turn into fabricated factual responses', async () => {
  const route = setup({ weather: { available: false, message: 'Current weather is unavailable.' } });
  assert.equal((await route.POST(request('Lapu-Lapu weather'))).body.response, 'Current weather is unavailable.');
  assert.equal(route.generated.length, 0);
  const failure = setup({ toolError: 'Weather data is temporarily unavailable.' });
  const failedWeather = await failure.POST(request('Lapu-Lapu weather'));
  assert.equal(failedWeather.status, 200);
  assert.match(failedWeather.body.response, /temporarily unavailable/);
  assert.equal(failure.generated.length, 0);
  const failedReports = await failure.POST(request('recent flood reports'));
  assert.match(failedReports.body.response, /temporarily unavailable/);
  assert.equal(failure.generated.length, 0);
});

test('streaming endpoint sends real partial output and a final answer while preserving scope', async () => {
  const route = setup();
  const req = request('flood safety');
  req.headers = new Headers({ Accept: 'application/x-ndjson' });
  const response = await route.POST(req);
  assert.match(response.headers.get('content-type'), /application\/x-ndjson/);
  const events = (await response.text()).trim().split('\n').map(JSON.parse);
  assert.equal(events[0].type, 'partial');
  assert.equal(events[0].response, 'Grounded');
  assert.equal(events[1].type, 'done');
  assert.match(route.generated[0], /Stay strictly within FloodWatch/);
});

test('mixed weather and report questions retain both backend contexts', async () => {
  const route = setup({ weather: { available: true, municipality: 'Lapu-Lapu City', temperature_c: 29 } });
  await route.POST(request('Lapu-Lapu weather and recent reports'));
  assert.equal(route.calls[0].tool, 'get_municipality_weather');
  assert.deepEqual(route.calls[1].args.topics, ['reports']);
  assert.match(route.generated[0], /municipality_weather/);
  assert.match(route.generated[0], /incident_report/);
});

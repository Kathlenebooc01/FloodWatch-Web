import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { chatTopic, chatTopics, sanitizeContext, getMunicipalityWeather, weatherReply, getChatContext, registerChatTools } from '../src/lib/lantaw/chat-tools.mjs';
import { callLantawTool } from '../src/lib/lantaw/mcp-client.mjs';

const now = Date.parse('2026-10-08T03:00:00Z');
const municipalities = [{ municipality_id: 'lapu-id', name: 'Lapu-Lapu City' }, { municipality_id: 'cebu-id', name: 'Cebu City' }];
function db(rows = [], fail = false, locations = municipalities) {
  const calls = [];
  return { calls, from(table) {
    const filters = {};
    calls.push({ table, filters });
    return { select() { return this; }, eq(key, value) { filters[key] = value; return this; }, order() { return this; },
      async limit() { return { data: table === 'municipality_or_city' ? locations : rows.filter(row => !filters.municipality_id || row.municipality_id === filters.municipality_id), error: fail ? { message: 'unavailable' } : null }; } };
  } };
}
test('weather questions select the weather tool category', () => {
 assert.equal(chatTopic('temperature lapu lapu city todayu'), 'weather');
  assert.equal(chatTopic('Explain flood safety in one sentence.'), 'guidance');
  assert.equal(chatTopic('show recent flood reports'), 'reports');
});
test('Lapu-Lapu weather is looked up by its real municipality ID and never uses Cebu readings', async () => {
  const backend = db([
    { municipality_id: 'cebu-id', temperature: 40, fetched_at: new Date(now).toISOString() },
    { municipality_id: 'lapu-id', temperature: 29.5, weather_condition: 'Cloudy', fetched_at: new Date(now - 60000).toISOString() },
  ]);
  const weather = await getMunicipalityWeather(backend, 'temperature lapu lapu city todayu', { now });
  assert.equal(weather.municipality, 'Lapu-Lapu City');
  assert.equal(weather.temperature_c, 29.5);
  assert.equal(backend.calls[1].filters.municipality_id, 'lapu-id');
  assert.ok(!JSON.stringify(weather).includes('lapu-id'));
  assert.match(weatherReply(weather), /29.5°C/);
});
test('stale readings are clearly labelled; valid live weather can replace them', async () => {
  const backend = db([{ municipality_id: 'lapu-id', temperature: 10, fetched_at: new Date(now - 86400000).toISOString() }]);
  const stored = await getMunicipalityWeather(backend, 'Lapu-Lapu', { now });
  assert.equal(stored.freshness, 'stale');
  assert.match(weatherReply(stored), /not current weather/);
  const fresh = await getMunicipalityWeather(backend, 'Lapu-Lapu', { now, weatherKey: 'test', fetchImpl: async url => {
    assert.equal(url.searchParams.get('q'), 'Lapu-Lapu City,PH');
    return { ok: true, async json() { return { main: { temp: 30 }, name: 'Lapu-Lapu City', sys: { country: 'PH' }, dt: now / 1000, weather: [{ description: 'Light rain' }] }; } };
  } });
  assert.equal(fresh.temperature_c, 30);
  assert.equal(fresh.source, 'OpenWeather');
});
test('wrong-location live weather and backend failures never become fabricated readings', async () => {
  const weather = await getMunicipalityWeather(db(), 'Lapu-Lapu', { now, weatherKey: 'test', fetchImpl: async () => ({ ok: true,
    async json() { return { main: { temp: 30 }, name: 'Cebu City', sys: { country: 'PH' }, dt: now / 1000 }; } }) });
  assert.equal(weather.available, false);
  await assert.rejects(getMunicipalityWeather(db([], true), 'Lapu-Lapu', { now }), /temporarily unavailable/);
  assert.equal((await getMunicipalityWeather(db(), 'weather today', { now })).needs_location, true);
});
test('chat context queries only the relevant table and strips UUIDs and contact fields', async () => {
  const backend = db([{ report_id: 'internal-id', municipality_or_city: { name: 'Lapu-Lapu City' }, mobile_number: 'private',
    description: 'province cafaab15-5574-4149-be52-539448a6460b', status: 'Verified' }]);
  const context = await getChatContext(backend, 'reports');
  assert.deepEqual(backend.calls.map(call => call.table), ['incident_report']);
  assert.ok(!JSON.stringify(context).includes('cafaab15'));
  assert.ok(!JSON.stringify(context).includes('private'));
  assert.equal(context.records[0].municipality_or_city.name, 'Lapu-Lapu City');
  assert.deepEqual(sanitizeContext({ user_id: 'secret', full_name: 'Officer', status: 'Pending' }), { full_name: 'Officer', status: 'Pending' });
});
test('actual MCP protocol advertises the tools and executes a municipality-specific weather call', async () => {
  const server = new McpServer({ name: 'test-lantaw', version: '1.0.0' });
  registerChatTools(server, { db: db([{ municipality_id: 'lapu-id', temperature: 29, fetched_at: new Date(now).toISOString() }]), now });
  const client = new Client({ name: 'test-web-chat', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport); await client.connect(clientTransport);
  try {
    const listed = await client.listTools();
    assert.ok(listed.tools.some(tool => tool.name === 'get_municipality_weather'));
    const response = await client.callTool({ name: 'get_municipality_weather', arguments: { municipality_name: 'Lapu-Lapu City' } });
    assert.equal(JSON.parse(response.content[0].text).temperature_c, 29);
  } finally { await client.close(); await server.close(); }
});
test('web MCP bridge reuses a real connection to the configured server', async () => {
  assert.deepEqual(await callLantawTool('get_floodwatch_chat_context', { topic: 'guidance' }), {});
  assert.deepEqual(await callLantawTool('get_floodwatch_chat_context', { topic: 'guidance' }), {});
});

test('multi-topic questions retrieve all relevant categories and disclose individual source failures', async () => {
  assert.deepEqual(chatTopics('weather and emergency requests and inventory'), ['weather', 'requests', 'inventory']);
  assert.ok(chatTopics('overview of everything in FloodWatch').includes('air'));
  const backend = db();
  const context = await getChatContext(backend, ['reports', 'inventory', 'air', 'reports']);
  assert.deepEqual(backend.calls.map(call => call.table), ['incident_report', 'pdrrmo_inventory', 'air_quality']);
  assert.equal(context.categories.length, 3);
  const unavailable = await getChatContext(db([], true), ['reports', 'air']);
  assert.ok(unavailable.categories.every(category => category.available === false));
});
test('weather uses registered coordinates when the provider labels the station with another nearby city name', async () => {
  const backend = db([], false, [{ municipality_id: 'lapu-id', name: 'Lapu-Lapu City', center_latitude: '10.31', center_longitude: '123.95' }]);
  const weather = await getMunicipalityWeather(backend, 'Lapu-Lapu weather today', { now, weatherKey: 'test', fetchImpl: async url => {
    assert.equal(url.searchParams.get('lat'), '10.31');
    assert.equal(url.searchParams.get('lon'), '123.95');
    assert.equal(url.searchParams.has('q'), false);
    return { ok: true, async json() { return { main: { temp: 30 }, name: 'Mactan', coord: { lat: 10.31, lon: 123.95 }, sys: { country: 'PH' }, dt: now / 1000 }; } };
  } });
  assert.equal(weather.available, true);
  assert.equal(weather.municipality, 'Lapu-Lapu City');
  assert.equal(weather.source, 'OpenWeather');
});
test('numeric database readings and their actual expiry remain usable', async () => {
  const backend = db([{ municipality_id: 'lapu-id', temperature: '29.5', fetched_at: new Date(now - 1200000).toISOString(), expires_at: new Date(now + 60000).toISOString() }]);
  const weather = await getMunicipalityWeather(backend, 'Lapu-Lapu weather', { now });
  assert.equal(weather.temperature_c, 29.5);
  assert.equal(weather.freshness, 'current');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { pm25Aqi, calculateNowCast, fetchOpenAqReading, syncOpenAqAir } from '../src/lib/monitoring/openAqAir.mjs';

const now = Date.parse('2026-10-11T14:10:00Z');
const hour = (age, value) => ({ value, parameter: { name: 'pm25', units: 'µg/m³' },
  period: { datetimeTo: { utc: new Date(Date.parse('2026-10-11T14:00:00Z') - age * 3600000).toISOString() } } });

test('uses current EPA PM2.5 boundaries and truncation', () => {
  assert.equal(pm25Aqi(9), 50);
  assert.equal(pm25Aqi(35.4), 100);
  assert.equal(pm25Aqi(55.5), 151);
  assert.equal(pm25Aqi(225.5), 301);
  assert.equal(pm25Aqi(325.4), 500);
  assert.equal(pm25Aqi(35.49), 100);
  assert.equal(pm25Aqi(null), null);
});

test('NowCast preserves missing clock hours and needs two of latest three', () => {
  const result = calculateNowCast([hour(0, 20), hour(2, 80)], now);
  assert.equal(result.concentration, 32);
  assert.equal(calculateNowCast([hour(0, 20), hour(3, 80)], now), null);
  assert.equal(calculateNowCast([hour(0, 0), hour(1, 0)], now).aqi, 0);
  assert.equal(calculateNowCast([{ ...hour(0, 20), flagInfo: { hasFlags: true } }, hour(1, 20)], now), null);
});

test('retains measured concentration separately from calculated NowCast AQI', async () => {
  const fetcher = async url => ({ ok: true, json: async () => ({ results: url.includes('/latest')
    ? [{ sensorsId: 17002975, locationsId: 6455462, value: 43, datetime: { utc: '2026-10-11T14:02:25Z' } }]
    : [hour(0, 60), hour(1, 60), hour(2, 60)] }) });
  const reading = await fetchOpenAqReading('test-key', { now, fetcher });
  assert.equal(reading.pm2_5, 43);
  assert.equal(reading.aqi, 154);
  assert.equal(reading.air_station, 'Lapu-Lapu City');
  assert.match(reading.status, /OpenAQ/);
  await assert.rejects(fetchOpenAqReading('test-key', { now: now + 7 * 3600000, fetcher }), /within six hours/);
});

test('accepts a delayed observation with its original timestamp and enough historical hours', async () => {
  const delayedNow = now + 4 * 3600000;
  const requested = [];
  const fetcher = async url => {
    requested.push(url);
    return { ok: true, json: async () => ({ results: url.includes('/latest')
      ? [{ sensorsId: 17002975, locationsId: 6455462, value: 43, datetime: { utc: '2026-10-11T14:02:25Z' } }]
      : [hour(0, 60), hour(2, 60)] }) };
  };
  const reading = await fetchOpenAqReading('test-key', { now: delayedNow, fetcher });
  assert.equal(reading.recorded_at, '2026-10-11T14:02:25.000Z');
  assert.equal(reading.aqi, 154);
  assert.match(requested[1], /2026-10-11T14%3A00%3A00/);
  await assert.rejects(fetchOpenAqReading('test-key', { now: now + 6 * 3600000 + 1, fetcher }), /within six hours/);
});

test('rejects delayed observations without two valid hourly samples among the latest three', async () => {
  const fetcher = async url => ({ ok: true, json: async () => ({ results: url.includes('/latest')
    ? [{ sensorsId: 17002975, locationsId: 6455462, value: 43, datetime: { utc: '2026-10-11T14:02:25Z' } }]
    : [hour(0, 60), hour(3, 60)] }) });
  await assert.rejects(fetchOpenAqReading('test-key', { now: now + 4 * 3600000, fetcher }), /Not enough recent hourly data/);
});

test('existing tagged observation is not inserted again', async () => {
  const originalFetch = globalThis.fetch;
  const originalInfo = console.info;
  globalThis.fetch = async url => ({ ok: true, json: async () => ({ results: url.includes('/latest')
    ? [{ sensorsId: 17002975, locationsId: 6455462, value: 43, datetime: { utc: new Date(Date.now() - 3600000).toISOString() } }]
    : [{ value: 20, parameter: { name: 'pm25', units: 'µg/m³' }, period: { datetimeTo: { utc: new Date(Math.floor((Date.now() - 3600000) / 3600000) * 3600000).toISOString() } } },
      { value: 20, parameter: { name: 'pm25', units: 'µg/m³' }, period: { datetimeTo: { utc: new Date(Math.floor((Date.now() - 7200000) / 3600000) * 3600000).toISOString() } } }] }) });
  console.info = () => {};
  let inserts = 0;
  const db = { from(table) {
    assert.equal(table, 'air_quality');
    const query = { select: () => query, eq: () => query, limit: async () => ({ data: [{ id: 1, aqi: pm25Aqi(20) }] }), insert: async () => { inserts++; return {}; },
      update: () => query };
    return query;
  } };
  try {
    const result = await syncOpenAqAir(db, [{ municipality_id: 'lapu', name: 'Lapu-Lapu City' }], 'test-key');
    assert.equal(result.status, 'existing');
    assert.equal(inserts, 0);
  } finally {
    globalThis.fetch = originalFetch;
    console.info = originalInfo;
  }
});

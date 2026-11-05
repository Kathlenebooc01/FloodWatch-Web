import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { aqiLevel } from '../src/lib/monitoring/aqiClassification.mjs';
import { isCurrentAirReading } from '../src/lib/monitoring/airQualityFreshness.js';

const route = await readFile(new URL('../src/app/api/monitoring/air/route.js', import.meta.url), 'utf8');
const makeGet = new Function('NextResponse', 'createClient', 'aqiLevel', 'getLatestAirQuality', 'isCurrentAirReading',
  route.replace(/^import .*;\r?\n/gm, '').replace('export async function GET()', 'return async function GET()'));

test('air reading freshness includes the two-hour boundary and rejects future or invalid dates', () => {
  const now = Date.parse('2026-11-05T12:00:00Z');
  assert.equal(isCurrentAirReading('2026-11-05T10:00:00Z', now), true);
  assert.equal(isCurrentAirReading('2026-11-05T09:59:59.999Z', now), false);
  assert.equal(isCurrentAirReading('2026-11-05T12:00:00.001Z', now), false);
  assert.equal(isCurrentAirReading('invalid', now), false);
  assert.equal(isCurrentAirReading(null, now), false);
});

test('air route returns latest rows, marks only recent timestamps current, and logs mismatches', async () => {
  const now = Date.now();
  const municipalities = ['recent', 'old', 'future', 'invalid', 'missing'].map(municipality_id =>
    ({ municipality_id, name: municipality_id, province_id: 1, center_latitude: 10, center_longitude: 123 }));
  const readings = [
    { municipality_id: 'recent', recorded_at: new Date(now - 60_000).toISOString(), aqi: 151, status: 'Good | OpenAQ:6455462;Clarity;PM2.5 NowCast', pm2_5: 80 },
    { municipality_id: 'old', recorded_at: new Date(now - 2 * 60 * 60_000 - 1000).toISOString(), aqi: 72, status: 'Moderate' },
    { municipality_id: 'future', recorded_at: new Date(now + 60_000).toISOString(), aqi: 30, status: 'Good' },
    { municipality_id: 'invalid', recorded_at: 'invalid', aqi: 30, status: 'Good' },
  ];
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args);
  try {
    const db = { from(table) {
      if (table === 'municipality_or_city') return { select: async () => ({ data: municipalities }) };
      if (table === 'weather_telemetry') {
        const query = { select: () => query, order: () => query, limit: async () => ({ data: [] }) };
        return query;
      }
      throw new Error(`Unexpected table: ${table}`);
    } };
    const getLatestAirQuality = async (client, munis) => {
      assert.equal(client, db);
      assert.equal(munis, municipalities);
      return readings;
    };
    const get = makeGet({ json: value => value }, () => db, aqiLevel, getLatestAirQuality, isCurrentAirReading);
    const result = await get();
    assert.equal(result.source, 'latest');
    assert.deepEqual(result.data.map(row => row.air_data_current), [true, false, false, false, false]);
    assert.equal(result.data[0].pm2_5, 80);
    assert.equal(result.data[0].air_quality_status, 'Good');
    assert.equal(result.data[0].air_source, 'OpenAQ / Clarity');
    assert.deepEqual(warnings[0][1], { municipality_id: 'recent', recorded_at: readings[0].recorded_at, aqi: 151, status: 'Good' });
  } finally {
    console.warn = originalWarn;
  }
});

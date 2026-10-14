import test from 'node:test';
import assert from 'node:assert/strict';
import { pm25Aqi, calculateNowCast, fetchOpenAqReading } from '../src/lib/monitoring/openAqAir.mjs';

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
  await assert.rejects(fetchOpenAqReading('test-key', { now: now + 3 * 3600000, fetcher }), /no recent valid/);
});

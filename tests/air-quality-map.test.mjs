import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getLatestAirQuality } from '../src/lib/monitoring/latestAirQuality.mjs';
import { isCurrentAirReading } from '../src/lib/monitoring/airQualityFreshness.js';

const component = await readFile(new URL('../src/components/maps/AirQualityMap.js', import.meta.url), 'utf8');
const route = await readFile(new URL('../src/app/api/monitoring/air/route.js', import.meta.url), 'utf8');

test('API and map fallback use the same latest-row selector and freshness helper', () => {
  for (const source of [route, component]) {
    assert.match(source, /getLatestAirQuality\(\w+, \w+\)/);
    assert.match(source, /air_data_current: isCurrentAirReading\(/);
    assert.doesNotMatch(source, /getSelectedAirQuality/);
  }
  assert.match(component, /Air Quality Observation/);
  assert.match(component, /'Current' : 'Outdated'/);
  assert.match(component, /: 'No Data'/);
});

test('fallback selects newest stored row and applies API freshness boundaries', async () => {
  const now = Date.parse('2026-11-05T12:00:00Z');
  const rows = [
    { municipality_id: 'one', recorded_at: '2026-11-05T11:00:00Z', aqi: 20 },
    { municipality_id: 'two', recorded_at: '2026-11-05T09:59:59Z', aqi: 80 },
    { municipality_id: 'one', recorded_at: '2026-09-12T23:35:00Z', aqi: 150 },
  ];
  const db = { from(table) {
    assert.equal(table, 'air_quality');
    const query = {
      select: () => query,
      order: () => query,
      range: async (start, end) => ({ data: rows.slice(start, end + 1) }),
    };
    return query;
  } };
  const selected = await getLatestAirQuality(db, [{ municipality_id: 'one' }, { municipality_id: 'two' }]);
  assert.deepEqual(selected.map(row => row.aqi), [20, 80]);
  assert.deepEqual(selected.map(row => isCurrentAirReading(row.recorded_at, now)), [true, false]);
  assert.equal(isCurrentAirReading('2026-11-05T12:00:01Z', now), false);
  assert.equal(isCurrentAirReading(null, now), false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { getRecentExtremeCaution } from '../src/lib/monitoring/recentExtremeCaution.mjs';

test('keeps the newest Extreme Caution reading for each municipality', async () => {
  const rows = [
    { municipality_id: 'a', heat_index: 34, fetched_at: '2026-11-09T08:00:00Z' },
    { municipality_id: 'b', heat_index: 33, fetched_at: '2026-11-09T07:00:00Z' },
    { municipality_id: 'a', heat_index: 33, fetched_at: '2026-11-09T06:00:00Z' },
  ];
  const query = {
    select() { return this; },
    gte() { return this; },
    lt() { return this; },
    order() { return this; },
    range() { return Promise.resolve({ data: rows, error: null }); },
  };
  const db = { from(table) { assert.equal(table, 'weather_telemetry'); return query; } };
  const result = await getRecentExtremeCaution(db, Date.parse('2026-11-10T00:00:00Z'));
  assert.equal(result.get('a').heat_index, 34);
  assert.equal(result.get('b').heat_index, 33);
});

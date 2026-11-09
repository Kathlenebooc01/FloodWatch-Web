import test from 'node:test';
import assert from 'node:assert/strict';
import { getLatestWeatherTelemetry } from '../src/lib/monitoring/latestWeatherTelemetry.mjs';

test('finds the latest reading for a municipality outside the global batch', async () => {
  const calls = [];
  const db = {
    from(table) {
      assert.equal(table, 'weather_telemetry');
      let municipalityId = null;
      return {
        select() { return this; },
        eq(column, value) { assert.equal(column, 'municipality_id'); municipalityId = value; return this; },
        order(column) { assert.equal(column, 'fetched_at'); return this; },
        limit(count) {
          calls.push({ municipalityId, count });
          return Promise.resolve({ data: municipalityId
            ? [{ municipality_id: municipalityId, heat_index: 33, fetched_at: '2026-11-09T02:25:00Z' }]
            : [{ municipality_id: 'a', heat_index: 30, fetched_at: '2026-11-10T00:00:00Z' }], error: null });
        },
      };
    },
  };

  const latest = await getLatestWeatherTelemetry(db, [{ municipality_id: 'a' }, { municipality_id: 'b' }], 1);
  assert.equal(latest.get('a').heat_index, 30);
  assert.equal(latest.get('b').heat_index, 33);
  assert.deepEqual(calls, [{ municipalityId: null, count: 1 }, { municipalityId: 'b', count: 1 }]);
});

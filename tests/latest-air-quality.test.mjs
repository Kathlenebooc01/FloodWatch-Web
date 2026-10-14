import test from 'node:test';
import assert from 'node:assert/strict';
import { getLatestAirQuality, getSelectedAirQuality } from '../src/lib/monitoring/latestAirQuality.mjs';

test('pages until it finds each municipality beyond a busy municipality\'s first 1000 rows', async () => {
  const rows = Array.from({ length: 1205 }, (_, i) => ({ municipality_id: 'busy', recorded_at: 1000 + i, aqi: 40 }));
  rows.push({ municipality_id: 'other', recorded_at: 10, aqi: 190 });
  rows.push({ municipality_id: 'busy', recorded_at: 1, aqi: 167 });
  const pages = [];
  const db = {
    from(table) {
      assert.equal(table, 'air_quality');
      const query = {
        select() { return query; },
        order(column, options) {
          assert.ok(['recorded_at', 'created_at'].includes(column));
          assert.equal(options.ascending, false);
          return query;
        },
        async range(from, to) {
          pages.push(from);
          return { data: [...rows].sort((a, b) => b.recorded_at - a.recorded_at).slice(from, to + 1) };
        },
      };
      return query;
    },
  };
  const result = await getLatestAirQuality(db, [{ municipality_id: 'busy' }, { municipality_id: 'other' }, { municipality_id: 'busy' }]);
  assert.deepEqual(pages, [0, 1000]);
  assert.deepEqual(result.map(r => r.aqi), [40, 190]);
});

test('surfaces a database error instead of silently showing missing data', async () => {
  const query = { select: () => query, order: () => query, range: async () => ({ error: { message: 'permission denied' } }) };
  await assert.rejects(getLatestAirQuality({ from: () => query }, [{ municipality_id: 'one' }]), /permission denied/);
});

test('selected batch keeps the newest complete row for each municipality', async () => {
  const rows = [
    { municipality_id: 'cebu', aqi: 72, recorded_at: '2026-09-21T07:41:40+00:00', created_at: '2026-09-21', pm2_5: 22 },
    { municipality_id: 'cebu', aqi: 190, recorded_at: '2026-09-12T23:35:12+00:00', created_at: '2026-09-12T23:35', pm2_5: 131.2 },
    { municipality_id: 'cebu', aqi: 190, recorded_at: '2026-09-12T23:35:12+00:00', created_at: '2026-09-12T23:45', pm2_5: 131.2 },
    { municipality_id: 'other', aqi: 167, recorded_at: '2026-09-12T23:35:10+00:00', created_at: '2026-09-12', pm2_5: 80 },
  ];
  const db = {
    from(table) {
      assert.equal(table, 'air_quality');
      const orders = [];
      let start, end;
      const query = {
        select() { return query; },
        gte(column, value) { assert.equal(column, 'recorded_at'); start = value; return query; },
        lt(column, value) { assert.equal(column, 'recorded_at'); end = value; return query; },
        order(column, options) { orders.push([column, options.ascending]); return query; },
        async range(from, to) {
          assert.equal(from, 0);
          assert.equal(to, 999);
          assert.deepEqual(orders, [['recorded_at', false], ['created_at', false]]);
          return { data: rows.filter(row => row.recorded_at >= start && row.recorded_at < end)
            .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at) || b.created_at.localeCompare(a.created_at)) };
        },
      };
      return query;
    },
  };
  const selected = await getSelectedAirQuality(db, [{ municipality_id: 'cebu' }, { municipality_id: 'other' }]);
  assert.deepEqual(selected.map(({ aqi, recorded_at, pm2_5 }) => ({ aqi, recorded_at, pm2_5 })), [
    { aqi: 190, recorded_at: '2026-09-12T23:35:12+00:00', pm2_5: 131.2 },
    { aqi: 167, recorded_at: '2026-09-12T23:35:10+00:00', pm2_5: 80 },
  ]);
});

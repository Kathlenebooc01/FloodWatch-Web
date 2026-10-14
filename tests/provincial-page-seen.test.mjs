import test from 'node:test';
import assert from 'node:assert/strict';
import { getProvincialPageViewedAt, markProvincialPageSeen } from '../src/lib/notifications/provincialPageSeen.mjs';

test('reads a page visit for the signed-in admin and page only', async () => {
  const filters = [];
  const db = {
    auth: { getUser: async () => ({ data: { user: { id: 'admin-1' } }, error: null }) },
    from: (table) => {
      assert.equal(table, 'provincial_page_seen');
      const query = {
        select: () => query,
        eq: (column, value) => { filters.push([column, value]); return query; },
        maybeSingle: async () => ({ data: { viewed_at: '2026-10-15T00:00:00Z' }, error: null }),
      };
      return query;
    },
  };
  assert.equal(await getProvincialPageViewedAt(db, 'lgu'), '2026-10-15T00:00:00Z');
  assert.deepEqual(filters, [['admin_id', 'admin-1'], ['page_key', 'lgu']]);
});

test('marks only the selected page and skips other roles', async () => {
  let role = 'national_admin';
  const calls = [];
  const db = {
    auth: { getUser: async () => ({ data: { user: { id: 'admin-1' } }, error: null }) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role }, error: null }) }) }),
    }),
    rpc: async (...args) => { calls.push(args); return { data: '2026-10-15T01:00:00Z', error: null }; },
  };
  assert.equal(await markProvincialPageSeen(db, 'request'), null);
  assert.equal(calls.length, 0);
  role = 'provincial_admin';
  assert.equal(await markProvincialPageSeen(db, 'request'), '2026-10-15T01:00:00Z');
  assert.deepEqual(calls, [['mark_provincial_page_seen', { p_page_key: 'request' }]]);
  await assert.rejects(getProvincialPageViewedAt(db, 'report'), /Invalid page key/);
});

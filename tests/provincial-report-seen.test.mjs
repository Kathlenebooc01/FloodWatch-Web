import test from 'node:test';
import assert from 'node:assert/strict';
import { markProvincialReportsSeen } from '../src/lib/notifications/provincialReportSeen.mjs';

test('non-provincial visitors do not call the provincial-only RPC', async () => {
  let called = false;
  const db = {
    auth: { async getUser() { return { data: { user: { id: 'admin' } }, error: null }; } },
    from(table) { assert.equal(table, 'profiles'); return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { role: 'national_admin' }, error: null }; } }; },
    async rpc() { called = true; },
  };
  assert.equal(await markProvincialReportsSeen(db), null);
  assert.equal(called, false);
});

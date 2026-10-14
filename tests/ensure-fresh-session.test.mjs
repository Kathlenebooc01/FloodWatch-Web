import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureFreshSession } from '../src/lib/auth/ensureFreshSession.mjs';

test('keeps an active session without refreshing', async () => {
  let refreshes = 0;
  const db = { auth: {
    async getSession() { return { data: { session: { expires_at: Date.now() / 1000 + 3600 } } }; },
    async refreshSession() { refreshes++; },
  } };
  assert.equal(await ensureFreshSession(db), true);
  assert.equal(refreshes, 0);
});

test('refreshes an expiring session once for simultaneous callers', async () => {
  let refreshes = 0;
  const db = { auth: {
    async getSession() { return { data: { session: { expires_at: Date.now() / 1000 - 1 } } }; },
    async refreshSession() { refreshes++; return { data: { session: { access_token: 'new' } } }; },
  } };
  assert.deepEqual(await Promise.all([ensureFreshSession(db), ensureFreshSession(db)]), [true, true]);
  assert.equal(refreshes, 1);
});

test('clears a session when its refresh token cannot renew it', async () => {
  let signedOut = false;
  const db = { auth: {
    async getSession() { return { data: { session: { expires_at: Date.now() / 1000 - 1 } } }; },
    async refreshSession() { return { data: { session: null }, error: new Error('invalid refresh token') }; },
    async signOut() { signedOut = true; },
  } };
  assert.equal(await ensureFreshSession(db), false);
  assert.equal(signedOut, true);
});

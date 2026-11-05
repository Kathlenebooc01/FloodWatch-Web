import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { timingSafeEqual } from 'node:crypto';

const source = await readFile(new URL('../src/app/api/monitoring/air/update/route.js', import.meta.url), 'utf8');
const makeGet = new Function('timingSafeEqual', 'createClient', 'syncOpenAqAir',
  source.replace(/^import .*;\r?\n/gm, '').replace("export const runtime = 'nodejs';", '')
    .replace('export async function GET(request)', 'async function GET(request)') + '\nreturn GET;');

test('updater rejects missing or incorrect bearer secret before database access', async () => {
  const previous = process.env.CRON_SECRET;
  const originalWarn = console.warn;
  console.warn = () => {};
  process.env.CRON_SECRET = 'test-cron-secret';
  let accessed = false;
  const get = makeGet(timingSafeEqual, () => { accessed = true; }, () => { accessed = true; });
  try {
    for (const authorization of [null, 'Bearer wrong-secret', 'Basic test-cron-secret']) {
      const response = await get({ headers: { get: () => authorization } });
      assert.equal(response.status, 401);
    }
    assert.equal(accessed, false);
  } finally {
    console.warn = originalWarn;
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});

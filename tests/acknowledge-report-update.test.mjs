import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/app/api/situational-reports/acknowledge/route.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace('export async function POST', 'async function POST');
const load = new Function('createClient', 'NextResponse', 'process', `${source}\nreturn POST;`);

function setup({ role = 'provincial_admin', province = 'province', report = {
  report_id: 'update', parent_report_id: 'root', municipality_id: 'municipality', status: 'pending', acknowledged_at: null,
} } = {}) {
  let write = null;
  let clientOptions = null;
  const db = {
    auth: { async getUser() { return { data: { user: { id: 'reviewer' } } }; } },
    from(table) {
      let payload;
      const filters = {};
      return {
        select() { return this; },
        eq(key, value) { filters[key] = value; return this; },
        update(value) { payload = value; return this; },
        async single() { return { data: table === 'profiles' ? { role, province_id: province } : report }; },
        async maybeSingle() {
          if (table === 'municipality_or_city') return { data: { province_id: 'province' } };
          if (!payload) return { data: report };
          write = { payload, filters };
          return { data: { ...report, ...payload } };
        },
      };
    },
  };
  const POST = load((_url, _key, options) => { clientOptions = options; return db; },
    { json: (body, options) => ({ body, status: options.status }) },
    { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test' } });
  const request = { headers: { get: () => 'Bearer token' }, json: async () => ({ report_id: 'update' }) };
  return { POST, request, getWrite: () => write, getClientOptions: () => clientOptions };
}

test('acknowledging a pending update persists Verified and review fields together', async () => {
  const { POST, request, getWrite, getClientOptions } = setup();
  const response = await POST(request);
  assert.equal(response.status, 200);
  assert.equal(response.body.report.status, 'Verified');
  assert.equal(getWrite().payload.status, 'Verified');
  assert.equal(getWrite().payload.reviewed_by, 'reviewer');
  assert.equal(getWrite().payload.acknowledged_by, 'reviewer');
  assert.equal(getWrite().filters.municipality_id, 'municipality');
  assert.equal(getWrite().filters.status, 'pending');
  assert.equal(getClientOptions().global.headers.Authorization, 'Bearer token');
});

test('previously acknowledged pending update can be finalized', async () => {
  const oldTime = '2026-10-01T00:00:00.000Z';
  const { POST, request, getWrite } = setup({ report: {
    report_id: 'update', parent_report_id: 'root', province_id: 'province', status: 'pending', acknowledged_at: oldTime,
    municipality_id: 'municipality',
  } });
  assert.equal((await POST(request)).status, 200);
  assert.equal(getWrite().payload.acknowledged_at, oldTime);
});

test('rejects other roles, provinces, and main reports without writing', async () => {
  for (const options of [
    { role: 'lgu_frontliner' },
    { province: 'other' },
    { report: { report_id: 'update', parent_report_id: null, municipality_id: 'municipality', status: 'pending' } },
  ]) {
    const { POST, request, getWrite } = setup(options);
    assert.equal((await POST(request)).status, 403);
    assert.equal(getWrite(), null);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isAcceptedReport } from '../src/lib/situational-report-hierarchy.mjs';

// Execute the route with controlled auth/database responses, without Next's server.
const source = fs.readFileSync(new URL('../src/app/api/situational-reports/route.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/export async function /g, 'async function ');
const loadRoute = new Function('createClient', 'NextResponse', 'isAcceptedReport', `${source}\nreturn { GET, POST };`);
const root = { report_id: 'root', parent_report_id: null, status: 'Verified',
  municipality_id: 'muni', hazard_type: '[SITUATIONAL] Rainfall', province_id: 'province' };

function setup(records = [root], role = 'lgu_frontliner', insertError = null) {
  const writes = [];
  const db = {
    auth: { async getUser() { return { data: { user: { id: 'user' } } }; } },
    from(table) {
      const filters = {};
      let payload;
      return {
        select() { return this; },
        eq(key, value) { filters[key] = value; return this; },
        is(key, value) { filters[key] = value; return this; },
        ilike(key, value) { filters[key] = value; return this; },
        order() { return this; },
        insert(value) { payload = value; writes.push(value); return this; },
        async single() {
          if (table === 'profiles') return { data: { id: 'user', role, municipality_id: 'muni' } };
          if (payload) return { data: payload, error: insertError };
          return { data: records.find(row => row.report_id === filters.report_id) };
        },
        async range() { return { data: records.filter(row => Object.entries(filters).every(([key, value]) =>
          key === 'status' ? row.status?.toLowerCase() === value.toLowerCase() : row[key] === value)) }; },
      };
    },
  };
  const response = { json(body, options = {}) { return { body, status: options.status || 200 }; } };
  return { ...loadRoute(() => db, response, isAcceptedReport), writes };
}
const request = (body = {}, token = 'Bearer test-token') => ({
  headers: { get() { return token; } }, async json() { return body; },
});

test('selector returns only verified roots from the LGU municipality', async () => {
  const route = setup([root, { ...root, report_id: 'pending', status: 'pending' },
    { ...root, report_id: 'child', parent_report_id: 'root' },
    { ...root, report_id: 'foreign', municipality_id: 'elsewhere' }]);
  const res = await route.GET(request());
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.reports.map(row => row.report_id), ['root']);
});

test('unaccepted parent rejects submission without inserting', async () => {
  const route = setup([{ ...root, status: 'pending' }]);
  const res = await route.POST(request({ parent_report_id: 'root', description: 'Update', image_url: '' }));
  assert.equal(res.status, 409);
  assert.equal(route.writes.length, 0);
});

test('linking to an update resolves original root and ignores forged ownership/status', async () => {
  const route = setup([root, { ...root, report_id: 'child', parent_report_id: 'root', status: 'pending' }]);
  const res = await route.POST(request({ parent_report_id: 'child', description: ' Update ', image_url: '',
    user_id: 'attacker', status: 'Verified', municipality_id: 'elsewhere' }));
  assert.equal(res.status, 201);
  assert.equal(route.writes[0].parent_report_id, 'root');
  assert.equal(route.writes[0].status, 'pending');
  assert.equal(route.writes[0].user_id, 'user');
  assert.equal(route.writes[0].municipality_id, 'muni');
});

test('foreign municipality, cycles, missing parents and unauthorized roles reject without writes', async () => {
  for (const [records, role, status] of [
    [[{ ...root, municipality_id: 'elsewhere' }], 'lgu_frontliner', 403],
    [[{ ...root, parent_report_id: 'root' }], 'lgu_frontliner', 400],
    [[], 'lgu_frontliner', 404],
    [[root], 'citizen', 403],
  ]) {
    const route = setup(records, role);
    assert.equal((await route.POST(request({ parent_report_id: 'root', description: 'Update', image_url: '' }))).status, status);
    assert.equal(route.writes.length, 0);
  }
  assert.equal((await setup().GET(request({}, null))).status, 401);
});

test('database rejection during insertion is surfaced as a conflict', async () => {
  const route = setup([root], 'lgu_frontliner', { code: '23514', message: 'Main report must be verified' });
  const res = await route.POST(request({ parent_report_id: 'root', description: 'Update', image_url: '' }));
  assert.equal(res.status, 409);
});

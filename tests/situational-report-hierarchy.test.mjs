import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReportHierarchy, fetchAllIncidentReports, isAcceptedReport } from '../src/lib/situational-report-hierarchy.mjs';

const report = (id, parent = null, extra = {}) => ({ report_id: id, parent_report_id: parent,
  municipality_id: 'muni-a', municipality_name: 'Municipality A', clean_title: 'Same title',
  status: 'pending', created_at: '2026-10-01T00:00:00Z', ...extra });

test('same titles never merge distinct roots; updates attach by ID and stay chronological', () => {
  const { groups, unresolved } = buildReportHierarchy([
    report('update-2', 'root-1', { created_at: '2026-10-03T00:00:00Z' }),
    report('root-1', null, { status: 'Verified' }), report('root-2'),
    report('update-1', 'root-1', { created_at: '2026-10-02T00:00:00Z' }),
    report('other-update', 'root-2'),
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].reports.length, 2);
  const root = groups[0].reports.find(r => r.report_id === 'root-1');
  assert.deepEqual(root.updates.map(r => r.report_id), ['update-1', 'update-2']);
  assert.equal(root.status, 'Verified');
  assert.equal(root.latestReport.report_id, 'update-2');
  assert.equal(unresolved.length, 0);
});

test('legacy chains flatten and invalid relationships never become main reports', () => {
  const { groups, unresolved } = buildReportHierarchy([
    report('root'), report('update-1', 'root'), report('update-2', 'update-1'),
    report('orphan', 'absent'), report('cycle-1', 'cycle-2'), report('cycle-2', 'cycle-1'),
    report('wrong-muni', 'root', { municipality_id: 'muni-b' }),
  ]);
  assert.equal(groups[0].reports.length, 1);
  assert.deepEqual(groups[0].reports[0].updates.map(r => r.report_id), ['update-1', 'update-2']);
  assert.equal(unresolved.length, 4);
});

test('municipalities with matching names remain distinct and no update limit is imposed', () => {
  const rows = [report('root'), report('root-b', null, { municipality_id: 'muni-b' })];
  for (let i = 0; i < 1200; i++) rows.push(report(`update-${i}`, 'root'));
  const { groups } = buildReportHierarchy(rows);
  assert.equal(groups.length, 2);
  assert.equal(groups.find(g => g.municipality_id === 'muni-a').reports[0].updates.length, 1200);
});

test('only the existing Verified status enables linking', () => {
  for (const status of ['pending', 'Rejected', 'Not Verified', 'Submitted', 'Completed', null]) {
    assert.equal(isAcceptedReport({ status }), false);
  }
  assert.equal(isAcceptedReport({ status: 'Verified' }), true);
});

test('fetch includes roots beyond the first page and propagates backend failures', async () => {
  const calls = [];
  const db = { from() { return { select() { return this; }, order() { return this; },
    async range(start, end) { calls.push([start, end]); return { data: start === 0
      ? Array.from({ length: 500 }, (_, i) => report(`u-${i}`, 'root')) : [report('root')] }; } }; } };
  const rows = await fetchAllIncidentReports(db);
  assert.equal(rows.length, 501);
  assert.deepEqual(calls, [[0, 499], [500, 999]]);
  assert.equal(buildReportHierarchy(rows).groups[0].reports[0].updates.length, 500);
  const failed = { from() { return { select() { return this; }, order() { return this; },
    async range() { return { error: new Error('backend unavailable') }; } }; } };
  await assert.rejects(fetchAllIncidentReports(failed), /backend unavailable/);
});

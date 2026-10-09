import test from 'node:test'
import assert from 'node:assert/strict'
import { hasNewReports, newestReportTimestamp } from '../src/lib/notifications/reportSeen.mjs'

test('viewing the Reports table acknowledges its loaded reports without changing status', () => {
  const reports = [
    { report_id: 'old', status: 'Pending', created_at: '2026-10-08T08:00:00Z' },
    { report_id: 'newer', status: 'Pending', created_at: '2026-10-09T08:00:00Z' },
  ]
  assert.equal(hasNewReports(reports, null), true)
  const seenAt = newestReportTimestamp(reports)
  assert.equal(hasNewReports(reports, seenAt), false)
  assert.deepEqual(reports.map(report => report.status), ['Pending', 'Pending'])
  assert.equal(hasNewReports([...reports, { created_at: '2026-10-09T08:01:00Z' }], seenAt), true)
  assert.equal(hasNewReports(reports, seenAt), false)
})

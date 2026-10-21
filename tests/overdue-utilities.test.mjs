import assert from 'node:assert/strict'
import { test } from 'node:test'
import { daysOverdue, requestDueDate } from '../src/lib/utilities/overdue.mjs'

test('flag eligibility changes after the Philippine due date', () => {
  const due = '2026-10-27T00:00:00+08:00'
  assert.equal(daysOverdue(due, new Date('2026-10-26T23:59:59+08:00')), 0)
  assert.equal(daysOverdue(due, new Date('2026-10-27T23:59:59+08:00')), 0)
  assert.equal(daysOverdue(due, new Date('2026-10-28T00:00:00+08:00')), 1)
  assert.equal(daysOverdue(due, new Date('2026-10-30T12:00:00+08:00')), 3)
})

test('uses the latest saved expected return date across request items and allocations', () => {
  assert.equal(requestDueDate(
    [{ expected_return_date: '2026-10-27T00:00:00+08:00' }],
    [{ expected_return_date: '2026-10-29T00:00:00+08:00' }],
  ), '2026-10-29T00:00:00+08:00')
})


import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchProvincialMonitoringUnreadCounts } from '../src/lib/notifications/provincialMonitoringUnread.mjs'

function mockDatabase(counts, errorAt = -1) {
  const queries = []
  return {
    queries,
    from(table) {
      const query = { table, filters: [] }
      queries.push(query)
      const builder = {
        select(columns, options) {
          query.columns = columns
          query.options = options
          return builder
        },
        eq(column, value) {
          query.filters.push(['eq', column, value])
          return builder
        },
        in(column, values) {
          query.filters.push(['in', column, values])
          return builder
        },
        gt(column, value) {
          query.filters.push(['gt', column, value])
          return builder
        },
        then(resolve, reject) {
          const index = queries.indexOf(query)
          return Promise.resolve({
            count: counts[index],
            error: index === errorAt ? new Error('query failed') : null,
          }).then(resolve, reject)
        },
      }
      return builder
    },
  }
}

test('Reports and LGU unread counts use separate submitters and visit times', async () => {
  const db = mockDatabase([2, 3, 4])
  const counts = await fetchProvincialMonitoringUnreadCounts(db, 'report-visit', 'lgu-visit')

  assert.deepEqual(counts, { reportCount: 2, lguCount: 7 })
  assert.deepEqual(db.queries.map(({ table }) => table), [
    'incident_report', 'incident_report', 'distress_signals',
  ])
  assert.ok(db.queries[0].filters.some((filter) =>
    filter[0] === 'eq' && filter[1] === 'profiles.role' && filter[2] === 'citizen'))
  for (const query of db.queries.slice(1)) {
    assert.ok(query.filters.some((filter) => filter[0] === 'in' &&
      filter[1] === 'profiles.role' &&
      filter[2].includes('lgu_headmaster') && filter[2].includes('lgu_frontliner')))
  }
  assert.deepEqual(db.queries.map(({ filters }) =>
    filters.find((filter) => filter[1] === 'created_at')?.[2]),
  ['report-visit', 'lgu-visit', 'lgu-visit'])
})

test('A failed count query is not treated as an empty inbox', async () => {
  await assert.rejects(
    fetchProvincialMonitoringUnreadCounts(mockDatabase([0, 0, 0], 2), null, null),
    /query failed/
  )
})

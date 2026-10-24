import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchPsaCebuStatistics, normalizeAreaName, selectCebuGeographies } from '../src/lib/psa/cebu-census.mjs'

const areas = [
  { municipality_id: 'alcantara', name: 'Alcantara' },
  { municipality_id: 'alcoy', name: 'Alcoy' },
  { municipality_id: 'cebu-city', name: 'Cebu City' },
]
const metadata = { variables: [
  { code: 'Geographic Location', text: 'Geographic Location' },
  { code: 'Parameter', text: 'Parameter', values: ['0', '1', '2'], valueTexts: ['Total Population', 'Household Population', 'Number of Households'] },
] }

test('matches municipality and highly urbanized city codes, excluding province and barangay', () => {
  assert.equal(normalizeAreaName('City of Cebu'), normalizeAreaName('Cebu City'))
  const selected = selectCebuGeographies(metadata, areas)
  assert.deepEqual(selected.matches.map(match => match.code), ['0702201000', '0702202000', '0730600000'])
  assert.equal(selected.unverified.length, 0)
})

test('POSTs only verified Cebu places and parses the three official parameters', async () => {
  const requests = []
  const fetchImpl = async (_url, options) => {
    requests.push(options)
    if (!options.method) return new Response(JSON.stringify(metadata), { status: 200 })
    return new Response(JSON.stringify({ columns: [{ code: 'Geographic Location', text: 'Geographic Location' }, { code: 'Parameter', text: 'Parameter' }], data: [
      { key: ['0702201000', '0'], values: ['17,490'] },
      { key: ['0702201000', '1'], values: ['17,300'] },
      { key: ['0702201000', '2'], values: ['4,773'] },
      { key: ['0702202000', '0'], values: ['19,207'] },
      { key: ['0702202000', '1'], values: ['19,000'] },
      { key: ['0702202000', '2'], values: ['5,140'] },
      { key: ['0730600000', '0'], values: ['965,332'] },
      { key: ['0730600000', '1'], values: ['946,912'] },
      { key: ['0730600000', '2'], values: ['298,505'] },
    ] }), { status: 200 })
  }
  const result = await fetchPsaCebuStatistics(areas, fetchImpl)
  const query = JSON.parse(requests[1].body)
  assert.deepEqual(query.query[0].selection.values, ['0702201000', '0702202000', '0730600000'])
  assert.equal(result.records.find(row => row.municipality_id === 'alcantara').total_population, 17490)
  assert.equal(result.records.find(row => row.municipality_id === 'alcoy').number_of_households, 5140)
  assert.deepEqual(result.unmatched, [])
})

test('preserves cached data by rejecting failed or invalid PSA responses before saving', async () => {
  await assert.rejects(fetchPsaCebuStatistics(areas, async () => new Response('', { status: 503 })))
  await assert.rejects(fetchPsaCebuStatistics(areas, async (_url, options) =>
    new Response(JSON.stringify(options.method ? { data: [] } : metadata), { status: 200 })))
  await assert.rejects(fetchPsaCebuStatistics(areas, async (_url, options) =>
    new Response(JSON.stringify(options.method ? {
      columns: [{ code: 'Geographic Location' }, { code: 'Parameter' }],
      data: [{ key: ['0702201000', '0'], values: ['17490'] }],
    } : metadata), { status: 200 })))
})

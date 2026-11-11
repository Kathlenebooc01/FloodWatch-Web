import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchBarangayCensus } from '../src/lib/psa/barangay-census.mjs'

test('uses barangay PSGC codes to attach 2024 population and household counts', async () => {
  const codes = ['0731101001', '0731101002']
  const metadata = { variables: [
    { code: 'Geographic Location', text: 'Geographic Location' },
    { code: 'Parameter', text: 'Parameter', values: ['0', '1', '2'], valueTexts: ['Total Population', 'Household Population', 'Number of Households'] },
  ] }
  const requests = []
  const fetchImpl = async (_url, options) => {
    if (!options.method) return new Response(JSON.stringify(metadata), { status: 200 })
    requests.push(JSON.parse(options.body))
    return new Response(JSON.stringify({
      columns: [{ code: 'Geographic Location' }, { code: 'Parameter' }],
      data: [
        { key: [codes[0], '0'], values: ['5,421'] },
        { key: [codes[0], '2'], values: ['1,200'] },
        { key: [codes[1], '0'], values: ['2,300'] },
      ],
    }), { status: 200 })
  }
  const result = await fetchBarangayCensus(codes, fetchImpl)
  assert.deepEqual(requests[0].query[0].selection.values, codes)
  assert.deepEqual(requests[0].query[1].selection.values, ['0', '2'])
  assert.deepEqual(result[codes[0]], { total_population: 5421, number_of_households: 1200 })
  assert.deepEqual(result[codes[1]], { total_population: 2300 })
})

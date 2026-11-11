import { PSA_CENSUS_URL } from './cebu-census.mjs'

const statisticName = value => String(value || '').toLowerCase().replace(/[^a-z]/g, '')
const parseNumber = value => {
  const text = String(value ?? '').replace(/,/g, '').trim()
  return /^\d+$/.test(text) && Number.isSafeInteger(Number(text)) ? Number(text) : null
}

export async function fetchBarangayCensus(codes, fetchImpl = fetch) {
  const uniqueCodes = [...new Set(codes)]
  if (!uniqueCodes.length || uniqueCodes.length > 1000 || uniqueCodes.some(code => !/^\d{10}$/.test(code))) {
    throw new Error('Invalid barangay PSGC codes.')
  }

  const metadataResponse = await fetchImpl(PSA_CENSUS_URL, { signal: AbortSignal.timeout(15000) })
  if (!metadataResponse.ok) throw new Error('PSA census metadata is unavailable.')
  const metadata = await metadataResponse.json()
  const geographic = metadata.variables?.find(variable => /geographic location/i.test(variable.text || variable.code || ''))
  const parameter = metadata.variables?.find(variable => /parameter/i.test(variable.text || variable.code || ''))
  if (!geographic || !parameter) throw new Error('PSA census metadata has an unexpected structure.')

  const wanted = new Map([['totalpopulation', 'total_population'], ['numberofhouseholds', 'number_of_households']])
  const parameterCodes = parameter.values.filter((_, index) => wanted.has(statisticName(parameter.valueTexts?.[index])))
  if (parameterCodes.length !== 2) throw new Error('PSA census parameters could not be verified.')

  const byCode = Object.fromEntries(uniqueCodes.map(code => [code, {}]))
  for (let offset = 0; offset < uniqueCodes.length; offset += 100) {
    const batch = uniqueCodes.slice(offset, offset + 100)
    const response = await fetchImpl(PSA_CENSUS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        query: [
          { code: geographic.code, selection: { filter: 'item', values: batch } },
          { code: parameter.code, selection: { filter: 'item', values: parameterCodes } },
        ],
        response: { format: 'json' },
      }),
    })
    if (!response.ok) throw new Error('PSA barangay census request failed.')
    const result = await response.json()
    const geoIndex = result.columns?.findIndex(column => /geographic location/i.test(column.text || column.code || '')) ?? -1
    const parameterIndex = result.columns?.findIndex(column => /parameter/i.test(column.text || column.code || '')) ?? -1
    if (geoIndex < 0 || parameterIndex < 0 || !Array.isArray(result.data)) throw new Error('PSA barangay census response has an unexpected structure.')
    for (const datum of result.data) {
      const code = datum.key?.[geoIndex]
      if (!Object.hasOwn(byCode, code)) continue
      const parameterIndexInMetadata = parameter.values.indexOf(datum.key?.[parameterIndex])
      const field = wanted.get(statisticName(parameter.valueTexts?.[parameterIndexInMetadata]))
      const value = parseNumber(datum.values?.[0])
      if (field && value !== null) byCode[code][field] = value
    }
  }
  return byCode
}

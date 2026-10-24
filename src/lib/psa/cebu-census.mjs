export const PSA_CENSUS_URL = 'https://openstat.psa.gov.ph/PXWeb/api/v1/en/DB/1A/PO_2024/0071A6DTPH6.px'

// Official PSA PSGC Cebu listing: https://psa.gov.ph/classification/psgc/citimuni/0702200000
// The three independently administered cities have separate codes in the PSA cities list.
const CEBU_COMPONENT_AREAS = [
  'Alcantara', 'Alcoy', 'Alegria', 'Aloguinsan', 'Argao', 'Asturias', 'Badian', 'Balamban',
  'Bantayan', 'Barili', 'Bogo', 'Boljoon', 'Borbon', 'Carcar', 'Carmen', 'Catmon', null,
  'Compostela', 'Consolacion', 'Cordova', 'Daanbantayan', 'Dalaguete', 'Danao', 'Dumanjug',
  'Ginatilan', null, 'Liloan', 'Madridejos', 'Malabuyoc', null, 'Medellin', 'Minglanilla',
  'Moalboal', 'Naga', 'Oslob', 'Pilar', 'Pinamungajan', 'Poro', 'Ronda', 'Samboan',
  'San Fernando', 'San Francisco', 'San Remigio', 'Santa Fe', 'Santander', 'Sibonga',
  'Sogod', 'Tabogon', 'Tabuelan', 'Talisay', 'Toledo', 'Tuburan', 'Tudela',
]
const CEBU_CODE_NAMES = new Map(CEBU_COMPONENT_AREAS.flatMap((name, index) => name
  ? [[`07022${String(index + 1).padStart(2, '0')}000`, name]] : []))
CEBU_CODE_NAMES.set('0730600000', 'City of Cebu')
CEBU_CODE_NAMES.set('0731100000', 'City of Lapu-Lapu')
CEBU_CODE_NAMES.set('0731300000', 'City of Mandaue')

export function normalizeAreaName(value) {
  const normalized = String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/^\.*\s*/, '').replace(/\s*\*\s*$/, '').replace(/^city of\s+/, '')
    .replace(/\s+city$/, '').replace(/^(municipality|municipality of)\s+/, '')
    .replace(/[^a-z0-9]/g, '')
  // The existing seeded record uses this spelling; PSA PSGC uses Pinamungajan.
  return normalized === 'pinamungahan' ? 'pinamungajan' : normalized
}

function isMunicipalityCode(code) {
  // Cebu's province is 0702200000 (correspondence: 072200000).
  // Its component cities/municipalities have 07022xx000 / 0722xx000 codes.
  // The three separately administered Cebu cities have distinct ten-digit codes.
  const value = String(code)
  return (/^07022\d{2}000$/.test(value) && value !== '0702200000') ||
    (/^0722\d{2}000$/.test(value) && value !== '072200000') ||
    ['0730600000', '0731100000', '0731300000'].includes(value)
}

function statisticType(value) {
  const text = String(value || '').toLowerCase().replace(/[^a-z]/g, '')
  if (text === 'totalpopulation') return 'total_population'
  if (text === 'householdpopulation') return 'household_population'
  if (text === 'numberofhouseholds') return 'number_of_households'
  return null
}

function integerValue(value) {
  const text = String(value ?? '').replace(/,/g, '').trim()
  if (!/^\d+$/.test(text)) return null
  const number = Number(text)
  return Number.isSafeInteger(number) ? number : null
}

export function selectCebuGeographies(metadata, areas) {
  const geographic = metadata?.variables?.find(variable => /geographic location/i.test(variable.text || variable.code || ''))
  const parameter = metadata?.variables?.find(variable => /parameter/i.test(variable.text || variable.code || ''))
  if (!geographic || !parameter) {
    throw new Error('PSA census metadata has an unexpected structure.')
  }
  const parameterCodes = parameter.values.filter((code, index) => statisticType(parameter.valueTexts?.[index]))
  if (parameterCodes.length !== 3) throw new Error('PSA census parameters could not be verified.')

  const byName = new Map()
  for (const area of areas) {
    const key = normalizeAreaName(area.name)
    byName.set(key, [...(byName.get(key) || []), area])
  }
  const matches = []
  const unverified = []
  // This PSA PXWeb table omits the large geographic value list from GET metadata.
  // Match only published Cebu PSGC codes rather than querying all barangays.
  for (const [code, label] of CEBU_CODE_NAMES) {
    const key = normalizeAreaName(label)
    const candidates = byName.get(key) || []
    if (!candidates.length) continue
    if (!isMunicipalityCode(code) || candidates.length !== 1) {
      unverified.push({ psaCode: String(code), psaName: label, reason: 'Geographic level or name is ambiguous' })
      continue
    }
    matches.push({ code: String(code), label, area: candidates[0] })
  }
  const counts = new Map()
  for (const match of matches) counts.set(match.area.municipality_id, (counts.get(match.area.municipality_id) || 0) + 1)
  const uniqueMatches = matches.filter(match => counts.get(match.area.municipality_id) === 1)
  const ambiguous = matches.filter(match => counts.get(match.area.municipality_id) !== 1)
  for (const match of ambiguous) unverified.push({ psaCode: match.code, psaName: match.label, reason: 'Duplicate PSA name match' })
  return { geographic, parameter, parameterCodes, matches: uniqueMatches, unverified }
}

export function parseCebuStatistics(result, selection) {
  if (!Array.isArray(result?.columns) || !Array.isArray(result?.data)) throw new Error('PSA response has an unexpected structure.')
  const geoIndex = result.columns.findIndex(column => /geographic location/i.test(column.text || column.code || ''))
  const parameterIndex = result.columns.findIndex(column => /parameter/i.test(column.text || column.code || ''))
  if (geoIndex < 0 || parameterIndex < 0) throw new Error('PSA response columns could not be verified.')
  const byLabel = new Map(selection.matches.flatMap(match => [
    [normalizeAreaName(match.label), match], [match.code, match],
  ]))
  const rows = new Map()
  for (const datum of result.data) {
    const match = byLabel.get(normalizeAreaName(datum.key?.[geoIndex]))
    if (!match) continue
    const parameterKey = datum.key?.[parameterIndex]
    const parameterValueIndex = selection.parameter.values.indexOf(parameterKey)
    const type = statisticType(selection.parameter.valueTexts?.[parameterValueIndex] || parameterKey)
    if (!type) continue
    const value = integerValue(datum.values?.[0])
    if (value === null) continue
    const record = rows.get(match.area.municipality_id) || {
      municipality_id: match.area.municipality_id,
      psa_geographic_code: match.code,
      psa_geographic_name: match.label,
    }
    record[type] = value
    rows.set(match.area.municipality_id, record)
  }
  return [...rows.values()].filter(row => ['total_population', 'household_population', 'number_of_households'].every(key => row[key] != null))
}

export async function fetchPsaCebuStatistics(areas, fetchImpl = fetch) {
  const options = { signal: AbortSignal.timeout(15000) }
  const metadataResponse = await fetchImpl(PSA_CENSUS_URL, options)
  if (!metadataResponse.ok) throw new Error(`PSA metadata request failed (${metadataResponse.status}).`)
  const metadata = await metadataResponse.json()
  const selection = selectCebuGeographies(metadata, areas)
  if (!selection.matches.length) throw new Error('No Cebu municipality or city codes could be verified in PSA metadata.')
  const response = await fetchImpl(PSA_CENSUS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      query: [
        { code: selection.geographic.code, selection: { filter: 'item', values: selection.matches.map(match => match.code) } },
        { code: selection.parameter.code, selection: { filter: 'item', values: selection.parameterCodes } },
      ],
      response: { format: 'json' },
    }),
  })
  if (!response.ok) throw new Error(`PSA census request failed (${response.status}).`)
  const records = parseCebuStatistics(await response.json(), selection)
  if (records.length !== selection.matches.length) {
    throw new Error('PSA returned incomplete Cebu municipality statistics; cached data was preserved.')
  }
  const completeIds = new Set(records.map(record => record.municipality_id))
  const unmatched = areas.filter(area => !completeIds.has(area.municipality_id)).map(area => area.name)
  return { records, unmatched, unverified: selection.unverified }
}

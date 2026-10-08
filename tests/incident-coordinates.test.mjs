import test from 'node:test'
import assert from 'node:assert/strict'
import { getIncidentCoordinates } from '../src/lib/reports/incidentCoordinates.mjs'

test('uses each incident report’s saved GPS coordinates', () => {
  assert.deepEqual(getIncidentCoordinates({ latitude: '11.0342', longitude: '124.0038' }), {
    latitude: 11.0342,
    longitude: 124.0038,
  })
  assert.deepEqual(getIncidentCoordinates({ latitude: 10.3181, longitude: 123.995 }), {
    latitude: 10.3181,
    longitude: 123.995,
  })
})

test('does not invent a location for missing or invalid GPS', () => {
  for (const report of [null, {}, { latitude: '', longitude: 123 },
    { latitude: 0, longitude: 0 }, { latitude: 91, longitude: 123 },
    { latitude: 11, longitude: Infinity }]) {
    assert.equal(getIncidentCoordinates(report), null)
  }
})

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

test('reads the incident location_point saved by PostGIS without moving to municipality center', () => {
  const bytes = new ArrayBuffer(25)
  const view = new DataView(bytes)
  view.setUint8(0, 1)
  view.setUint32(1, 0x20000001, true)
  view.setUint32(5, 4326, true)
  view.setFloat64(9, 124.0038, true)
  view.setFloat64(17, 11.0342, true)
  const hex = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')
  for (const location_point of [hex, 'SRID=4326;POINT(124.0038 11.0342)',
    { type: 'Point', coordinates: [124.0038, 11.0342] }]) {
    assert.deepEqual(getIncidentCoordinates({ location_point, latitude: 10, longitude: 123 }), {
      latitude: 11.0342, longitude: 124.0038,
    })
  }
  assert.equal(getIncidentCoordinates({ location_point: 'POINT(999 11)' }), null)
})

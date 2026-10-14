import test from 'node:test';
import assert from 'node:assert/strict';
import { aqiLevel } from '../src/lib/monitoring/aqiClassification.mjs';

test('marker classification follows the latest numeric AQI even when status disagrees', () => {
  for (const [aqi, expected] of [[0, 1], [50, 1], [53, 2], [100, 2], [141, 3], [150, 3], [175, 4], [200, 4], [250, 5], [400, 6]]) {
    assert.equal(aqiLevel(aqi, 'Good'), expected);
  }
  assert.equal(aqiLevel(175, 'Moderate'), 4);
  assert.equal(aqiLevel(53, 'Unhealthy'), 2);
});

test('missing AQI uses a recognized stored status without inventing a reading', () => {
  assert.equal(aqiLevel(null, 'Unhealthy for Sensitive Groups'), 3);
  assert.equal(aqiLevel(null, 'Unhealthy'), 4);
  assert.equal(aqiLevel(null, null), 0);
});

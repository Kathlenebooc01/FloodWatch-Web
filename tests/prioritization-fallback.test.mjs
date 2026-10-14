import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPrioritizationFallback } from '../src/lib/lantaw/prioritization-fallback.mjs';

test('database fallback keeps all real requests and labels uncertain weather', () => {
  const requests = [
    { id: 'older', municipality: 'Cebu City', urgency: 'Unspecified', created_at: '2026-01-01', items: [] },
    { id: 'urgent', municipality: 'Mandaue City', urgency: 'High', created_at: '2026-02-01', items: [{ quantity: 2, name: 'Life Vest' }] },
  ];
  const result = buildPrioritizationFallback(requests, [{ available: false }]);
  assert.equal(result.analysis_source, 'database-fallback');
  assert.deepEqual(result.prioritized_queue.map(item => item.request_id), ['urgent', 'older']);
  assert.equal(result.prioritized_queue[0].requested_items, '2x Life Vest');
  assert.match(result.executive_summary.summary, /provisional/);
  assert.match(result.prioritized_queue[0].weather_impact_factor, /unavailable/);
});

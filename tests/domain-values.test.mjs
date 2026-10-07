import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRole, normalizeRequestStatus, requestStatusLabel, isHighUrgencyRequest, isActiveRequest, statusVariants, requestProgress } from '../src/lib/domain-values.mjs';

test('known role identifiers normalize consistently; unknown roles never gain access', () => {
  for (const role of ['national_admin', 'National Admin', ' NATIONAL-ADMIN ']) assert.equal(normalizeRole(role), 'national_admin');
  assert.equal(normalizeRole('LGU Frontliner'), 'lgu_frontliner');
  assert.equal(normalizeRole('admin'), null);
  assert.equal(normalizeRole(null), null);
});
test('workflow status casing and spaces map to existing canonical values', () => {
  assert.equal(normalizeRequestStatus('in transit'), 'In_Transit');
  assert.equal(normalizeRequestStatus('PENDING_DISPATCH'), 'Pending_Dispatch');
  assert.equal(requestStatusLabel('fully_allocated'), 'Fully Allocated');
  assert.equal(normalizeRequestStatus('invented-status'), null);
  assert.ok(statusVariants(['Pending']).includes('pending'));
});
test('High-only eligibility depends on urgency, never Pending status or arbitrary reason text', () => {
  assert.equal(isHighUrgencyRequest({ request_reason: 'high urgency request', status: 'In_Transit' }), true);
  for (const request of [
    { request_reason: 'LOW Urgency Request', status: 'Pending' },
    { request_reason: 'MEDIUM Urgency Request' }, { urgency: 'critical' },
    { request_reason: 'not a HIGH Urgency Request' },
    { urgency: 'Low', request_reason: 'HIGH Urgency Request' },
  ]) assert.equal(isHighUrgencyRequest(request), false);
  assert.equal(isHighUrgencyRequest({ urgency: 'HIGH' }), true);
});
test('mobile drop-off metadata does not hide an explicit High urgency marker', () => {
  for (const request_reason of ['[Drop-off: Buaya] HIGH Urgency Request', '[Drop-off: Buaya]\n[Urgency: HIGH]',
    'Drop-off: Buaya\nPriority Level: High', 'HIGH Urgency Request\nRescue supplies requested']) {
    assert.equal(isHighUrgencyRequest({ request_reason }), true);
  }
  for (const request_reason of ['[Drop-off: High Street] LOW Urgency Request', '[Urgency: MEDIUM]',
    'HIGH Urgency Request\n[Urgency: Low]', 'Supplies for high ground']) {
    assert.equal(isHighUrgencyRequest({ request_reason }), false);
  }
});
test('allocated and in-transit requests remain active; returned/rejected ones do not', () => {
  for (const status of ['Pending', 'partially allocated', 'Fully_Allocated', 'in_transit', 'Received']) assert.equal(isActiveRequest({ status }), true);
  for (const status of ['returned', 'Rejected', 'Unknown']) assert.equal(isActiveRequest({ status }), false);
});
test('progress respects terminal requests, mobile timestamps and remaining allocation batches', () => {
  assert.equal(requestProgress('Rejected', []), 'Rejected');
  assert.equal(requestProgress('Pending', []), 'Pending');
  assert.equal(requestProgress('Returned', [{ batch: 'In_Transit' }]), 'Returned');
  assert.equal(requestProgress('Partially_Allocated', [{ batch: 'returned', dispatched_at: 'past' }, { batch: 'pending_dispatch' }]), 'Pending_Dispatch');
  assert.equal(requestProgress('In_Transit', [{ delivered_at: 'now' }]), 'Received');
  assert.equal(requestProgress('Received', [{ status: 'Returning' }]), 'Received');
});

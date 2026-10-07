export const ROLES = Object.freeze({
  NATIONAL_ADMIN: 'national_admin', PROVINCIAL_ADMIN: 'provincial_admin',
  LGU_HEADMASTER: 'lgu_headmaster', LGU_FRONTLINER: 'lgu_frontliner', CITIZEN: 'citizen',
});
const token = value => String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
export function normalizeRole(value) {
  const normalized = token(value);
  return Object.values(ROLES).includes(normalized) ? normalized : null;
}
export const REQUEST_STATUSES = Object.freeze([
  'Pending', 'Pending_Dispatch', 'Partially_Allocated', 'Fully_Allocated',
  'In_Transit', 'Received', 'Returning', 'Returned', 'Rejected',
]);
const statusByToken = new Map(REQUEST_STATUSES.map(value => [token(value), value]));
export const normalizeRequestStatus = value => statusByToken.get(token(value)) || null;
export const requestStatusLabel = value => (normalizeRequestStatus(value) || value || 'Unknown').replace(/_/g, ' ');
export const ACTIVE_REQUEST_STATUSES = REQUEST_STATUSES.filter(value => !['Returned', 'Rejected'].includes(value));
export function statusVariants(statuses) {
  return [...new Set(statuses.flatMap(status => [status, status.toLowerCase(), status.replace(/_/g, ' '), status.toLowerCase().replace(/_/g, ' ')]))];
}
export function isHighUrgencyRequest(request) {
  // A workflow status is not an urgency level. Use the stored urgency marker.
  const explicit = request.urgency ?? request.priority;
  if (explicit != null && String(explicit).trim()) return token(explicit) === 'high';
  const reason = String(request.request_reason || '').trim();
  // Mobile stores drop-off details and urgency together in request_reason.
  // Recognize explicit markers rather than matching arbitrary mentions of "high".
  const levels = [...reason.matchAll(/\b(?:urgency|priority)(?:\s+level)?\s*[:=\-]\s*(high|medium|low|critical)\b/gi)].map(match => match[1].toLowerCase());
  if (levels.length) return levels.every(level => level === 'high');
  if (/\b(?:not|no)\s+(?:a\s+)?high\s+urgency\b/i.test(reason)) return false;
  const markers = [...reason.matchAll(/\b(high|medium|low|critical)\s+urgency(?:\s+request)?\b/gi)].map(match => match[1].toLowerCase());
  return markers.length > 0 && markers.every(level => level === 'high');
}
export const isActiveRequest = request => ACTIVE_REQUEST_STATUSES.includes(normalizeRequestStatus(request.status));

export function requestProgress(status, allocations = []) {
  const normalized = normalizeRequestStatus(status);
  if (['Rejected', 'Returned'].includes(normalized)) return normalized;
  if (!allocations.length) return normalized || 'Unknown';
  const remaining = allocations.filter(allocation => !allocation.returned_at
    && normalizeRequestStatus(allocation.batch || allocation.status) !== 'Returned');
  if (!remaining.length) return 'Returned';
  if (remaining.some(allocation => allocation.received_at || allocation.delivered_at
    || ['Received', 'Returning'].includes(normalizeRequestStatus(allocation.batch || allocation.status)))) return 'Received';
  if (remaining.some(allocation => allocation.dispatched_at
    || normalizeRequestStatus(allocation.batch || allocation.status) === 'In_Transit')) return 'In_Transit';
  return 'Pending_Dispatch';
}

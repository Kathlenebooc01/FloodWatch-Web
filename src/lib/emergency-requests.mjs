import { ACTIVE_REQUEST_STATUSES, statusVariants, isHighUrgencyRequest } from './domain-values.mjs';

export async function fetchHighUrgencyRequests(db, signal) {
  const requests = [];
  for (let offset = 0; ; offset += 200) {
    const { data, error } = await db.from('resource_requests')
      .select('*, profiles:requested_by(full_name, municipality_or_city:municipality_id(name)), municipality_or_city:municipality_id(name)')
      .in('status', statusVariants(ACTIVE_REQUEST_STATUSES))
      .order('created_at', { ascending: false }).order('request_id', { ascending: false })
      .range(offset, offset + 199).abortSignal(signal);
    if (error) throw error;
    if (signal?.aborted) throw signal.reason;
    requests.push(...(data || []).filter(isHighUrgencyRequest));
    if (!data || data.length < 200) return requests;
  }
}

import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { syncOpenAqAir } from '@/lib/monitoring/openAqAir.mjs';

export const runtime = 'nodejs';

function authorized(request, secret) {
  const supplied = request.headers.get('authorization');
  if (!secret || !supplied?.startsWith('Bearer ')) return false;
  const expected = Buffer.from(secret);
  const received = Buffer.from(supplied.slice(7));
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function GET(request) {
  if (!process.env.CRON_SECRET) {
    console.error('OpenAQ updater unavailable: CRON_SECRET is missing');
    return Response.json({ error: 'Updater unavailable' }, { status: 503 });
  }
  if (!authorized(request, process.env.CRON_SECRET)) {
    console.warn('OpenAQ updater rejected unauthorized request');
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.OPENAQ_API_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_SERVICE_ROLE_KEY) {
    console.error('OpenAQ updater unavailable: required server credentials are missing');
    return Response.json({ error: 'Updater unavailable' }, { status: 503 });
  }
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_SERVICE_ROLE_KEY);
    const { data, error } = await db.from('municipality_or_city').select('municipality_id,name');
    if (error) throw new Error('Cannot read municipalities: ' + error.message);
    const result = await syncOpenAqAir(db, data || [], process.env.OPENAQ_API_KEY);
    if (result.error) return Response.json({ status: 'rejected', error: result.error }, { status: 503 });
    return Response.json({ status: result.status, municipality_id: result.municipality_id,
      recorded_at: result.reading.recorded_at }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('OpenAQ updater failed:', error);
    return Response.json({ error: 'Air update failed' }, { status: 503 });
  }
}

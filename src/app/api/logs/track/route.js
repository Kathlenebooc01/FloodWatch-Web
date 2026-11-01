import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getApiId } from '@/lib/logs/apiLogger';

const allowedEvents = new Set(['mapbox:Execution', 'mapbox:Map Error', 'weather:Execution']);
const recentEvents = new Map();

export async function POST(req) {
  try {
    if (Number(req.headers.get('content-length') || 0) > 2048) {
      return NextResponse.json({ success: false, error: 'Event is too large' }, { status: 413 });
    }
    const { apiType, eventType } = await req.json();
    if (!allowedEvents.has(`${apiType}:${eventType}`)) {
      return NextResponse.json({ success: false, error: 'Unsupported client event' }, { status: 400 });
    }
    const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const throttleKey = `${forwardedFor}:${apiType}:${eventType}`;
    const now = Date.now();
    if (now - (recentEvents.get(throttleKey) || 0) < 20_000) return NextResponse.json({ success: true });
    if (recentEvents.size > 5000) recentEvents.clear();
    recentEvents.set(throttleKey, now);

    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_SERVICE_ROLE_KEY);
    const apiId = await getApiId(apiType);
    const { error } = await db.from('api_activity_logs').insert({
      api_id: apiId,
      event_type: eventType,
      message: `Unverified browser telemetry: ${apiType} ${eventType}`,
      created_at: new Date(now).toISOString(),
    });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Unable to track event' }, { status: 500 });
  }
}

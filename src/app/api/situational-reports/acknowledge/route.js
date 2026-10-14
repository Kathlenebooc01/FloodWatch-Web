import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const respond = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return respond({ error: 'Authentication required' }, 401);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return respond({ error: 'Report review is not configured' }, 503);

    // Read and write with the caller's JWT, just like the provincial admin table.
    const db = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await db.auth.getUser(token);
    if (authError || !user) return respond({ error: 'Invalid session' }, 401);
    const { report_id } = await request.json();
    if (!report_id || typeof report_id !== 'string') return respond({ error: 'Report ID required' }, 400);

    const { data: admin, error: profileError } = await db.from('profiles')
      .select('role, province_id').eq('id', user.id).single();
    if (profileError || admin?.role !== 'provincial_admin' || !admin.province_id) {
      return respond({ error: 'Provincial admin access required' }, 403);
    }
    const { data: report, error: readError } = await db.from('incident_report')
      .select('report_id, parent_report_id, municipality_id, status, acknowledged_at')
      .eq('report_id', report_id).maybeSingle();
    if (readError) return respond({ error: `Unable to read report update: ${readError.message}` }, 500);
    if (!report) return respond({ error: 'Report update not found. Refresh the report list and try again.' }, 404);
    if (!report.parent_report_id || !report.municipality_id) {
      return respond({ error: 'This is not a linked municipal report update' }, 403);
    }
    const { data: municipality, error: municipalityError } = await db.from('municipality_or_city')
      .select('province_id').eq('municipality_id', report.municipality_id).maybeSingle();
    if (municipalityError) return respond({ error: `Unable to check report municipality: ${municipalityError.message}` }, 500);
    if (!municipality || municipality.province_id !== admin.province_id) {
      return respond({ error: 'Report update is outside your province' }, 403);
    }
    if (report.status?.toLowerCase() === 'verified') return respond({ report });
    if (!['pending', 'pending_ai'].includes(report.status?.toLowerCase())) {
      return respond({ error: 'This update cannot be verified from its current status' }, 409);
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await db.from('incident_report').update({
      status: 'Verified', acknowledged_at: report.acknowledged_at || now,
      acknowledged_by: user.id, reviewed_at: now, reviewed_by: user.id,
    }).eq('report_id', report_id).eq('municipality_id', report.municipality_id)
      .eq('status', report.status).select().maybeSingle();
    if (updateError) return respond({ error: `Unable to verify report update: ${updateError.message}` }, 500);
    if (!updated) return respond({ error: 'Report update changed; refresh and try again' }, 409);
    return respond({ report: updated });
  } catch {
    return respond({ error: 'Unable to verify report update' }, 500);
  }
}
